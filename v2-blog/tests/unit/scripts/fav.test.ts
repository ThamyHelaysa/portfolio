import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findSourceReferences,
  replaceFavoriteOccupant,
  slugFavoriteAsset,
} from "../../../scripts/fav/helpers.ts";
import { runSetFavorite } from "../../../scripts/fav/workflow.ts";

describe("Favorite CLI helpers", () => {
  it("creates a stable asset slug from a Favorite title", () => {
    expect(slugFavoriteAsset("Pokémon Y (3DS)")).toBe("pokemon-y-3ds");
  });

  it("replaces only occupant fields in a Favorite slot", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "fav-writer-"));
    const dataPath = path.join(directory, "personal.json");
    const initialData = {
      info: { displayName: "Thamires" },
      favorites: [
        {
          id: "game",
          kind: "game",
          category: "Playing",
          title: "Old game",
          details: "Old details",
          previewUrl: "/assets/images/previews/old.jpg",
          previewType: "image",
        },
        {
          id: "learning",
          kind: "project",
          category: "Studying",
          title: "TypeScript",
          details: "Deep dive",
          previewUrl: "/assets/images/previews/typescript.jpg",
          previewType: "image",
        },
      ],
    };

    try {
      await writeFile(dataPath, `${JSON.stringify(initialData, null, 2)}\n`);

      await replaceFavoriteOccupant(dataPath, "game", {
        title: "Pokémon Y",
        details: "Nintendo 3DS",
        previewUrl: "/assets/images/previews/pokemon-y.jpg",
        previewType: "image",
      });

      const writtenData = JSON.parse(await readFile(dataPath, "utf8"));
      expect(writtenData).toEqual({
        ...initialData,
        favorites: [
          {
            id: "game",
            kind: "game",
            category: "Playing",
            title: "Pokémon Y",
            details: "Nintendo 3DS",
            previewUrl: "/assets/images/previews/pokemon-y.jpg",
            previewType: "image",
          },
          initialData.favorites[1],
        ],
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("finds asset path references across the source tree", async () => {
    const sourceRoot = await mkdtemp(path.join(tmpdir(), "fav-references-"));

    try {
      await mkdir(path.join(sourceRoot, "pages"), { recursive: true });
      await writeFile(
        path.join(sourceRoot, "pages", "index.njk"),
        '<img src="/assets/images/previews/old-game.jpg">',
      );
      await writeFile(
        path.join(sourceRoot, "personal.json"),
        '{"previewUrl":"/assets/images/previews/current-game.jpg"}',
      );
      await writeFile(
        path.join(sourceRoot, "styles.css"),
        'background-image: url("assets/images/previews/old-game.jpg");',
      );

      await expect(
        findSourceReferences(
          sourceRoot,
          "/assets/images/previews/old-game.jpg",
        ),
      ).resolves.toEqual(["pages/index.njk", "styles.css"]);
      await expect(
        findSourceReferences(
          sourceRoot,
          "/assets/images/previews/orphan.jpg",
        ),
      ).resolves.toEqual([]);
    } finally {
      await rm(sourceRoot, { recursive: true, force: true });
    }
  });

  it("leaves the repo untouched when candidate media is rejected", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "fav-workflow-"));
    const dataDirectory = path.join(projectRoot, "src", "_data");
    const dataPath = path.join(dataDirectory, "personal.json");
    const answers = ["New game", "New details", "/tmp/new-game.png"];
    const events: string[] = [];
    let processed = false;

    try {
      await mkdir(dataDirectory, { recursive: true });
      await writeFile(
        dataPath,
        `${JSON.stringify(
          {
            favorites: [
              {
                id: "game",
                kind: "game",
                category: "Playing",
                title: "Old game",
                details: "Old details",
                previewUrl: "/assets/images/previews/old-game.jpg",
                previewType: "image",
              },
            ],
          },
          null,
          2,
        )}\n`,
      );
      const before = await readFile(dataPath, "utf8");

      const result = await runSetFavorite(
        { projectRoot, slotId: "game" },
        {
          promptText: async () => answers.shift() ?? "",
          acquireCandidate: async () => {
            events.push("acquire");
            return "/tmp/fav-candidate.png";
          },
          previewCandidate: async () => {
            events.push("preview");
          },
          approveCandidate: async () => {
            events.push("approve");
            return false;
          },
          processImage: async () => {
            processed = true;
          },
          confirmDeletion: async () => false,
          log: () => undefined,
        },
      );

      expect(result).toBe("cancelled");
      expect(events).toEqual(["acquire", "preview", "approve"]);
      expect(processed).toBe(false);
      await expect(readFile(dataPath, "utf8")).resolves.toBe(before);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("commits an approved image and updates the Favorite occupant", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "fav-workflow-"));
    const dataDirectory = path.join(projectRoot, "src", "_data");
    const previewDirectory = path.join(
      projectRoot,
      "src",
      "assets",
      "images",
      "previews",
    );
    const dataPath = path.join(dataDirectory, "personal.json");
    const oldAssetPath = path.join(previewDirectory, "old-game.jpg");
    const answers = ["New Game", "Fresh details", "/tmp/new-game.png"];
    const deletionOffers: string[] = [];

    try {
      await mkdir(dataDirectory, { recursive: true });
      await mkdir(previewDirectory, { recursive: true });
      await writeFile(oldAssetPath, "old image");
      await writeFile(
        dataPath,
        `${JSON.stringify(
          {
            favorites: [
              {
                id: "game",
                kind: "game",
                category: "Playing",
                title: "Old game",
                details: "Old details",
                previewUrl: "/assets/images/previews/old-game.jpg",
                previewType: "image",
              },
            ],
          },
          null,
          2,
        )}\n`,
      );

      const result = await runSetFavorite(
        { projectRoot, slotId: "game" },
        {
          promptText: async () => answers.shift() ?? "",
          acquireCandidate: async (_source, temporaryDirectory) => {
            const candidatePath = path.join(temporaryDirectory, "candidate.png");
            await writeFile(candidatePath, "source image");
            return candidatePath;
          },
          previewCandidate: async () => undefined,
          approveCandidate: async () => true,
          processImage: async (_candidatePath, outputPath) => {
            await writeFile(outputPath, "compressed image");
          },
          confirmDeletion: async (assetUrl) => {
            deletionOffers.push(assetUrl);
            return false;
          },
          log: () => undefined,
        },
      );

      expect(result).toBe("updated");
      const writtenData = JSON.parse(await readFile(dataPath, "utf8"));
      expect(writtenData.favorites[0]).toEqual({
        id: "game",
        kind: "game",
        category: "Playing",
        title: "New Game",
        details: "Fresh details",
        previewUrl: "/assets/images/previews/new-game.jpg",
        previewType: "image",
      });
      await expect(
        readFile(path.join(previewDirectory, "new-game.jpg"), "utf8"),
      ).resolves.toBe("compressed image");
      await expect(readFile(oldAssetPath, "utf8")).resolves.toBe("old image");
      expect(deletionOffers).toEqual([
        "/assets/images/previews/old-game.jpg",
      ]);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("never offers deletion for an asset still referenced in source", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "fav-workflow-"));
    const sourceRoot = path.join(projectRoot, "src");
    const dataDirectory = path.join(sourceRoot, "_data");
    const previewDirectory = path.join(
      sourceRoot,
      "assets",
      "images",
      "previews",
    );
    const oldAssetUrl = "/assets/images/previews/shared.jpg";
    let deletionOffered = false;

    try {
      await mkdir(dataDirectory, { recursive: true });
      await mkdir(previewDirectory, { recursive: true });
      await mkdir(path.join(sourceRoot, "pages"), { recursive: true });
      await writeFile(path.join(previewDirectory, "shared.jpg"), "old image");
      await writeFile(
        path.join(sourceRoot, "pages", "archive.njk"),
        `<img src="${oldAssetUrl}">`,
      );
      await writeFile(
        path.join(dataDirectory, "personal.json"),
        `${JSON.stringify(
          {
            favorites: [
              {
                id: "game",
                kind: "game",
                category: "Playing",
                title: "Old game",
                details: "Old details",
                previewUrl: oldAssetUrl,
                previewType: "image",
              },
            ],
          },
          null,
          2,
        )}\n`,
      );
      const answers = ["Next game", "Next details", "/tmp/next.png"];

      await runSetFavorite(
        { projectRoot, slotId: "game" },
        {
          promptText: async () => answers.shift() ?? "",
          acquireCandidate: async (_source, temporaryDirectory) => {
            const candidatePath = path.join(temporaryDirectory, "candidate.png");
            await writeFile(candidatePath, "source image");
            return candidatePath;
          },
          previewCandidate: async () => undefined,
          approveCandidate: async () => true,
          processImage: async (_candidatePath, outputPath) => {
            await writeFile(outputPath, "compressed image");
          },
          confirmDeletion: async () => {
            deletionOffered = true;
            return true;
          },
          log: () => undefined,
        },
      );

      expect(deletionOffered).toBe(false);
      await expect(
        readFile(path.join(previewDirectory, "shared.jpg"), "utf8"),
      ).resolves.toBe("old image");
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

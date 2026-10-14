import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  findSourceReferences,
  readFavoriteSlot,
  replaceFavoriteOccupant,
} from "../../../scripts/fav/helpers.ts";
import { runSetFavorite } from "../../../scripts/fav/workflow.ts";
import { headingSlug } from "../../../src/_config/headingSlug.js";

/** Keeps real I/O while allowing deterministic interrupts at async boundaries. */
vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof fs>();
  const mocked = {
    ...original,
    copyFile: vi.fn(original.copyFile),
    readFile: vi.fn(original.readFile),
    rm: vi.fn(original.rm),
  };
  return { ...mocked, default: mocked };
});

describe("Favorite CLI helpers", () => {
  it.each([
    ["Pokémon Y (3DS)", "pokemon-y-3ds"],
    ["Don't Starve", "dont-starve"],
    ["Don’t Starve", "dont-starve"],
    ["Cafe\u0301 & Tea", "cafe-and-tea"],
    ["① Fullwidth Ａ", "fullwidth"],
    ["東京", ""],
  ])("creates the canonical slug for %s", (title, slug) => {
    expect(headingSlug(title)).toBe(slug);
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

      const slot = await readFavoriteSlot(dataPath, "game");
      await replaceFavoriteOccupant(dataPath, slot, {
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

  it("leaves the slot snapshot reusable after a rejected write", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "fav-writer-"));
    const dataPath = path.join(directory, "personal.json");
    const occupant = {
      id: "game",
      kind: "game",
      category: "Playing",
      title: "Old game",
      details: "Old details",
      previewUrl: "/assets/images/previews/old.jpg",
      previewType: "image",
    };
    const initialContents = `${JSON.stringify({ favorites: [occupant] }, null, 2)}\n`;
    const replacement = {
      title: "Pokémon Y",
      details: "Nintendo 3DS",
      previewUrl: "/assets/images/previews/pokemon-y.jpg",
      previewType: "image",
    } as const;

    try {
      await writeFile(dataPath, initialContents);
      const slot = await readFavoriteSlot(dataPath, "game");

      await writeFile(dataPath, `${initialContents}\n`);
      await expect(
        replaceFavoriteOccupant(dataPath, slot, replacement),
      ).rejects.toThrow("Favorite data changed during selection; run fav again.");

      expect(slot.favorite).toEqual(occupant);

      await writeFile(dataPath, initialContents);
      await expect(
        replaceFavoriteOccupant(dataPath, slot, replacement),
      ).resolves.toEqual(occupant);
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

  it.each([
    ["album", 'Favorite slot "album" is not supported yet; see #149.'],
    ["missing", "Unknown Favorite slot: missing"],
  ])("refuses %s before any interactive work", async (slotId, message) => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "fav-workflow-"));
    const dataDirectory = path.join(projectRoot, "src", "_data");
    const dataPath = path.join(dataDirectory, "personal.json");
    const events: string[] = [];

    try {
      await mkdir(dataDirectory, { recursive: true });
      await writeFile(
        dataPath,
        `${JSON.stringify(
          {
            favorites: [
              {
                id: "album",
                kind: "album",
                category: "On Repeat",
                title: "Cochise",
                details: "Audioslave",
                previewUrl: "/assets/audio/previews/cochise.mp3",
                previewType: "audio",
                coverUrl: "/assets/images/previews/cochise.jpg",
              },
            ],
          },
          null,
          2,
        )}\n`,
      );
      const before = await readFile(dataPath, "utf8");

      await expect(
        runSetFavorite(
          { projectRoot, slotId },
          {
            promptText: async () => {
              events.push("prompt");
              return "";
            },
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
              events.push("process");
            },
            confirmDeletion: async () => {
              events.push("delete");
              return false;
            },
            log: () => undefined,
          },
        ),
      ).rejects.toThrow(message);

      expect(events).toEqual([]);
      await expect(readFile(dataPath, "utf8")).resolves.toBe(before);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it.each([false, true])("keeps the committed Favorite consistent (SIGINT after commit: %s)", async (interrupt) => {
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
    const answers = ["Don’t Starve & Play", "Fresh details", "/tmp/new-game.png"];
    const deletionOffers: string[] = [];
    const logged: string[] = [];
    const { rm } = await vi.importActual<typeof fs>("node:fs/promises");

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

      const initialContents = await readFile(dataPath, "utf8");
      const parse = vi.spyOn(JSON, "parse");
      const update = runSetFavorite(
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
            if (interrupt) {
              /** Interrupts after the atomic commit but before its promise resolves. */
              vi.mocked(fs.rm).mockImplementationOnce(async (...args) => {
                await rm(...args);
                process.emit("SIGINT");
              });
            }
          },
          confirmDeletion: async (assetUrl) => {
            deletionOffers.push(assetUrl);
            return false;
          },
          log: (message) => logged.push(message),
        },
      );

      await expect(update).resolves.toBe("updated");
      expect(logged.at(-1)).toBe(
        interrupt
          ? 'Updated Favorite slot "game"; interrupted before unused-asset cleanup.'
          : 'Updated Favorite slot "game".',
      );
      expect(
        parse.mock.calls.filter(([contents]) => contents === initialContents),
      ).toHaveLength(1);
      const writtenData = JSON.parse(await readFile(dataPath, "utf8"));
      expect(writtenData.favorites[0]).toEqual({
        id: "game",
        kind: "game",
        category: "Playing",
        title: "Don’t Starve & Play",
        details: "Fresh details",
        previewUrl: "/assets/images/previews/dont-starve-and-play.jpg",
        previewType: "image",
      });
      await expect(
        readFile(path.join(previewDirectory, "dont-starve-and-play.jpg"), "utf8"),
      ).resolves.toBe("compressed image");
      await expect(readFile(oldAssetPath, "utf8")).resolves.toBe("old image");
      expect(deletionOffers).toEqual(interrupt ? [] : [
        "/assets/images/previews/old-game.jpg",
      ]);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("preserves edits made during selection and removes the uncommitted image", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "fav-workflow-"));
    const dataDirectory = path.join(projectRoot, "src", "_data");
    const dataPath = path.join(dataDirectory, "personal.json");
    const initialData = {
      info: { displayName: "Thamires" },
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
    };
    const editedContents = JSON.stringify({
      ...initialData,
      info: { displayName: "Edited while selecting" },
    });
    const answers = ["New game", "Fresh details", "/tmp/new-game.png"];

    try {
      await mkdir(dataDirectory, { recursive: true });
      await writeFile(dataPath, JSON.stringify(initialData));

      await expect(
        runSetFavorite(
          { projectRoot, slotId: "game" },
          {
            promptText: async () => answers.shift() ?? "",
            acquireCandidate: async (_source, directory) =>
              path.join(directory, "candidate.png"),
            previewCandidate: async () => undefined,
            approveCandidate: async () => true,
            processImage: async (_candidatePath, outputPath) => {
              await writeFile(dataPath, editedContents);
              await writeFile(outputPath, "compressed image");
            },
            confirmDeletion: async () => false,
            log: () => undefined,
          },
        ),
      ).rejects.toThrow("Favorite data changed during selection; run fav again.");

      await expect(readFile(dataPath, "utf8")).resolves.toBe(editedContents);
      await expect(
        readFile(
          path.join(projectRoot, "src", "assets", "images", "previews", "new-game.jpg"),
        ),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it.each(["processing", "asset copy", "data validation"])(
    "rolls back SIGINT during %s without leaving a new repo file",
    async (phase) => {
      const projectRoot = await mkdtemp(path.join(tmpdir(), "fav-interrupt-"));
      const dataDirectory = path.join(projectRoot, "src", "_data");
      const dataPath = path.join(dataDirectory, "personal.json");
      const previewDirectory = path.join(
        projectRoot, "src", "assets", "images", "previews",
      );
      const initialContents = JSON.stringify({
        favorites: [{
          id: "game",
          kind: "game",
          category: "Playing",
          title: "Old game",
          details: "Old details",
          previewUrl: "/assets/images/previews/old.jpg",
          previewType: "image",
        }],
      });
      const answers = ["New game", "New details", "/tmp/candidate.png"];
      const listenersBefore = process.listeners("SIGINT");
      const { copyFile, readFile } = await vi.importActual<typeof fs>(
        "node:fs/promises",
      );

      try {
        await mkdir(dataDirectory, { recursive: true });
        await mkdir(previewDirectory, { recursive: true });
        await writeFile(dataPath, initialContents);
        if (phase === "asset copy") {
          /** Places SIGINT exactly between the asset copy and data write. */
          vi.mocked(fs.copyFile).mockImplementationOnce(async (...args) => {
            await copyFile(...args);
            process.emit("SIGINT");
          });
        }

        await expect(runSetFavorite({ projectRoot, slotId: "game" }, {
          promptText: async () => answers.shift() ?? "",
          acquireCandidate: async (_source, directory) =>
            path.join(directory, "candidate.png"),
          previewCandidate: async () => undefined,
          approveCandidate: async () => true,
          processImage: async (_source, output) => {
            await writeFile(output, "compressed image");
            if (phase === "processing") process.emit("SIGINT");
            if (phase === "data validation") {
              /** Interrupts at the final async step before the data commit. */
              vi.mocked(fs.readFile).mockImplementationOnce(async (...args) => {
                const contents = await readFile(...args);
                process.emit("SIGINT");
                return contents;
              });
            }
          },
          confirmDeletion: async () => false,
          log: () => undefined,
        })).rejects.toThrow(/aborted/i);

        await expect(readFile(dataPath, "utf8")).resolves.toBe(initialContents);
        await expect(fs.readdir(previewDirectory)).resolves.toEqual([]);
        await expect(fs.readdir(dataDirectory)).resolves.toEqual(["personal.json"]);
        expect(process.listeners("SIGINT")).toEqual(listenersBefore);
      } finally {
        vi.restoreAllMocks();
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  );

  it("restores default termination when SIGINT arrives twice", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "fav-interrupt-"));
    const dataDirectory = path.join(projectRoot, "src", "_data");
    const dataPath = path.join(dataDirectory, "personal.json");
    const answers = ["New game", "New details", "/tmp/candidate.png"];
    const listenersBefore = process.listeners("SIGINT");
    const kill = vi.spyOn(process, "kill").mockImplementation(() => true);

    try {
      await mkdir(dataDirectory, { recursive: true });
      await writeFile(
        dataPath,
        JSON.stringify({
          favorites: [{
            id: "game",
            kind: "game",
            category: "Playing",
            title: "Old game",
            details: "Old details",
            previewUrl: "/assets/images/previews/old.jpg",
            previewType: "image",
          }],
        }),
      );

      await expect(runSetFavorite({ projectRoot, slotId: "game" }, {
        promptText: async () => answers.shift() ?? "",
        acquireCandidate: async (_source, directory) =>
          path.join(directory, "candidate.png"),
        previewCandidate: async () => undefined,
        approveCandidate: async () => true,
        processImage: async (_source, output) => {
          await writeFile(output, "compressed image");
          // The first Ctrl-C defers; the second must hand control back to Node.
          process.emit("SIGINT");
          expect(kill).not.toHaveBeenCalled();
          process.emit("SIGINT");
        },
        confirmDeletion: async () => false,
        log: () => undefined,
      })).rejects.toThrow(/aborted/i);

      expect(kill).toHaveBeenCalledWith(process.pid, "SIGINT");
      expect(process.listeners("SIGINT")).toEqual(listenersBefore);
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

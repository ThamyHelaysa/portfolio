import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type FavoriteRecord,
  findSourceReferences,
  replaceFavoriteOccupant,
  slugFavoriteAsset,
} from "./helpers.ts";

export interface SetFavoriteOptions {
  projectRoot: string;
  slotId: string;
}

export interface FavoriteWorkflowPorts {
  promptText(
    field: "title" | "details" | "source",
    message: string,
  ): Promise<string>;
  acquireCandidate(source: string, temporaryDirectory: string): Promise<string>;
  previewCandidate(candidatePath: string): Promise<void>;
  approveCandidate(candidatePath: string): Promise<boolean>;
  processImage(candidatePath: string, outputPath: string): Promise<void>;
  confirmDeletion(assetUrl: string): Promise<boolean>;
  log(message: string): void;
}

export type SetFavoriteResult = "cancelled" | "updated";

/**
 * Reads and validates one fixed Favorite slot before media work starts.
 */
async function readFavoriteSlot(
  dataPath: string,
  slotId: string,
): Promise<FavoriteRecord> {
  const data = JSON.parse(await readFile(dataPath, "utf8")) as {
    favorites?: FavoriteRecord[];
  };
  const favorite = data.favorites?.find(({ id }) => id === slotId);
  if (!favorite) {
    throw new Error(`Unknown Favorite slot: ${slotId}`);
  }
  return favorite;
}

/**
 * Chooses a non-conflicting committed image path for a Favorite title.
 */
async function findAvailableAssetPath(
  previewDirectory: string,
  slug: string,
): Promise<string> {
  for (let suffix = 1; ; suffix += 1) {
    const filename = suffix === 1 ? `${slug}.jpg` : `${slug}-${suffix}.jpg`;
    const candidatePath = path.join(previewDirectory, filename);
    try {
      await access(candidatePath);
    } catch {
      return candidatePath;
    }
  }
}

/**
 * Resolves a public asset URL only when it belongs to the source asset tree.
 */
function resolveSourceAssetPath(
  sourceRoot: string,
  assetUrl: string,
): string | null {
  if (!assetUrl.startsWith("/assets/")) {
    return null;
  }

  const assetsRoot = path.resolve(sourceRoot, "assets");
  const assetPath = path.resolve(sourceRoot, `.${assetUrl}`);
  if (!assetPath.startsWith(`${assetsRoot}${path.sep}`)) {
    return null;
  }
  return assetPath;
}

/**
 * Reports whether a source asset URL resolves to an existing regular file.
 */
async function existingAssetPath(
  sourceRoot: string,
  assetUrl: string,
): Promise<string | null> {
  const assetPath = resolveSourceAssetPath(sourceRoot, assetUrl);
  if (!assetPath) {
    return null;
  }

  try {
    return (await stat(assetPath)).isFile() ? assetPath : null;
  } catch {
    return null;
  }
}

/**
 * Runs one interactive Favorite replacement while keeping unapproved media outside the repo.
 */
export async function runSetFavorite(
  options: SetFavoriteOptions,
  ports: FavoriteWorkflowPorts,
): Promise<SetFavoriteResult> {
  const sourceRoot = path.join(options.projectRoot, "src");
  const dataPath = path.join(sourceRoot, "_data", "personal.json");
  await readFavoriteSlot(dataPath, options.slotId);

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "fav-"));

  try {
    const title = await ports.promptText("title", "Title");
    const details = await ports.promptText("details", "Details");
    const source = await ports.promptText("source", "Image URL or local path");
    const candidatePath = await ports.acquireCandidate(
      source,
      temporaryDirectory,
    );

    await ports.previewCandidate(candidatePath);
    if (!(await ports.approveCandidate(candidatePath))) {
      ports.log("Candidate rejected. No repo files changed.");
      return "cancelled";
    }

    const previewDirectory = path.join(
      sourceRoot,
      "assets",
      "images",
      "previews",
    );
    const slug = slugFavoriteAsset(title) || options.slotId;
    const committedAssetPath = await findAvailableAssetPath(
      previewDirectory,
      slug,
    );
    const processedAssetPath = path.join(temporaryDirectory, "approved.jpg");
    await ports.processImage(candidatePath, processedAssetPath);
    await mkdir(previewDirectory, { recursive: true });
    await copyFile(processedAssetPath, committedAssetPath);

    let previousOccupant: FavoriteRecord;
    try {
      previousOccupant = await replaceFavoriteOccupant(
        dataPath,
        options.slotId,
        {
          title,
          details,
          previewUrl: `/assets/images/previews/${path.basename(committedAssetPath)}`,
          previewType: "image",
        },
      );
    } catch (error) {
      await rm(committedAssetPath, { force: true });
      throw error;
    }

    const previousAssetUrls = [
      previousOccupant.previewUrl,
      previousOccupant.coverUrl,
    ].filter(
      (assetUrl, index, urls): assetUrl is string =>
        Boolean(assetUrl) && urls.indexOf(assetUrl) === index,
    );

    for (const assetUrl of previousAssetUrls) {
      const references = await findSourceReferences(sourceRoot, assetUrl);
      if (references.length > 0) {
        ports.log(
          `Kept ${assetUrl}; still referenced by ${references.join(", ")}.`,
        );
        continue;
      }

      const assetPath = await existingAssetPath(sourceRoot, assetUrl);
      if (assetPath && (await ports.confirmDeletion(assetUrl))) {
        await rm(assetPath);
        ports.log(`Deleted unused asset ${assetUrl}.`);
      }
    }

    ports.log(`Updated Favorite slot "${options.slotId}".`);
    return "updated";
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

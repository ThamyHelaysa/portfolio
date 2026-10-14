import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { headingSlug } from "../../src/_config/headingSlug.js";
import {
  type FavoriteRecord,
  findSourceReferences,
  readFavoriteSlot,
  replaceFavoriteOccupant,
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
  const slot = await readFavoriteSlot(dataPath, options.slotId);

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
    const slug = headingSlug(title) || options.slotId;
    const committedAssetPath = await findAvailableAssetPath(
      previewDirectory,
      slug,
    );
    const processedAssetPath = path.join(temporaryDirectory, "approved.jpg");
    const controller = new AbortController();
    /** Defers SIGINT termination until the pending write can roll back safely. */
    function interruptCommit(): void {
      if (controller.signal.aborted) {
        // A second Ctrl-C means the author wants out now, so restore the
        // default termination this listener suppressed.
        process.off("SIGINT", interruptCommit);
        process.kill(process.pid, "SIGINT");
        return;
      }
      controller.abort();
    }
    process.on("SIGINT", interruptCommit);
    let previousOccupant: FavoriteRecord;
    try {
      await ports.processImage(candidatePath, processedAssetPath);
      controller.signal.throwIfAborted();
      await mkdir(previewDirectory, { recursive: true });
      controller.signal.throwIfAborted();
      try {
        await copyFile(processedAssetPath, committedAssetPath);
        controller.signal.throwIfAborted();
        previousOccupant = await replaceFavoriteOccupant(
          dataPath,
          slot,
          {
            title,
            details,
            previewUrl: `/assets/images/previews/${path.basename(committedAssetPath)}`,
            previewType: "image",
          },
          controller.signal,
        );
      } catch (error) {
        await rm(committedAssetPath, { force: true });
        throw error;
      }
    } finally {
      process.off("SIGINT", interruptCommit);
    }

    // Past the atomic rename the Favorite is committed, so a late interrupt
    // cancels the optional cleanup rather than failing the whole run.
    if (controller.signal.aborted) {
      ports.log(
        `Updated Favorite slot "${options.slotId}"; interrupted before unused-asset cleanup.`,
      );
      return "updated";
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

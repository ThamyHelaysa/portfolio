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
import type {
  AcquireCandidateOptions,
  CandidateMediaType,
} from "./acquisition.ts";
import {
  type FavoriteOccupant,
  type FavoriteRecord,
  findSourceReferences,
  readFavoriteSlot,
  replaceFavoriteOccupant,
} from "./helpers.ts";
import {
  searchItunesTracks,
  searchOpenLibraryBooks,
  type SourceCandidate,
} from "./sources.ts";

export interface SetFavoriteOptions {
  projectRoot: string;
  slotId: string;
}

export type PromptField = "details" | "query" | "source" | "title";

export interface SourceChoice {
  id: string;
  label: string;
}

export interface FavoriteWorkflowPorts {
  promptText(field: PromptField, message: string): Promise<string>;
  chooseSource(choices: SourceChoice[]): Promise<string>;
  pickCandidate(candidates: SourceCandidate[]): Promise<SourceCandidate | null>;
  acquireCandidate(
    source: string,
    temporaryDirectory: string,
    options?: AcquireCandidateOptions,
  ): Promise<string>;
  previewCandidate(candidatePath: string): Promise<void>;
  approveCandidate(
    candidatePath: string,
    mediaType: CandidateMediaType,
  ): Promise<boolean>;
  processImage(candidatePath: string, outputPath: string): Promise<void>;
  processAudio(candidatePath: string, outputPath: string): Promise<void>;
  confirmDeletion(assetUrl: string): Promise<boolean>;
  log(message: string): void;
}

export type SetFavoriteResult = "cancelled" | "updated";

/** Which media a slot needs, derived from the preview type it already holds. */
type MediaRole = "cover" | "preview";

interface RoleSpec {
  role: MediaRole;
  mediaType: CandidateMediaType;
}

const ROLE_SPECS: Record<string, RoleSpec[]> = {
  audio: [
    { role: "preview", mediaType: "audio" },
    { role: "cover", mediaType: "image" },
  ],
  image: [{ role: "preview", mediaType: "image" }],
};

/**
 * Keyless search adapters, by the Favorite kind each one can fill.
 *
 * A kind absent here is manual-only. Manual stays offered for every kind, so
 * an adapter that returns nothing useful is never a dead end.
 */
const KIND_SOURCES: Record<
  string,
  { id: string; label: string; search(query: string): Promise<SourceCandidate[]> }
> = {
  album: {
    id: "itunes",
    label: "iTunes search (artwork + 30s excerpt)",
    search: searchItunesTracks,
  },
  book: {
    id: "openlibrary",
    label: "OpenLibrary search (title or ISBN)",
    search: searchOpenLibraryBooks,
  },
};

interface PlannedAsset {
  role: MediaRole;
  mediaType: CandidateMediaType;
  /** Where the processed file waits before it enters the repo. */
  processedPath: string;
  /** Final location inside the source tree. */
  committedPath: string;
  /** Public URL the data file will carry. */
  publicUrl: string;
}

/**
 * Chooses a non-conflicting committed path for one asset.
 */
async function findAvailableAssetPath(
  directory: string,
  basename: string,
  extension: string,
): Promise<string> {
  for (let suffix = 1; ; suffix += 1) {
    const stem = suffix === 1 ? basename : `${basename}-${suffix}`;
    const candidatePath = path.join(directory, `${stem}${extension}`);
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
 * Picks the destination directory, filename and public URL for one asset.
 */
function planAsset(
  sourceRoot: string,
  temporaryDirectory: string,
  spec: RoleSpec,
  slug: string,
): {
  directory: string;
  basename: string;
  extension: string;
  publicPrefix: string;
  processedPath: string;
} {
  if (spec.mediaType === "audio") {
    return {
      directory: path.join(sourceRoot, "assets", "audio", "previews"),
      // Mirrors the existing committed excerpts, which all end in .preview.mp3.
      basename: `${slug}.preview`,
      extension: ".mp3",
      publicPrefix: "/assets/audio/previews",
      processedPath: path.join(temporaryDirectory, `${spec.role}.mp3`),
    };
  }
  return {
    directory: path.join(sourceRoot, "assets", "images", "previews"),
    basename: spec.role === "cover" ? `${slug}-cover` : slug,
    extension: ".jpg",
    publicPrefix: "/assets/images/previews",
    processedPath: path.join(temporaryDirectory, `${spec.role}.jpg`),
  };
}

/**
 * Asks the author which source to acquire from, skipping the question when
 * manual is the only option.
 */
async function resolveSource(
  kind: string,
  ports: FavoriteWorkflowPorts,
): Promise<"manual" | { search(query: string): Promise<SourceCandidate[]> }> {
  const adapter = KIND_SOURCES[kind];
  if (!adapter) {
    return "manual";
  }

  const chosen = await ports.chooseSource([
    { id: adapter.id, label: adapter.label },
    { id: "manual", label: "Manual URL or local file" },
  ]);
  return chosen === adapter.id ? adapter : "manual";
}

/**
 * Searches a source and returns the picked candidate, or null to fall back.
 */
async function pickFromSource(
  adapter: { search(query: string): Promise<SourceCandidate[]> },
  ports: FavoriteWorkflowPorts,
): Promise<SourceCandidate | null> {
  const query = await ports.promptText("query", "Search");
  const candidates = await adapter.search(query);
  if (candidates.length === 0) {
    ports.log("No results. Falling back to a manual source.");
    return null;
  }
  return ports.pickCandidate(candidates);
}

/**
 * Names the media a source prompt is asking for.
 */
function sourceLabel(spec: RoleSpec): string {
  if (spec.role === "cover") {
    return "Cover";
  }
  return spec.mediaType === "audio" ? "Audio" : "Image";
}

/**
 * Compresses each approved candidate and reserves its committed path.
 *
 * Runs inside the commit window: the destination directory and the processed
 * file are the first side effects that could outlive an interrupt.
 */
async function processApproved(
  approved: { spec: RoleSpec; candidatePath: string }[],
  layoutOptions: {
    sourceRoot: string;
    temporaryDirectory: string;
    slug: string;
  },
  ports: FavoriteWorkflowPorts,
  signal: AbortSignal,
): Promise<PlannedAsset[]> {
  const planned: PlannedAsset[] = [];
  for (const { spec, candidatePath } of approved) {
    const layout = planAsset(
      layoutOptions.sourceRoot,
      layoutOptions.temporaryDirectory,
      spec,
      layoutOptions.slug,
    );
    if (spec.mediaType === "audio") {
      await ports.processAudio(candidatePath, layout.processedPath);
    } else {
      await ports.processImage(candidatePath, layout.processedPath);
    }
    signal.throwIfAborted();

    await mkdir(layout.directory, { recursive: true });
    signal.throwIfAborted();
    const committedPath = await findAvailableAssetPath(
      layout.directory,
      layout.basename,
      layout.extension,
    );
    planned.push({
      role: spec.role,
      mediaType: spec.mediaType,
      processedPath: layout.processedPath,
      committedPath,
      publicUrl: `${layout.publicPrefix}/${path.basename(committedPath)}`,
    });
    signal.throwIfAborted();
  }
  return planned;
}

/**
 * Maps the committed assets onto the occupant fields the data file carries.
 */
function buildOccupant(
  slotId: string,
  title: string,
  details: string,
  planned: PlannedAsset[],
): FavoriteOccupant {
  const preview = planned.find((asset) => asset.role === "preview");
  if (!preview) {
    throw new Error(`Favorite slot "${slotId}" produced no preview asset.`);
  }
  const cover = planned.find((asset) => asset.role === "cover");
  return {
    title,
    details,
    previewUrl: preview.publicUrl,
    previewType: preview.mediaType,
    ...(cover ? { coverUrl: cover.publicUrl } : {}),
  };
}

/**
 * Runs one interactive Favorite replacement while keeping unapproved media
 * outside the repo.
 */
export async function runSetFavorite(
  options: SetFavoriteOptions,
  ports: FavoriteWorkflowPorts,
): Promise<SetFavoriteResult> {
  const sourceRoot = path.join(options.projectRoot, "src");
  const dataPath = path.join(sourceRoot, "_data", "personal.json");
  const slot = await readFavoriteSlot(dataPath, options.slotId);
  const specs = ROLE_SPECS[slot.favorite.previewType];

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "fav-"));

  try {
    const adapter = await resolveSource(slot.favorite.kind, ports);
    const picked =
      adapter === "manual" ? null : await pickFromSource(adapter, ports);

    const title =
      picked?.title || (await ports.promptText("title", "Title"));
    const details =
      picked?.details || (await ports.promptText("details", "Details"));

    const slug = headingSlug(title) || options.slotId;

    // Every prompt happens before the commit window opens, so Ctrl-C keeps
    // its usual meaning while the author is still answering questions.
    const approved: { spec: RoleSpec; candidatePath: string }[] = [];
    for (const spec of specs) {
      const suggestedUrl =
        spec.mediaType === "audio" ? picked?.audioUrl : picked?.imageUrl;
      const source =
        suggestedUrl ??
        (await ports.promptText("source", `${sourceLabel(spec)} URL or local path`));

      const candidatePath = await ports.acquireCandidate(
        source,
        temporaryDirectory,
        { mediaType: spec.mediaType, name: spec.role },
      );
      await ports.previewCandidate(candidatePath);
      if (!(await ports.approveCandidate(candidatePath, spec.mediaType))) {
        ports.log("Candidate rejected. No repo files changed.");
        return "cancelled";
      }
      approved.push({ spec, candidatePath });
    }

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
    let planned: PlannedAsset[] = [];
    try {
      const copied: string[] = [];
      try {
        planned = await processApproved(
          approved,
          { sourceRoot, temporaryDirectory, slug },
          ports,
          controller.signal,
        );
        for (const asset of planned) {
          await copyFile(asset.processedPath, asset.committedPath);
          copied.push(asset.committedPath);
          controller.signal.throwIfAborted();
        }
        previousOccupant = await replaceFavoriteOccupant(
          dataPath,
          slot,
          buildOccupant(options.slotId, title, details, planned),
          controller.signal,
        );
      } catch (error) {
        await Promise.all(
          copied.map((assetPath) => rm(assetPath, { force: true })),
        );
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

    const committedUrls = new Set(planned.map((asset) => asset.publicUrl));
    const previousAssetUrls = [
      previousOccupant.previewUrl,
      previousOccupant.coverUrl,
    ].filter(
      (assetUrl, index, urls): assetUrl is string =>
        !!assetUrl &&
        urls.indexOf(assetUrl) === index &&
        // A slot can reuse a URL it already had; that asset is not an orphan.
        !committedUrls.has(assetUrl),
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

import { copyFile, open, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const MAX_CANDIDATE_BYTES = 25 * 1024 * 1024;

export type CandidateMediaType = "audio" | "image";

export interface AcquireCandidateOptions {
  /** Which media the source is expected to yield. Defaults to an image. */
  mediaType?: CandidateMediaType;
  /** Basename for the temp file, so one run can hold several candidates. */
  name?: string;
}

/**
 * Extensions a candidate may keep, and the fallback when the source has none.
 *
 * The fallback matters beyond tidiness: macOS picks the preview application
 * from the suffix, so an unknown one would hand the candidate to the wrong
 * viewer and the author would approve media they never saw.
 */
const MEDIA_SUFFIXES: Record<
  CandidateMediaType,
  { fallback: string; supported: Set<string> }
> = {
  audio: {
    fallback: ".m4a",
    supported: new Set([".aac", ".flac", ".m4a", ".mp3", ".ogg", ".wav"]),
  },
  image: {
    fallback: ".jpg",
    supported: new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]),
  },
};

const MEDIA_NOUNS: Record<CandidateMediaType, string> = {
  audio: "Audio",
  image: "Image",
};

/**
 * Returns a safe candidate suffix inferred from a source pathname.
 */
function candidateExtension(
  pathname: string,
  mediaType: CandidateMediaType,
): string {
  const { fallback, supported } = MEDIA_SUFFIXES[mediaType];
  const extension = path.extname(pathname).toLowerCase();
  return supported.has(extension) ? extension : fallback;
}

/**
 * Expands a user-home prefix and resolves a local source path.
 */
function resolveLocalSource(source: string): string {
  if (source === "~") {
    return homedir();
  }
  if (source.startsWith(`~${path.sep}`)) {
    return path.join(homedir(), source.slice(2));
  }
  return path.resolve(process.cwd(), source);
}

/**
 * Downloads or copies a manually supplied candidate into the OS temp area.
 */
export async function acquireCandidate(
  source: string,
  temporaryDirectory: string,
  options: AcquireCandidateOptions = {},
): Promise<string> {
  const mediaType = options.mediaType ?? "image";
  const name = options.name ?? "candidate";
  const noun = MEDIA_NOUNS[mediaType];

  if (/^https?:\/\//i.test(source)) {
    const url = new URL(source);
    const candidatePath = path.join(
      temporaryDirectory,
      `${name}${candidateExtension(url.pathname, mediaType)}`,
    );
    const controller = new AbortController();
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(
          `${noun} download failed: ${response.status} ${response.statusText}`,
        );
      }

      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > MAX_CANDIDATE_BYTES) {
        throw new Error(`${noun} exceeds 25 MB download limit.`);
      }
      if (!response.body) {
        throw new Error(`${noun} download has no body.`);
      }

      let downloadedBytes = 0;
      const reader = response.body.getReader();
      const file = await open(candidatePath, "w");
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          downloadedBytes += value.byteLength;
          if (downloadedBytes > MAX_CANDIDATE_BYTES) {
            throw new Error(`${noun} exceeds 25 MB download limit.`);
          }
          await file.writeFile(value);
        }
      } finally {
        try {
          await file.close();
        } finally {
          await reader.cancel();
        }
      }
      return candidatePath;
    } catch (error) {
      controller.abort();
      await rm(candidatePath, { force: true });
      throw error;
    }
  }

  const localPath = resolveLocalSource(source);
  let localStats;
  try {
    localStats = await stat(localPath);
  } catch {
    throw new Error(`Local ${noun.toLowerCase()} not found: ${localPath}`);
  }
  if (!localStats.isFile()) {
    throw new Error(`Local ${noun.toLowerCase()} is not a file: ${localPath}`);
  }
  if (localStats.size > MAX_CANDIDATE_BYTES) {
    throw new Error(`Local ${noun.toLowerCase()} exceeds 25 MB size limit.`);
  }

  const candidatePath = path.join(
    temporaryDirectory,
    `${name}${candidateExtension(localPath, mediaType)}`,
  );
  await copyFile(localPath, candidatePath);
  return candidatePath;
}


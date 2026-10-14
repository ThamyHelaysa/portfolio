import { copyFile, open, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);

/**
 * Returns a safe candidate suffix inferred from a source pathname.
 */
function candidateExtension(pathname: string): string {
  const extension = path.extname(pathname).toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.has(extension) ? extension : ".jpg";
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
): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
    const url = new URL(source);
    const candidatePath = path.join(
      temporaryDirectory,
      `candidate${candidateExtension(url.pathname)}`,
    );
    const controller = new AbortController();
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(
          `Image download failed: ${response.status} ${response.statusText}`,
        );
      }

      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > MAX_IMAGE_BYTES) {
        throw new Error("Image exceeds 25 MB download limit.");
      }
      if (!response.body) {
        throw new Error("Image download has no body.");
      }

      let downloadedBytes = 0;
      const reader = response.body.getReader();
      const file = await open(candidatePath, "w");
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          downloadedBytes += value.byteLength;
          if (downloadedBytes > MAX_IMAGE_BYTES) {
            throw new Error("Image exceeds 25 MB download limit.");
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
    throw new Error(`Local image not found: ${localPath}`);
  }
  if (!localStats.isFile()) {
    throw new Error(`Local image is not a file: ${localPath}`);
  }
  if (localStats.size > MAX_IMAGE_BYTES) {
    throw new Error("Local image exceeds 25 MB size limit.");
  }

  const candidatePath = path.join(
    temporaryDirectory,
    `candidate${candidateExtension(localPath)}`,
  );
  await copyFile(localPath, candidatePath);
  return candidatePath;
}


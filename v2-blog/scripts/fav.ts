/* eslint-disable no-console -- CLI status and error output. */
import { confirm, input } from "@inquirer/prompts";
import { execFile } from "node:child_process";
import {
  copyFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  type FavoriteWorkflowPorts,
  runSetFavorite,
} from "./fav/workflow.ts";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
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
 * Rejects blank answers for required Favorite occupant fields.
 */
function validateRequired(value: string): true | string {
  return value.trim() ? true : "Value is required.";
}

/**
 * Prompts for one required text field.
 */
async function promptRequiredText(
  _field: "title" | "details" | "source",
  message: string,
): Promise<string> {
  return (
    await input({
      message,
      validate: validateRequired,
    })
  ).trim();
}

/**
 * Returns a safe candidate suffix inferred from a source pathname.
 */
function candidateExtension(pathname: string): string {
  const extension = path.extname(pathname).toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.has(extension) ? extension : ".img";
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
async function acquireCandidate(
  source: string,
  temporaryDirectory: string,
): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
    const url = new URL(source);
    const candidatePath = path.join(
      temporaryDirectory,
      `candidate${candidateExtension(url.pathname)}`,
    );
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(
        `Image download failed: ${response.status} ${response.statusText}`,
      );
    }

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_IMAGE_BYTES) {
      throw new Error("Image exceeds 25 MB download limit.");
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Image exceeds 25 MB download limit.");
    }
    await writeFile(candidatePath, bytes);
    return candidatePath;
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

  const candidatePath = path.join(
    temporaryDirectory,
    `candidate${candidateExtension(localPath)}`,
  );
  await copyFile(localPath, candidatePath);
  return candidatePath;
}

/**
 * Opens candidate media in the default macOS viewer.
 */
async function previewCandidate(candidatePath: string): Promise<void> {
  await execFileAsync("open", [candidatePath]);
}

/**
 * Requires explicit approval after visual inspection.
 */
async function approveCandidate(): Promise<boolean> {
  return confirm({
    message: "Use this image?",
    default: false,
  });
}

/**
 * Resizes and compresses an approved image into a small JPEG.
 */
async function processImage(
  candidatePath: string,
  outputPath: string,
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    candidatePath,
    "-vf",
    "scale='min(1200,iw)':-2:flags=lanczos",
    "-frames:v",
    "1",
    "-q:v",
    "3",
    "-map_metadata",
    "-1",
    outputPath,
  ]);
}

/**
 * Requests confirmation before deleting one verified orphan asset.
 */
async function confirmDeletion(assetUrl: string): Promise<boolean> {
  return confirm({
    message: `Delete unused previous asset ${assetUrl}?`,
    default: false,
  });
}

/**
 * Writes one workflow status line.
 */
function logStatus(message: string): void {
  console.log(message);
}

/**
 * Checks local-only runtime requirements before prompting.
 */
async function checkRuntime(): Promise<void> {
  if (process.env.CI) {
    throw new Error("fav is a local-only tool and cannot run in CI.");
  }
  if (process.platform !== "darwin") {
    throw new Error("fav requires macOS for candidate preview via open.");
  }

  try {
    await execFileAsync("ffmpeg", ["-version"]);
  } catch {
    throw new Error(
      "Missing system dependency: ffmpeg. Install it with `brew install ffmpeg`.",
    );
  }
}

/**
 * Parses the CLI command and runs one Favorite replacement.
 */
async function main(): Promise<void> {
  await checkRuntime();

  const [command, slotId, ...extraArgs] = process.argv.slice(2);
  if (command !== "set" || !slotId || extraArgs.length > 0) {
    throw new Error(
      "Usage: npm run fav -- set <books|album|game|learning>",
    );
  }

  const ports: FavoriteWorkflowPorts = {
    promptText: promptRequiredText,
    acquireCandidate,
    previewCandidate,
    approveCandidate,
    processImage,
    confirmDeletion,
    log: logStatus,
  };
  await runSetFavorite({ projectRoot: PROJECT_ROOT, slotId }, ports);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`fav: ${message}`);
  process.exitCode = 1;
});

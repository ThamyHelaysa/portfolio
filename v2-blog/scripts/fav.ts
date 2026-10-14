import { confirm, input } from "@inquirer/prompts";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { acquireCandidate } from "./fav/acquisition.ts";
import { runFfmpeg } from "./fav/ffmpeg.ts";
import {
  type FavoriteWorkflowPorts,
  runSetFavorite,
} from "./fav/workflow.ts";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

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
  await runFfmpeg([
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
    await runFfmpeg(["-version"], { silent: true });
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
      "Usage: npm run fav -- set <books|game|learning>",
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
  process.exitCode = error instanceof Error && error.name === "AbortError" ? 130 : 1;
});

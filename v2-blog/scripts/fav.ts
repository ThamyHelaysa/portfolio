import { confirm, input, select } from "@inquirer/prompts";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  acquireCandidate,
  type CandidateMediaType,
} from "./fav/acquisition.ts";
import { runFfmpeg } from "./fav/ffmpeg.ts";
import type { SourceCandidate } from "./fav/sources.ts";
import {
  type FavoriteWorkflowPorts,
  type PromptField,
  runSetFavorite,
  type SourceChoice,
} from "./fav/workflow.ts";

/** Seconds of the acquired audio that reach the committed excerpt. */
const AUDIO_EXCERPT_SECONDS = 5;
/** Fade applied at both ends, matching scripts/audio-preview.js. */
const AUDIO_FADE_SECONDS = 0.3;

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
  _field: PromptField,
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
 * Asks which acquisition source to use for this slot.
 */
async function chooseSource(choices: SourceChoice[]): Promise<string> {
  return select({
    message: "Source",
    choices: choices.map(({ id, label }) => ({ name: label, value: id })),
  });
}

/**
 * Presents search results and returns the pick, or null to go manual.
 */
async function pickCandidate(
  candidates: SourceCandidate[],
): Promise<SourceCandidate | null> {
  return select<SourceCandidate | null>({
    message: "Result",
    choices: [
      ...candidates.map((candidate) => ({
        name: candidate.label,
        value: candidate,
      })),
      { name: "None of these — enter a source manually", value: null },
    ],
  });
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
async function approveCandidate(
  _candidatePath: string,
  mediaType: CandidateMediaType,
): Promise<boolean> {
  return confirm({
    message: mediaType === "audio" ? "Use this audio?" : "Use this image?",
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
 * Cuts a short faded excerpt from approved audio.
 *
 * Mirrors the bitrate, fade and duration of scripts/audio-preview.js so the
 * committed file sits beside the excerpts already in the repo. Choosing the
 * offset is #151's job; this takes the head of what the source handed over.
 */
async function processAudio(
  candidatePath: string,
  outputPath: string,
): Promise<void> {
  const fadeOutStart = Math.max(
    0,
    AUDIO_EXCERPT_SECONDS - AUDIO_FADE_SECONDS,
  );
  await runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    "0",
    "-t",
    String(AUDIO_EXCERPT_SECONDS),
    "-i",
    candidatePath,
    "-af",
    `afade=t=in:d=${AUDIO_FADE_SECONDS},afade=t=out:st=${fadeOutStart}:d=${AUDIO_FADE_SECONDS}`,
    "-b:a",
    "96k",
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
      "Usage: npm run fav -- set <album|books|game|learning>",
    );
  }

  const ports: FavoriteWorkflowPorts = {
    promptText: promptRequiredText,
    chooseSource,
    pickCandidate,
    acquireCandidate,
    previewCandidate,
    approveCandidate,
    processImage,
    processAudio,
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

// scripts/generate-previews.js
// Generates short MP4 preview clips from full videos in media-src/full.
// Requires ffmpeg installed and available on PATH.
//
// Start offset convention: encode the cut point in the source filename.
//   feature-1@8.mp4   -> clip starts at 8s
//   feature-1@8.5.mov -> clip starts at 8.5s
//   feature-1.mp4     -> clip starts at 0s
// The "@offset" suffix is stripped from the output name, so all of the
// above produce feature-1.preview.mp4.

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import util from "util";
import { fileURLToPath } from "url";

const execFileAsync = util.promisify(execFile);

// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, "..");
const INPUT_DIR = path.join(PROJECT_ROOT, "media-src", "full");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "src", "assets", "videos", "previews");

// How long each preview should be (in seconds)
const PREVIEW_DURATION = 3;

// Matches an optional "@<seconds>" suffix at the end of the basename.
const START_OFFSET_RE = /@(\d+(?:\.\d+)?)$/;

async function runFfmpeg(args) {
  try {
    await execFileAsync("ffmpeg", args);
  } catch (err) {
    console.error("ffmpeg error:", err.stderr || err);
    throw err;
  }
}

async function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Splits a source basename into the clean output name and the start offset.
 * "feature-1@8" -> { name: "feature-1", start: "8" }
 * "feature-1"   -> { name: "feature-1", start: "0" }
 */
function parseBaseName(baseName) {
  const match = baseName.match(START_OFFSET_RE);
  if (!match) return { name: baseName, start: "0" };
  return { name: baseName.slice(0, match.index), start: match[1] };
}

async function main() {
  await ensureOutputDir();

  if (!fs.existsSync(INPUT_DIR)) {
    console.log("No input directory found:", INPUT_DIR);
    return;
  }

  const files = fs
    .readdirSync(INPUT_DIR)
    .filter((f) => /\.(mp4|mov|mkv|webm)$/i.test(f));

  if (!files.length) {
    console.log("No input videos found in:", INPUT_DIR);
    return;
  }

  console.log(`Found ${files.length} full video(s). Generating previews...`);

  for (const file of files) {
    const { name, start } = parseBaseName(path.parse(file).name);
    const inputPath = path.join(INPUT_DIR, file);
    const outMp4 = path.join(OUTPUT_DIR, `${name}.preview.mp4`);

    if (fs.existsSync(outMp4)) {
      console.log(`Skipping ${file} (preview already exists).`);
      continue;
    }

    console.log(`\nProcessing ${file} (start: ${start}s)...`);
    console.log(`  -> ${path.basename(outMp4)}`);

    await runFfmpeg([
      "-y",                                 // overwrite output
      "-ss", start,                         // start offset from filename convention
      "-i", inputPath,                      // input
      "-t", String(PREVIEW_DURATION),       // duration
      "-vf", "scale=640:-1:flags=lanczos",  // resize
      "-an",                                // drop audio
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "28",
      "-movflags", "+faststart",            // moov atom up front for instant playback
      outMp4
    ]);

    console.log(`Done: ${file}`);
  }

  console.log("\nAll previews generated.");
}

main().catch((err) => {
  console.error("Error generating previews:", err);
  process.exit(1);
});

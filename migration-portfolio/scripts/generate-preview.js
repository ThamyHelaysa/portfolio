// scripts/generate-previews.js
// Simple script to generate short preview clips from full videos.
// Requires ffmpeg installed and available on PATH.

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
    const baseName = path.parse(file).name; // e.g. "feature-1"
    const inputPath = path.join(INPUT_DIR, file);

    const outMp4 = path.join(OUTPUT_DIR, `${baseName}.preview.mp4`);
    const outWebm = path.join(OUTPUT_DIR, `${baseName}.preview.webm`);

    // Skip if both previews already exist
    if (fs.existsSync(outMp4) && fs.existsSync(outWebm)) {
      console.log(`Skipping ${file} (previews already exist).`);
      continue;
    }

    console.log(`\nProcessing ${file}...`);

    const commonArgs = [
      "-y",                          // overwrite output
      "-i", inputPath,               // input
      "-ss", "0",                    // start at 0s (change if needed)
      "-t", String(PREVIEW_DURATION),// duration
      "-vf", "scale=640:-1:flags=lanczos", // resize
      "-an"                          // drop audio
    ];

    // MP4 (H.264)
    if (!fs.existsSync(outMp4)) {
      console.log(`  -> ${path.basename(outMp4)} (mp4)`);
      await runFfmpeg([
        ...commonArgs,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "28",
        outMp4
      ]);
    }

    // WEBM (VP9)
    if (!fs.existsSync(outWebm)) {
      console.log(`  -> ${path.basename(outWebm)} (webm)`);
      await runFfmpeg([
        ...commonArgs,
        "-c:v", "libvpx-vp9",
        "-b:v", "0",
        "-crf", "35",
        outWebm
      ]);
    }

    console.log(`Done: ${file}`);
  }

  console.log("\nAll previews generated.");
}

main().catch((err) => {
  console.error("Error generating previews:", err);
  process.exit(1);
});

// scripts/audio-preview.js
// Downloads audio from a URL (via yt-dlp) and cuts a short faded MP3 preview.
// Requires yt-dlp and ffmpeg installed and available on PATH.
//
// Usage:
//   node scripts/audio-preview.js <url> <name> [--start <sec>] [--dur <sec>]
//   node scripts/audio-preview.js <name> --start <sec>          (re-cut, no download)
//
// Examples:
//   node scripts/audio-preview.js "https://youtube.com/watch?v=..." my-song --start 63
//   node scripts/audio-preview.js my-song --start 1:55 --dur 4
//
// --start / --dur accept plain seconds (115, 71.5) or clock notation (1:55, 1:02:03).
//
// The full download is cached in media-src/audio-full/<name>.mp3 so you can
// re-cut at different marks without downloading again. Previews land in
// src/assets/audio/previews/<name>.preview.mp3.

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
const FULL_DIR = path.join(PROJECT_ROOT, "media-src", "audio-full");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "src", "assets", "audio", "previews");

const DEFAULT_DURATION = 5;
const FADE_DURATION = 0.3;

/**
 * Parses a time value in plain seconds or clock notation.
 * "115" -> 115, "115.5" -> 115.5, "1:55" -> 115, "1:02:03.5" -> 3723.5
 * Returns NaN for anything else.
 */
function parseTime(value) {
  if (!/^\d+(?::[0-5]?\d){0,2}(?:\.\d+)?$/.test(value)) return NaN;
  return value
    .split(":")
    .reduce((total, part) => total * 60 + Number(part), 0);
}

function parseArgs(argv) {
  const positional = [];
  const flags = { start: 0, dur: DEFAULT_DURATION };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--start" || arg === "--dur") {
      const value = parseTime(argv[++i] ?? "");
      if (Number.isNaN(value)) {
        console.error(`Invalid value for ${arg}: ${argv[i]} (use seconds or mm:ss)`);
        process.exit(1);
      }
      flags[arg.slice(2)] = value;
    } else {
      positional.push(arg);
    }
  }

  // Two positionals = url + name (download). One = name only (re-cut).
  if (positional.length === 2) {
    return { url: positional[0], name: positional[1], ...flags };
  }
  if (positional.length === 1 && !/^https?:\/\//.test(positional[0])) {
    return { url: null, name: positional[0], ...flags };
  }

  console.error(
    "Usage:\n" +
      "  node scripts/audio-preview.js <url> <name> [--start <sec>] [--dur <sec>]\n" +
      "  node scripts/audio-preview.js <name> --start <sec>   (re-cut cached file)"
  );
  process.exit(1);
}

async function run(cmd, args) {
  try {
    await execFileAsync(cmd, args);
  } catch (err) {
    console.error(`${cmd} error:`, err.stderr || err);
    throw err;
  }
}

async function download(url, fullPath) {
  console.log(`Downloading -> ${path.basename(fullPath)}`);
  await run("yt-dlp", [
    "-x",
    "--audio-format", "mp3",
    "--audio-quality", "5",
    "-o", fullPath.replace(/\.mp3$/, ".%(ext)s"),
    url,
  ]);
}

async function cut(fullPath, outPath, start, dur) {
  const fadeOutStart = Math.max(0, dur - FADE_DURATION);
  console.log(`Cutting ${start}s -> ${start + dur}s (fade ${FADE_DURATION}s)`);
  await run("ffmpeg", [
    "-y",
    "-ss", String(start),
    "-t", String(dur),
    "-i", fullPath,
    "-af", `afade=t=in:d=${FADE_DURATION},afade=t=out:st=${fadeOutStart}:d=${FADE_DURATION}`,
    "-b:a", "96k",
    outPath,
  ]);
}

async function main() {
  const { url, name, start, dur } = parseArgs(process.argv.slice(2));

  fs.mkdirSync(FULL_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const fullPath = path.join(FULL_DIR, `${name}.mp3`);
  const outPath = path.join(OUTPUT_DIR, `${name}.preview.mp3`);

  if (url) {
    await download(url, fullPath);
  } else if (!fs.existsSync(fullPath)) {
    console.error(`No cached file: ${fullPath}\nPass a URL to download it first.`);
    process.exit(1);
  }

  await cut(fullPath, outPath, start, dur);
  console.log(`  -> ${path.relative(PROJECT_ROOT, outPath)}`);
}

main().catch(() => process.exit(1));

# scripts/

Media preview generators. Both need `ffmpeg` on PATH; `audio-preview.js` also needs [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) (`brew install yt-dlp`).

---

## audio-preview.js — short MP3 previews from URLs

Downloads audio from a URL (anything yt-dlp supports: YouTube, SoundCloud, Bandcamp, …), caches the full track locally, and cuts a short faded MP3 preview at an exact second mark.

```
npm run audio:preview -- <url> <name> [--start <sec>] [--dur <sec>]
npm run audio:preview -- <name> --start <sec> [--dur <sec>]        # re-cut, no download
```

| Flag | Default | Meaning |
|-----------|---------|--------------------------------------------|
| `--start` | `0` | Where the preview begins. |
| `--dur` | `5` | Preview length. |

Both flags accept plain seconds or clock notation — all equivalent ways to say 1 min 55.5 s:

```
--start 115.5      --start 1:55.5      --start 0:01:55.5
```

### Where files go

| Path | What | Committed? |
|---------------------------------------------|--------------------|------------|
| `media-src/audio-full/<name>.mp3` | full download (cache) | No — `media-src/` is gitignored |
| `src/assets/audio/previews/<name>.preview.mp3` | the preview | Yes — served at `/assets/audio/previews/<name>.preview.mp3` |

Previews are 96 kbps with a 0.3 s fade in/out. The passthrough copy for `src/assets/audio` is already wired in `eleventy.config.ts`.

### Typical workflow: hunting for the right mark

Download once, then re-cut (name-only form) until the mark feels right — no re-downloading:

```bash
# 1. First pass — download and take a guess at the chorus
npm run audio:preview -- "https://www.youtube.com/watch?v=dQw4w9WgXcQ" never-gonna --start 43

# 2. Listen. Too early? Re-cut from the cache — instant
npm run audio:preview -- never-gonna --start 45.5

# 3. Want a longer taste? Bump duration
npm run audio:preview -- never-gonna --start 45.5 --dur 4
```

Each re-cut overwrites `src/assets/audio/previews/never-gonna.preview.mp3`.

To find the mark faster, scrub the cached file directly:

```bash
open media-src/audio-full/never-gonna.mp3   # opens in Music/QuickTime, note the timestamp
```

### More examples

```bash
# Bandcamp track, preview from the top (start defaults to 0)
npm run audio:preview -- "https://artist.bandcamp.com/track/some-song" some-song

# Fractional start + short 3 s stinger
npm run audio:preview -- "https://soundcloud.com/artist/track" stinger --start 62.25 --dur 3

# Plain node, no npm wrapper
node scripts/audio-preview.js "https://www.youtube.com/watch?v=..." my-song --start 90
```

Gotcha: with `npm run`, the `--` before the arguments is required — without it npm eats the flags.

---

## generate-previews.js — short MP4 previews from local videos

Batch-converts every video in `media-src/full/` into a 3 s muted preview clip in `src/assets/videos/previews/`.

```
npm run generate:previews
```

The cut point is encoded in the **source filename** with an `@<seconds>` suffix; the suffix is stripped from the output name:

| Source file in `media-src/full/` | Preview starts at | Output |
|----------------------------------|-------------------|-----------------------------|
| `feature-1.mp4` | 0 s | `feature-1.preview.mp4` |
| `feature-1@8.mp4` | 8 s | `feature-1.preview.mp4` |
| `feature-1@8.5.mov` | 8.5 s | `feature-1.preview.mp4` |

To change a cut point, rename the source file (e.g. `feature-1@8.mp4` → `feature-1@12.mp4`) and re-run.

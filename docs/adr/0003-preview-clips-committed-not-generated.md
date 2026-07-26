# Preview clips are committed artifacts, generated locally — not built in CI

## Status

accepted

## Context

Media previews can play short video excerpts ("preview clips") on hover. The full source recordings live in `v2-blog/media-src/`, which is **gitignored** — they are large, private-ish working files that never ship. Netlify builds the site from the repo alone, so it can never see the sources and cannot run ffmpeg over them.

## Decision

Preview clips are generated **locally** with `npm run generate:previews` (ffmpeg required on the author's machine) into `src/assets/videos/previews/` and **committed to the repo** as ordinary static assets. The build pipeline just passthrough-copies them.

- Clips are MP4 (H.264) **only** — a dual mp4+webm pipeline was rejected because the shared preview element consumes a single `src` URL, so the second format was dead weight for a marginal codec win on ~3s, 640px, muted clips.
- A start offset is encoded in the source filename (`name@8.mp4` → cut from 8s); the suffix is stripped from the output name.

## Consequences

- Binary video files live in a public git repo. Acceptable: clips are ~3s, 640px, silent, high-CRF — a few hundred KB each — and the count is small.
- Regenerating a clip rewrites the binary and grows history; old blobs stay forever. Keep clips short and few.
- CI can never rebuild previews; a missing clip is an authoring error, not a build error.

## Amendment (2026-07-26): extended to all Favorite and Game log media

The same principle now governs **every** media asset behind a Favorite slot or Game log entry — cover images, audio previews, and video clips — not just clips cut from `media-src/` recordings.

Sources widen beyond local recordings: cover art and metadata come from public APIs (iTunes Search for albums, OpenLibrary for books, RAWG for games), and audio/video excerpts may be fetched with yt-dlp (by pasted URL or `ytsearch`). Whatever the source, the pipeline is unchanged:

- Acquisition and processing happen **locally**, driven by the `npm run fav` CLI, which downloads candidates to a temp area and requires interactive approval (macOS `open` preview + y/n) before anything touches the repo.
- Approved media is transcoded/resized to the same small committed formats (short mp3/m4a excerpts, compressed covers, ~3s silent MP4 clips via the existing ffmpeg scripts) and committed as ordinary static assets.
- CI and Netlify never fetch, never hold API keys for this (RAWG key lives in gitignored `.env`), and never regenerate media. A missing asset remains an authoring error.
- When a Favorite's occupant is replaced, the CLI offers to delete the previous occupant's assets after verifying nothing else in `src/` references them — orphans are pruned at replacement time, though their blobs stay in history.

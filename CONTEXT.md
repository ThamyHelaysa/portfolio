# v2-blog

The active portfolio site (Eleventy + Lit web components). Its distinctive feature is a terminal metaphor used to browse content. This glossary fixes the language around that feature.

## Language

**Terminal**:
A cosmetic, web-native command interface rendered in the browser DOM — a curated set of named commands over the site's own content and actions. It is explicitly **not** a shell, REPL, or terminal emulator: it never executes arbitrary user input, only matches typed input against a fixed command registry. This boundary is a deliberate security and simplicity choice.
_Avoid_: shell, console, REPL, emulator, TTY

**Command**:
A named, pre-registered handler the Terminal can run (e.g. `help`, `list`, `open`). Commands form a closed registry; unknown input yields a "not recognized" response rather than execution.
_Avoid_: program, process

**Summon**:
The act of opening the site-wide Terminal overlay from any base-layout page (via `Ctrl/Cmd+Shift+C` or the unlock button). Distinct from the books page, where the Terminal is always present.
_Avoid_: open, launch, invoke

**Terminal palette**:
The Terminal's own colour token set, derived from the active site theme's primary-pink **hue** and **brightness** rather than copied from the site's base tokens or fixed dark. It flips with the theme toggle while keeping its own contrast/accent structure. See [ADR-0002](docs/adr/0002-terminal-palette-derived-from-theme.md).
_Avoid_: terminal colors, terminal theme

**Media preview**:
The floating bubble that surfaces a small peek of media (artwork, clip) while the user hovers or focuses a trigger. One shared bubble serves the whole page; it is a glimpse, not a lightbox — never interactive, never blocking.
_Avoid_: tooltip, popover, lightbox, thumbnail

**Preview type**:
The *technical* rendering mode of a Media preview: `image` or `video`. Says nothing about what the media represents.
_Avoid_: img, media format

**Media kind**:
The *semantic* identity of the previewed thing — `album`, `book`, `game`, `project`, … Drives presentation treatment: an `album` preview renders as a pure-CSS vinyl disc (grooves, blank label, spinning light sheen) in place of its artwork; all other kinds render plain. Distinct from Preview type: a kind describes what the thing **is**, a type describes how its preview is **rendered**.
_Avoid_: category (that's display copy), type

**Preview clip**:
A short (~3s), silent, small-format excerpt cut from a full recording — the thing a video Media preview plays. Generated ahead of time from local source recordings; the full recording never ships.
_Avoid_: video, trailer, thumbnail

**Site index**:
The build-time manifest of navigable pages — blog posts, books, and top-level pages — that the Terminal lists with `ls` and navigates with `open`. The Terminal models it as a **tree** keyed on each page's real URL: containers (`blog/`, `books/`, year levels) are **folders** that carry a descendant count; individual pages are **leaves**. Page URLs always come from real Eleventy permalinks, never hardcoded.
_Avoid_: sitemap, manifest, catalog

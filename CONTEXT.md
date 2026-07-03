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

**Site index**:
The build-time manifest of navigable pages — blog posts, books, and top-level pages — that the Terminal lists with `ls` and navigates with `open`. The Terminal models it as a **tree** keyed on each page's real URL: containers (`blog/`, `books/`, year levels) are **folders** that carry a descendant count; individual pages are **leaves**. Page URLs always come from real Eleventy permalinks, never hardcoded.
_Avoid_: sitemap, manifest, catalog

# v2-blog

The active portfolio site (Eleventy + Lit web components). Its distinctive feature is a terminal metaphor used to browse content. This glossary fixes the language around that feature.

## Language

**Terminal**:
A cosmetic, web-native command interface rendered in the browser DOM — a curated set of named commands over the site's own content and actions. It is explicitly **not** a shell, REPL, or terminal emulator: it never executes arbitrary user input, only matches typed input against a fixed command registry. This boundary is a deliberate security and simplicity choice.
_Avoid_: shell, console, REPL, emulator, TTY

**Command**:
A named, pre-registered handler the Terminal can run (e.g. `help`, `list`, `open`). Commands form a closed registry; unknown input yields a "not recognized" response rather than execution.
_Avoid_: program, process

**Shared Command**:
A Command whose semantics are site-wide — it must behave identically on every Terminal surface (`theme`, `whoami`, `ls`, `grep`, `cat`, `random`). Shared Commands come from one registry factory (`_helpers/terminal/commands.ts`) that each surface spreads into its own registry; a surface may wrap presentation (flavor text) but never semantics. Commands that are not shared are **surface Commands** (`exit`, `skip`, `clear`, the cheats) and stay owned by their surface.
_Avoid_: global command, common command, built-in

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
The *technical* rendering mode of a Media preview — the playback mechanism: `image`, `video`, or `audio`. Says nothing about what the media represents. Selects the **Channel** that plays it.
_Avoid_: img, media format

**Media kind**:
The *semantic* identity of the previewed thing — `album`, `book`, `game`, `project`, … Drives the **Presentation** (visual treatment). Distinct from Preview type: a kind describes what the thing **is**, a type describes how its preview is **rendered**. Only `album` currently has a bespoke Presentation (Cover + vinyl); the other kinds render as a plain glimpse of their media.
_Avoid_: category (that's display copy), type

**Channel**:
The per-Preview-type playback element behind the shared bubble — one adapter per `image` / `video` / `audio`, owning that type's element, load/blur-in, and play/pause. Concerns *how the media plays*, never *how the kind looks*. The visual channels (`image`/`video`) mount inside the default **Face**; `audio` is loose (sound only). See [ADR-0004](docs/adr/0004-media-preview-decorative-singleton-card-is-control.md).
_Avoid_: player, adapter (in prose)

**Container**:
The single envelope node of the Media preview — owns nothing but position, the size box, and the show/hide animation. It carries **no** kind look of its own (no round bubble, no colour); every visual lives in a Face mounted inside it. Show/hide is the only animation on the container; positioning uses the CSS `translate` property so WAAPI can own `scale`+`opacity`. See [ADR-0006](docs/adr/0006-preview-faces-and-waapi-animation.md).
_Avoid_: bubble (that's the whole preview), wrapper

**Face**:
The per-Media-kind visual mounted inside the Container — the DOM realization of a **Presentation**. Exactly one Face is active at a time. Kinds with no bespoke Presentation share the **default round Face** (accent ring + circular clip that frames the visual Channel); `album` swaps in its own square Cover+vinyl Face. Each Face is self-contained: its own CSS block and its own play/stop animation, never shared across kinds.
_Avoid_: layer, skin, card

**Presentation**:
The per-Media-kind *visual* treatment realized as a **Face** — the counterpart to a Channel. A Presentation owns its Face's DOM, its state transitions, and its own animation (via WAAPI, `animationManager`); a Channel owns playback. Plain kinds use the default round Face; `album` has a bespoke Presentation — a square **Cover** with a pure-CSS vinyl disc that, on commit, slides out to overlap the Cover's right half **in front** of it and spins. See [ADR-0005](docs/adr/0005-album-preview-breaks-the-circle.md), [ADR-0006](docs/adr/0006-preview-faces-and-waapi-animation.md).
_Avoid_: skin, theme, layout

**Cover**:
The resting face image of a Presentation — album artwork, book cover, game box. Distinct from the played media (`preview-src`): the Cover is what shows *before* commit. Album carries both a Cover (`preview-cover`, an image) and a `preview-src` (the audio it plays); the vinyl disc emerges from behind the Cover on commit.
_Avoid_: thumbnail, poster, artwork (as the canonical term)

**Vinyl disc**:
The pure-CSS record (grooves, blank label, spinning sheen) that is the `album` Face's inner artifact. Colours derive from the active theme's accent, so it flips with the theme. At rest it peeks ~40% from behind the Cover, **behind** it and static; on commit it lifts to the **front** and slides right to overlap the Cover's right half, its sheen spinning while the audio plays.
_Avoid_: record, disk, LP

**Hover intent**:
The judgement that the user means to look at a trigger, not merely pass across it. Judged from cursor **velocity** — slowing or pausing over a trigger proves intent; a fast sweep never does. A Media preview only appears once intent is proven. Keyboard focus proves intent by itself.
_Avoid_: hover delay, debounce, dwell

**Warm state**:
The window after intent has been proven while the preview is up (or lingering). While warm, moving to a sibling trigger swaps the preview instantly — intent is not re-proven per item. Leaving all triggers ends the warm state after a short linger.
_Avoid_: grace period, open state

**Choreography**:
The pure state machine that decides the Media preview's show/hide sequencing — Hover intent, Warm state, the album shape-swap defer, and generation superseding. Owns no DOM, timers, or `window`; the singleton feeds it real events (reveal/commit/hide/stop, timer and transition completions) and executes the commands it returns. See [ADR-0006](docs/adr/0006-preview-faces-and-waapi-animation.md).
_Avoid_: state machine (as the primary term in prose), controller, orchestrator

**Scroll policy**:
The pure decision of what one throttled scroll frame does to the Media preview: on touch the bubble **follows** its source card (and committed playback stops once the card has fully left the viewport); on desktop any real scroll past a small jitter threshold dismisses committed playback; a hidden bubble detaches its tracking. Owns no DOM, `window`, or `matchMedia` — the singleton gathers the frame's facts as plain data, calls the policy (`previewScrollPolicy.ts`), and executes the commands it returns. The listener/rAF mechanics that decide *when* a frame happens belong to `scrollAnchor.ts`, not the policy. See [ADR-0004](docs/adr/0004-media-preview-decorative-singleton-card-is-control.md).
_Avoid_: scroll handler, scroll listener (those are the mechanics), dismiss-on-scroll (that's only the desktop half)

**Preview clip**:
A short (~3s), silent, small-format excerpt cut from a full recording — the thing a video Media preview plays. Generated ahead of time from local source recordings; the full recording never ships.
_Avoid_: video, trailer, thumbnail

**Heading tree**:
The structured outline of a post's in-body headings — each node carries the heading's anchor id, its visible text, and its child headings. It is *data, not markup*: the publishable TOC core produces only Heading trees; every rendered table of contents (the site's own template or the core's plain default) is a downstream consumer of one. Anchor ids are read from the rendered page, so they always match the ids the markdown pipeline actually emitted.
_Avoid_: TOC HTML, outline markup, toc object

**Site index**:
The build-time manifest of navigable pages — blog posts, books, and top-level pages — that the Terminal lists with `ls` and navigates with `open`. The Terminal models it as a **tree** keyed on each page's real URL: containers (`blog/`, `books/`, year levels) are **folders** that carry a descendant count; individual pages are **leaves**. Page URLs always come from real Eleventy permalinks, never hardcoded.
_Avoid_: sitemap, manifest, catalog

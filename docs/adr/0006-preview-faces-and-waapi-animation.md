# Preview bubble: a neutral container of per-kind Faces, animated with WAAPI

## Status

accepted (amends [ADR-0005](0005-album-preview-breaks-the-circle.md))

## Context

ADR-0004/0005 grew the media preview into a single `#mediaPreview` node that carried *everything*: the round accent-pink bubble look, the `img`/`video`/`audio` channels as bare siblings, **and** the album Cover+vinyl — with `#mediaPreview img { … }` styling both the channel image and the album cover, and album forced to *un-style* the container's round look (`background: transparent; border: none; border-radius: 0`). Show/hide, per-kind visuals, and channel media all lived at one level, coupled by shared element selectors.

Two things broke as a result: the CSS was fragile (specificity fights, kind-specific overrides on a supposedly generic node), and the album disc's "come to the front of the cover" never read — it slid to `translateX(100%)`, flush *beside* the cover with zero overlap, so its raised z-index had nothing to sit in front of. The animation was also entirely CSS transitions, which stopped scaling as the states multiplied (reveal, hide, cross-shape swap, disc slide, spin) and forced `setTimeout` hacks to sequence retract-then-reveal.

## Decision

Make the container a **neutral envelope** and give every kind a self-contained **Face**; drive the sequenced motion with **WAAPI** (the existing `animationManager`).

- **Container owns nothing but position, the size box, and show/hide.** No round look, no colour, no kind-specific CSS. Positioning uses the CSS `translate` property (from `--preview-x/y`) so WAAPI can animate `scale` + `opacity` without a `transform` shorthand conflict — one node, position still GPU-composited for cursor/scroll follow.
- **Every kind renders into a Face.** Plain kinds share the **default round Face** (accent ring + circular clip that frames the visual Channel); `album` swaps in its bespoke square Cover+vinyl Face. The round-pink look that used to live on the container is now just one Face among others — album no longer un-styles anything.
- **Faces are self-contained.** Each owns its CSS block (no bare-element selectors — `.channel-media`, `.album-cover`, `.album-vinyl`) and its own play/stop animation. Only the active Face carries `is-active`.
- **Channels split by visibility.** The visual channels (`image`/`video`) mount inside the round Face; `audio` stays loose (sound only). A Channel is still just playback.
- **The Presentation owns its animation.** `album`'s Presentation grows `play()`/`stop()` that run the disc's slide+lift through `animationManager` (WAAPI) and toggle an `is-spinning` class; the container owns show/hide; the Channel owns sound. The singleton orchestrates the *sequence* and delegates the motion.
- **Disc lifts to the front and overlaps.** On commit the disc flips to the front (z above the Cover) at the start of the tween, then slides right to **overlap the Cover's right ~half** (with a small scale-up). Overlap > 0 is the invariant that makes "in front" visible.
- **Spin stays CSS.** The one perpetual loop is a `@keyframes` on `.album-vinyl::after`, toggled by class — infinite loops are CSS's strength and don't fit `animationManager` (which finishes + commits a final frame). WAAPI drives only the discrete, sequenced motion.
- **Sequencing via promises, not timers.** Show/hide return promises, so retract → teardown → reveal is `await`-ed rather than timed with `SWAP_MS`/`HIDE_MS`.

## Considered options

- **Keep the single flat node, just rename classes.** Rejected: it leaves the container secretly kind-specific (album still un-styling the round look) and doesn't isolate per-kind animation.
- **GSAP for the animation.** Rejected: GSAP is a dep but only used by `terminal-shell` on the books page; the preview runs on every base-layout page, so it would add ~50KB there. `animationManager` (WAAPI) already gives a controlled JS timeline, reduced-motion handling, and is CSP-hardened for iOS (see the `fixing-waapi-csp-ios-safari` post).
- **Mount faces on demand** (only the active face in the DOM). Rejected: re-mounting re-decodes media and fights ADR-0004's pre-create rationale; class-based isolation gets the cleanliness without the cost.
- **A separate inner "stage" node for scale** (position on the outer, scale on the inner). Rejected once the individual `translate`/`scale` CSS properties removed the transform conflict — one node suffices.

## Consequences

- `animationManager.animate()` finishes and commits a final frame, so it fits the discrete motions (show/hide, disc slide) but not the infinite spin — spin stays CSS by design.
- Reduced motion: `animationManager` snaps discrete motion to 0ms, but the album `play()` must additionally *skip* the disc entirely (leave it at the resting peek, no snap-to-front) — audio only, per ADR-0005.
- Relies on the individual `translate`/`scale`/`rotate` CSS properties (Safari 14.1+, Chrome 104+, Firefox 72+) — acceptable for this site; iOS Safari is the one that mattered and supports them.
- The `translate`-property positioning replaces the old `transform: translate3d(...)`; the touch scroll-follow and desktop cursor-follow now write `--preview-x/y` into `translate`, still compositor-friendly.

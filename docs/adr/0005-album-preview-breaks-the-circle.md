# The album preview breaks the circle: a per-kind Presentation layer

## Status

accepted (amends [ADR-0004](0004-media-preview-decorative-singleton-card-is-control.md)'s "circle always")

## Context

ADR-0004 fixed one geometry for every preview: a round bubble, "circle always, grow on play," with each media *type* rendered by a Channel cropped into that circle. Album was a special case only in CSS — a pure-CSS vinyl disc drawn on the wrapper's own background/pseudo-elements, shown *in place of* any artwork.

The album preview is being redesigned: at rest it shows the **album Cover** (a real image) with the vinyl disc peeking ~40% from behind it; on commit the disc slides out from behind the Cover, lifts to the front, and spins while the audio plays. This is a square poster with a disc protruding sideways — it is not a circle, and it needs the Cover and the disc as two independently-moving layers. The vinyl-as-wrapper-background approach can express neither (a background can't translate independently of its box; the bubble's `overflow: hidden` clips a protruding disc). The requirement is also explicitly forward-looking: game and book kinds must be able to grow their own bespoke visuals later.

## Decision

Introduce a **Presentation**: a per-`media-kind` visual treatment inside the shared bubble, parallel to the per-`preview-type` Channel. Channels stay strictly about *how the media plays*; Presentations own *how the kind looks*.

- **Album opts out of the circle.** Its Presentation is a square Cover with the vinyl disc as a sibling layer beside it. Keyed on `data-kind="album"`, it overrides the round-bubble geometry and skips the `is-grown` / `--preview-scale` circle-grow entirely.
- **Cover is a new, separate source.** `preview-cover` (an image) carries the resting face; `preview-src` stays the played media (the mp3). The two are orthogonal — the audio Channel is still the hidden noisemaker; the Cover + vinyl are the Presentation.
- **The vinyl stays pure-CSS**, theme-adaptive (colours from the accent). No per-album disc asset.
- **Cover is static; the disc is the only mover.** One fixed album box sized for Cover + fully-emerged disc. Glimpse: disc tucked, peeking, not spinning. Commit: disc translates right, z-lifts to the front, sheen spins, audio plays. Stop: reverse. No box resize or scale — the disc's `translate` is the whole animation.
- **Non-album kinds keep ADR-0004 unchanged** — no Presentation, the Channel's media shows cropped in the round bubble. The Presentation seam exists but only album populates it.
- **Reduced motion: no visual motion at all.** The disc neither slides nor spins nor snaps; it stays in the peeking rest pose and the audio plays. State is carried by the trigger card's cursor glyph and `aria-pressed` (ADR-0004), not by movement.

## Considered options

- **Force the design into the round bubble** (disc clipped inside the circle). Rejected: `overflow: hidden` eats the protruding disc and the square Cover, which is the entire look.
- **Fold the Cover + vinyl into the audio Channel.** Rejected: "vinyl" is an `album` (kind) trait, not an `audio` (type) trait — a podcast is audio with no vinyl. It would contaminate the type/kind orthogonality ADR-0004 established.
- **Keep everything pure-CSS on the wrapper background + pseudo-elements.** Rejected: only two pseudo-elements, and a background can't translate independently, so the two-layer slide is impossible.
- **Grow the Cover on commit** (mirror the circle grow). Rejected: the reveal *is* the affordance; a fixed Cover with only the disc moving avoids a width/scale transition fighting the slide.
- **Design game/book inner artifacts now.** Deferred: no design exists for them; the Presentation seam is built so they can be added without another rearchitecture.

## Consequences

- The shared bubble's geometry is now **per-kind**, not global. "Circle always" from ADR-0004 holds for every kind except `album`.
- Album gains a second image dependency (`preview-cover`) — a real Cover asset must ship per album, alongside the mp3 (ADR-0003 still governs the audio clip).
- The Presentation seam is the extension point for future game/book visuals; adding one is a new Presentation, not a change to the singleton or the Channels.
- `preview-src` stays overloaded across kinds (played media for album/video, shown image for the plain kinds). Accepted as a known wart; a future migration could split it once more kinds grow Presentations.

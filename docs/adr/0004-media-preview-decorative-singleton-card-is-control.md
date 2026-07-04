# Media preview: the bubble is a decorative singleton, the card is the control

## Status

accepted

## Context

The floating media preview (`#mediaPreview`, driven by the `SharedMediaPreview` singleton) started life as a purely decorative hover glimpse: one shared DOM node, `pointer-events: none`, `aria-hidden`, cursor-following, and — for video — autoplaying on reveal inside a 16:9 rounded rect "so screen recordings stay legible."

The design then grew a real interaction: previews should *reveal* on approach but only *play* on an explicit commit (click/tap), and albums should play audio with a vinyl that spins only while playing. That collides with the original shape in three ways — the bubble can't receive clicks (it follows the cursor and has no pointer-events), there is only ever one bubble, and reveal and playback were fused together.

## Decision

Keep the singleton and its decorative, non-interactive bubble. Route all interaction through the **trigger card** instead of the bubble, and split reveal from playback.

- **The card is the control, not the bubble.** The `<media-preview>` host takes the click / `Enter` / `Space`, and (for playable types) becomes `role="button"` with `aria-pressed`. The bubble stays `aria-hidden`, `pointer-events: none`, cursor-following. This avoids turning the decorative overlay into a focusable player and keeps the a11y surface on one real element.
- **Reveal ≠ play.** Hover (desktop) / scroll-into-view (touch) reveals a small, *paused* glimpse. A click/tap commits: the media plays, and the ball **anchors** (stops following) and **grows** to a larger circle beside the card so it's watchable.
- **Playback is ephemeral.** Leaving the card stops and hides it (with the existing ~100ms warm/linger grace so a small overshoot doesn't cut playback). Hovering another card while one plays stops the current and retargets the single bubble to the new card's glimpse. On touch: scroll-out or a second tap stops it.
- **Circle always; grows on play.** Every type renders in the round bubble, video included (cropped `object-fit: cover`). Small on glimpse, grown on commit.
- **`previewType` = mechanism, `media-kind` = presentation.** Type selects the playback element — `image` | `video` | `audio` (new). Kind selects the treatment — `album` stays a pure-CSS vinyl whose spin is now bound to the audio's play state instead of running forever.
- **Scroll-reveal is touch-only and sequential.** Desktop keeps hover as the reveal trigger. Touch uses an `IntersectionObserver` that reveals cards one at a time through the *same* singleton — never a stack of simultaneous bubbles.

## Considered options

- **Make the bubble itself an interactive, anchored player** (`pointer-events: auto`, focusable). Rejected: it turns the decorative overlay into a real control with a full keyboard/ARIA surface and kills the cursor-follow glimpse. The card is already a perfectly good, semantic control.
- **Keep the 16:9 rect for video** (the original legibility rationale). Rejected in favour of "circle always, grow on play": the grow-on-commit state buys back the watchability that the rect was protecting, without a second geometry. The center-crop is accepted for the content types shown (game/project clips).
- **Sticky committed playback** (a playing card holds the bubble hostage; neighbours ignored until dismissed). Rejected: fights the singleton and loses your audio when you graze a neighbour. Ephemeral + retarget-on-hover goes *with* the one-bubble grain.
- **Several bubbles visible at once on scroll.** Rejected/deferred: N DOM nodes and N decoding media elements is a real rearchitecture of the singleton.
- **Smuggle album audio through the `<video>` element.** Rejected: a dedicated `<audio>` element keeps the three media paths orthogonal; a `<video>` playing an mp3 lies to every "video" branch (sizing, `data-type`, play logic).

## Consequences

- Video preview clips are **silent** (the generator strips audio with `-an`, ADR 0003), so video "play" is muted motion; the album `<audio>` is the only sound. A user gesture (click/tap) is required to start audio anyway, which the commit step provides for free.
- The bubble stays decorative and `aria-hidden`; a screen reader learns state from the card's `aria-pressed`, not the overlay. Reduced-motion snaps the grow, freezes the vinyl, and drops blur-in — but never blocks playback.
- `IntersectionObserver` becomes the codebase's first use of it (only a `ResizeObserver` existed before).
- Anchoring uses fixed positioning relative to the trigger rect at commit time; scrolling on desktop while anchored-playing detaches the ball from its card. Simplest resolution is to dismiss on scroll.
- Implementation is a follow-up: the audio asset/pipeline landed (`scripts/audio-preview.js`, committed snippet, `assets/audio` passthrough), but the runtime — `'audio'` type + `<audio>` element, reveal/play decouple, anchor+grow, touch scroll-reveal, and the `personal.json` content — is still to build.

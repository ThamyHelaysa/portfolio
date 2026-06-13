# Terminal state uses a Bubble Tea-inspired reducer, not Charm or a full Elm runtime

## Status

accepted

## Context

The `terminal-shell` component (the books-page Terminal) accumulated scattered imperative state — many `@state` flags, route-mode tracking, an ascii render queue, and several rAF handles spread across ~860 lines. We wanted the robustness of the [Charm](https://charm.land/libs/) / Bubble Tea terminal architecture.

## Decision

Adopt the *discipline* of Bubble Tea's Model → Update → View pattern inside our existing Lit components, without importing or emulating any of it:

- A single immutable state object replaces the scattered flags.
- A pure `update(state, action) → newState` reducer with typed actions is the only path that changes state. It lives in its own module so it is unit-testable in isolation (TDD).
- Lit is the View: `render()` reads only from state.
- Side effects (gsap typing, ascii fetch, focus, scroll, popover) stay imperative and fire from Lit's `updated(changedProperties)` lifecycle by diffing old vs new state.

The reducer starts **shell-local but liftable** — written as a standalone function, ready to promote to a shared helper once a second consumer (e.g. `terminal-overlay`) develops comparable state. `terminal-core` is already clean and is unchanged.

## Considered options

- **Charm / Bubble Tea directly** — rejected: they are Go libraries that render ANSI to a TTY. Using them in the browser would require Go→WASM + a canvas terminal emulator (xterm.js), blowing the performance budget and destroying SSG/SEO and accessibility. (See also the "not a shell" boundary in [CONTEXT.md](../../CONTEXT.md).)
- **Full Elm/MVU with an effect-runtime** (`update` returns `(state, effects)`, a runner executes them and feeds messages back) — rejected: Bubble Tea needs this because a Go terminal has no UI lifecycle; Lit's `updated()` already is that lifecycle. An effect-runtime would be a redundant second framework competing with Lit.
- **Tidy-only** (group flags, no reducer) — rejected: housekeeping that doesn't deliver explicit, testable transitions.
- **Shared reducer/store utility now** — rejected: premature abstraction; the overlay has no scattered-state pain yet.

## Consequences

- State transitions become named, pure, and unit-testable; later terminal slices (#78, #80, #81) should follow this pattern.
- Effects remain imperative (a deliberate seam): the reducer is pure, but side effects are not described as data — they are triggered from `updated()`.
- Contributors must learn one local convention (reducer + actions) instead of reading scattered flags.

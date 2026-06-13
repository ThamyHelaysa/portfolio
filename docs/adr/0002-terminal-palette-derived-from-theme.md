# Terminal palette adopts the site theme via a derived, hue-and-brightness-aware palette

## Status

accepted

## Context

The terminal is being restyled to a Lip Gloss-style linear-stream aesthetic (#86). We had to decide whether the terminal keeps a fixed dark palette or follows the site's theme toggle. The site is themed off a single **primary pink** hue (`--color-pink-50 … --color-pink-950`): the `pinky` theme is light (background `pink-50`, accent `pink-900`) and the `dark` theme inverts the brightness (background `gray-900`, accent `pink-200`). The codebase already mixes colors in `oklab`.

## Decision

The terminal **adopts the active site theme** (it flips with the theme toggle) — but through a **dedicated terminal palette**, not the raw site tokens and not a fixed dark palette.

That terminal palette is **derived from the active theme's hue and brightness**, explicitly:

- It respects the **theme's hue degree** — the hue is taken from the theme's primary pink, so the terminal reads as the same colour family as the rest of the site in that theme.
- It respects the **theme's brightness/luminance** — a light theme yields a light terminal surface, a dark theme a dark one; the terminal does not hard-code darkness.
- It is its own token set (e.g. `--term-bg`, `--term-surface`, `--term-prompt`, `--term-badge-*`, `--term-status-*`) derived from the theme's primary (via OKLCH / relative-color or `color-mix`, consistent with the existing `oklab` usage), so the terminal can have its own contrast and accent structure while staying hue- and brightness-coherent with the active theme.

## Consequences

- #86 must define per-theme terminal tokens derived from the primary-pink hue at each theme's brightness, rather than copying the prototype's standalone Lip Gloss colours.
- Functional accents (error = red, ok = green) stay semantic but must be tuned for contrast against the derived, pink-hued base in both themes.
- The terminal surfaces (books page and overlay) share one terminal-palette token set, so both stay consistent across theme changes.
- Reduced motion and theme-flash rules still apply; the derived tokens must be defined in CSS that is present before paint (no post-load recolour flash).

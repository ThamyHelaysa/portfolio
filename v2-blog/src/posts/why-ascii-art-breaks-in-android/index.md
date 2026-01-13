---
title: "When ASCII Art Breaks on Android"
date: "2035-01-30"
description: "bla"
tags: 
    - dev
    - web
---



When ASCII Art Breaks on Android (and Why It’s Not Your Code)

While building a terminal-style UI, I ran into a strange problem:
ASCII art that looked perfect on desktop was broken on Android.

Not missing characters — misaligned ones.

Box-drawing symbols like:

┌ ┐ ┬ ┤ ┴ ├ ┼ ╲ ╱


were rendered with inconsistent spacing, causing the art to “drift” and lose structure.

At first glance, this looks like a CSS or layout bug.
It isn’t.

The real problem: font metrics, not glyph support

Most modern monospace fonts include box-drawing characters.
But ASCII art depends on three things being perfectly consistent:

Fixed advance width (true monospace)

Identical vertical metrics for all glyphs

No per-character font fallback

On Android, many popular coding fonts (even good ones) fail at #2 and #3.

The result:

letters align correctly

box-drawing glyphs render with slightly different metrics

diagonals (╲ ╱) and intersections (┼) drift by fractions of a pixel

the art breaks

This is not visible on desktop browsers, but Android’s text renderer exposes it immediately.

Why splitting characters doesn’t help

A tempting workaround is to render ASCII per character instead of per line.

This doesn’t fix the problem.

If the font renders glyphs with inconsistent metrics, splitting into spans just gives you more broken glyphs, plus:

heavier DOM

worse performance

more layout thrash on mobile

Per-character rendering is great for effects, not for correctness.

Why Google Fonts often fail here

Many Google Fonts are designed for:

code readability

ligatures

modern typography

They are not designed for terminal box-drawing fidelity.

Even fonts that technically support the Unicode range may:

fall back per glyph

apply different hinting rules

render diagonals with different ascent/descent

The result is visually “almost right” — which is worse than obviously broken.

The boring solution that actually works

The fix was simple, unglamorous, and effective:

Use a font designed for terminals.

Specifically:

DejaVu Sans Mono

It has:

rock-solid box-drawing support

consistent metrics across platforms

predictable rendering on Android

Once I switched only the ASCII containers to this font, everything snapped into place.

No JS changes.
No layout hacks.
No per-character rendering.

Just the right font.

Key takeaway

If you render ASCII or box-drawing art on the web:

This is not a CSS bug

This is not an Android bug

This is not a Unicode bug

It’s a font metrics problem.

Choose fonts designed for terminals, not branding — and scope them narrowly to where they’re needed.

Sometimes the old, boring tools still win.
# TOC core emits a Heading tree (data), never markup; templates live in userland

## Status

accepted

## Context

Blog posts need a table of contents. The obvious path is `eleventy-plugin-toc` (jdsteinbach), which parses rendered HTML with cheerio and returns a finished `<nav><ol>` string — its only customization is a handful of wrapper/tag options, so the site's template aesthetic (mono metadata rows, CSS counters, `<details>` collapse) cannot be expressed through it. We also intend to extract our TOC as a publishable Eleventy plugin later, so the architecture must keep the reusable core cleanly separable from this site's presentation.

## Decision

We build our own TOC as an Eleventy plugin living in `src/_config/toc/`, structured for extraction from day one (`addPlugin(tocPlugin, options)` signature, zero imports from site code). Its primary API is a **`tocItems` filter that returns a Heading tree — structured data (`{id, text, level, children}`), never HTML**. A thin `toc` filter renders a plain default `<nav><ol>` *on top of* `tocItems` for drop-in users; this site ignores it and renders the tree through its own Nunjucks macro.

Headings are extracted by **parsing the rendered HTML output** (with `node-html-parser`), not by re-processing markdown tokens: anchor ids are read from what `markdown-it-anchor` actually emitted (including dedup suffixes like `foo-1`), so the TOC can never drift from the real anchors, and the core works with any consumer's markdown pipeline.

## Considered Options

- **`eleventy-plugin-toc` as-is** — rejected: markup hardcoded, data layer unreachable, stale maintenance, cheerio dependency.
- **Markdown-token extraction with re-slugify** — rejected: must mirror the anchor plugin's slugify *and* dedup logic; drifts silently, breaks for consumers with a different slugify.
- **Shipping a Nunjucks template with the plugin** — rejected: Eleventy plugins cannot reliably inject includes into a user's include path across template engines.

## Consequences

- API surface stays deliberately small: `tags` (default `h2–h4`), `ignore` selectors (default `['.header-anchor']`), `minHeadings` (default 3, honored by the default renderer only — `tocItems` always returns full data). No `flat` option: flattening a tree is trivial for data consumers.
- Tree building tolerates authoring slop: skipped levels nest under the nearest shallower heading; headings before the first top-level tag become root nodes; headings without an id are skipped silently (not linkable).
- Per-post opt-out (`toc: false` frontmatter) is a documented template pattern, not a plugin option — a filter never sees frontmatter.
- Publishing later means moving the folder out and adding a package build (TS → JS); no rewrite.

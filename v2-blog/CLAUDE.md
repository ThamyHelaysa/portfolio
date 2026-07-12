# CLAUDE.md — v2-blog

Personal portfolio/blog. Eleventy 3 + Nunjucks + TypeScript + Tailwind v4 + Lit web components. Static output to `dist/`, deployed on Netlify.

**Read [AGENTS.md](./AGENTS.md) first** — it holds the workflow rules (git branching off `develop`, conventional commits, test priorities, dos/don'ts, CI troubleshooting). This file is the architecture reference.

Context: the parent repo also contains `../thamy-blog` (the still-live Gatsby site). v2-blog is its replacement under active development. CI workflows live in the parent repo at `../.github/workflows/`, not here.

## Commands

```bash
npm start            # eleventy --serve --incremental (dev server)
npm run build        # build to dist/
npm run check        # typecheck + lint (eslint + stylelint) + vitest unit tests
npm run check:full   # check + build + html-validate on dist
npm run test:e2e     # playwright
```

`npm test` runs vitest, but the canonical gate is `npm run check`. `lint:html` only works after a build.

## Build pipeline (eleventy.config.ts — everything happens here)

1. **Eleventy runs through tsx** so the config itself is TypeScript (`--config=eleventy.config.ts`).
2. **TS → browser JS**: a custom `addExtension("ts", ...)` compiles files under `src/components/` and `src/_helpers/` with esbuild (bundled ESM, minified, es2020). Output mirrors the source path, so `src/components/theme-toggle.ts` is served as `/components/theme-toggle.js`. The rules live in `src/_config/buildConventions.ts` (`classifyTsInput`): `.d.ts` files and known non-browser TS (`src/@types/`, `src/_config/`) are ignored; **any other `.ts` under `src/` fails the build** with an error naming the file — move it under `src/components|src/_helpers` or add it to the ignore list.
3. **Tailwind v4 is compiled manually** in the `eleventy.before` hook via PostCSS (tailwind + autoprefixer + cssnano). Targets are discovered by convention (`cssTargets` in `src/_config/buildConventions.ts`): **every** `src/assets/styles/*.css` compiles to `dist/assets/css/<basename>` — a new shadow/global CSS file just works. Exception: `@import`-only partials (`config-theme.css`, `shadow-config.css`) are listed in `CSS_PARTIALS` there and produce no standalone output. `books-terminal-deferred.css` goes through the same pipeline (no passthrough copy anymore).
4. Passthrough copies: images, fonts, videos, and `asciiart/` JSON.
5. Markdown uses markdown-it + markdown-it-anchor with slugified header permalinks; templates render with Nunjucks (`markdownTemplateEngine: "njk"`).

## CSP pattern (the most fragile part of the head)

Both layouts build the `Content-Security-Policy` meta tag **at build time** by hashing every inline script/style with the `cspHash` filter (sha256 → base64):

- Each inline asset is captured with `{% set content %}{% include path %}{% endset %}`, trimmed, hashed, appended to `cspScriptSrc`/`cspStyleSrc`, and its `<script>`/`<style>` tag buffered for printing after the meta tag.
- Pages opt in via frontmatter arrays: `inlineScripts`, `inlineStyles` (paths relative to `src/_includes/`), and `pageModules` (external module script URLs, only in `base.njk`).
- Inline JS/CSS source files live in `src/_includes/` (`inline-theme.js`, `inline-modal-listener.js`, `inline-books-shell-css.js`, `css/*.css`).
- Consequence: inline scripts must be **static** — any dynamic data goes into markup/data attributes, never interpolated into the hashed script.

## Two distinct page shells

| | `base.njk` | `books.njk` |
|---|---|---|
| Used by | pages, posts, notes | books listing + book detail pages |
| Chrome | header/footer partials, `global.css` link | full-screen `<terminal-shell>` fake CLI |
| Inline CSS | `fonts.css`, `default.css` | `terminal-fonts.css`, `terminal.css` |
| Components | `theme-toggle`, `menu-mobile` | `theme-toggle` (terminal mode), `terminal-shell` |

`books.njk` also inlines `inline-books-shell-css.js`, which lazy-loads `books-terminal-deferred.css` using the `media="print"` → `media="all"` on-load trick. Book data is embedded in the books page as a `<script type="application/json" id="raw-book-data">` blob that `terminal-shell` parses at runtime; ASCII covers come from `/assets/asciiart/Book*.json`.

## Components (`src/components/`, Lit 3)

- **Shadow DOM components** (`theme-toggle`, `menu-mobile`, `note-modal`, …) load their Tailwind CSS at runtime via `adoptTailwind()` from `src/_helpers/styleLoader.ts` — constructable stylesheets shared across roots, request-coalesced fetches, `<style>`-tag fallback. Never inject shadow styles ad hoc.
- **`terminal-shell`** renders in **light DOM** (`createRenderRoot() { return this }`) and is styled by the inline `terminal.css`. It implements the books CLI (`help`, `list`, `book`, …), uses GSAP, `IdentityManager`, batched book listing, and rAF/timer handles that must be cleaned up.
- Theme: two themes, `pinky` and `dark`, applied to the document and persisted in `localStorage("theme")`; `inline-theme.js` boots the theme pre-paint to avoid a flash. Verify both themes when touching head/theme/CSS-token code.

## Helpers (`src/_helpers/`, all browser-side)

- `styleLoader.ts` — shadow CSS adoption (above).
- `animationManager.ts` — WAAPI singleton; one active animation per element (WeakMap), respects reduced motion.
- `sharedPreview.ts` — singleton media-preview overlay (single DOM node reused for image/video hover previews).
- `identityManager.ts` — generates/caches the fake terminal user IDs (PREFIX_SUFFIX style).
- `waitForVisuals.ts` — visual-readiness gating used by the animation manager.

## Content model

- `src/posts/<slug>/index.md` — tag `posts`, layout `post.njk`; permalink computed in `posts.11tydata.js` as `/blog/<year>/<slug>/`. Collection `published` filters drafts (`draft: true`) and future dates.
- `src/notes/*.md` — tag `notes`; collection `notesPublished` (same draft/future filtering). `permalink: false` in `notes.11tydata.js` suppresses individual note pages — notes only render into the notes listing page / modal.
- `src/books/*.md` — tag `books`, layout `books.njk`; frontmatter carries `title/author/id/isbn/...`; `id` links to the ASCII art JSON.
- `src/pages/` — top-level pages with explicit `permalink` frontmatter (Lighthouse CI audits these exact routes — keep them in sync).
- `src/_data/` — `navigation.json`, `books.json`, `personal.json`.
- Collections, filters (`formatYear`, `formatDatefull`), and paired shortcodes (`sectionBlock`, `blogSectionBlock`, `videoContainer`, async `imageContainer` using @11ty/eleventy-img) are registered from `src/_config/`.

## Tests

- `tests/unit/helpers/` + `tests/unit/components/` — Vitest + jsdom (`vitest.config.ts`, setup in `tests/setup/vitest-dom.ts`).
- `tests/unit/content/` — content-shape tests (e.g. frontmatter/permalink locks for audited routes).
- `tests/e2e/` — Playwright smoke tests.
- Tests are typechecked through `tsconfig.tests.json` (covered by `npm run typecheck`).
- Per AGENTS.md: don't add/expand `note-modal` tests (component slated for removal).

## Gotchas checklist

- New inline script/style → follow the CSP capture/hash/buffer pattern in the layout; keep it static.
- `src/_layouts/books.njk` duplicates the CSP machinery from `base.njk` — head changes usually need to land in both.
- Changing a page's `permalink` can break the Lighthouse route list (`.lighthouserc*.json`) and the frontmatter tests.
- Don't edit `dist/` — it's build output.
- Component lifecycle: cleanup in `disconnectedCallback` must mirror setup (listeners, observers, rAF, timers, GSAP handles).
- Dev-server watch doesn't track TS imports: editing only a `src/_helpers/*.ts` file does **not** rebuild the component bundles that import it — `touch` the importing `src/components/*.ts` file (or restart the server) and verify the change actually landed in `dist/` before browser-testing.
- Multiple `<theme-toggle>` instances echo through `setTheme` via the `theme-change` event — any side effect added to the theme path must be idempotent under same-tick repeat calls (see the `pendingTheme` guard in `_helpers/theme.ts`).

# AGENTS.md

Monorepo for t-helaysa.com: `v2-blog/` is the active Eleventy site
(see [v2-blog/AGENTS.md](v2-blog/AGENTS.md) and [v2-blog/CLAUDE.md](v2-blog/CLAUDE.md)),
`thamy-blog/` is the legacy Gatsby site being retired.

## Hard rules

- **Never add AI attribution** in anything written to this repo or GitHub:
  no `Co-Authored-By` trailers, no "Generated with Claude Code" footers,
  no session links — commits, PR bodies, issue bodies, comments included.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (ThamyHelaysa/portfolio),
operated via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles mapped to `status:`-prefixed labels
(e.g. `status:needs-triage`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root,
covering v2-blog (thamy-blog is legacy). See `docs/agents/domain.md`.

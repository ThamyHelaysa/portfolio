# v2-blog

The active portfolio site (Eleventy + Lit web components). Its distinctive feature is a terminal metaphor used to browse content. This glossary fixes the language around that feature.

## Language

**Terminal**:
A cosmetic, web-native command interface rendered in the browser DOM — a curated set of named commands over the site's own content and actions. It is explicitly **not** a shell, REPL, or terminal emulator: it never executes arbitrary user input, only matches typed input against a fixed command registry. This boundary is a deliberate security and simplicity choice.
_Avoid_: shell, console, REPL, emulator, TTY

**Command**:
A named, pre-registered handler the Terminal can run (e.g. `help`, `list`, `open`). Commands form a closed registry; unknown input yields a "not recognized" response rather than execution.
_Avoid_: program, process

**Summon**:
The act of opening the site-wide Terminal overlay from any base-layout page (via `Ctrl/Cmd+Shift+C` or the unlock button). Distinct from the books page, where the Terminal is always present.
_Avoid_: open, launch, invoke

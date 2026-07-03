(function() {
  // Pre-paint reveal of the cheat-console summon button (#80), mirroring the
  // theme boot above: read the unlock flag before first paint so the button is
  // present from the start (no flash, no layout shift). Key must match
  // _helpers/terminal/unlock.ts (this file is inlined raw, not bundled).
  try {
    if (localStorage.getItem("book_os:unlocked") !== null) {
      document.documentElement.classList.add("term-unlocked");
    }
  } catch (e) {
    /* storage blocked (private mode) — the keyboard combo still works */
  }
})();

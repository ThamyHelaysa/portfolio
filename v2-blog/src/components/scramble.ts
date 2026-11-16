import { bindHoverScramble, scrambleIn } from "../_helpers/scramble.ts";

// Entry for base-shell pages: bare `data-scramble` runs once on load,
// `data-scramble="hover"` runs on hover/focus.
document.querySelectorAll<HTMLElement>('[data-scramble=""]').forEach(scrambleIn);
document.querySelectorAll<HTMLElement>('[data-scramble="hover"]').forEach(bindHoverScramble);

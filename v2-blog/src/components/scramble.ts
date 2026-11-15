import { scrambleIn } from "../_helpers/scramble.ts";

// Entry for base-shell pages: run the scramble-in once on every opted-in element.
document.querySelectorAll<HTMLElement>("[data-scramble]").forEach(scrambleIn);

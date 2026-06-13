import { createSummoner } from "../_helpers/terminal/summon.ts";

// Eager, tiny entry script loaded on every base-layout page. The heavy overlay
// bundle is lazy-loaded by the summoner only on the first Ctrl/Cmd+Shift+C.
createSummoner(window);

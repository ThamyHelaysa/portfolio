import type { TocOptions } from "./types.js";

/** Single source for every default the plugin's filters fall back to. */
export const DEFAULT_TOC_OPTIONS: Readonly<TocOptions> = Object.freeze({
  tags: Object.freeze(["h2", "h3", "h4"]),
  ignore: Object.freeze([".header-anchor"]),
  minHeadings: 3,
});

import { DEFAULT_TOC_OPTIONS } from "./defaults.js";
import { countItems, parseHeadings } from "./parse.js";
import { renderToc } from "./render.js";
import type { EleventyConfigLike, TocOptions, TocOptionsInput } from "./types.js";

export { DEFAULT_TOC_OPTIONS } from "./defaults.js";
export type { TocItem, TocOptions, TocOptionsInput } from "./types.js";

/**
 * Merge plugin configuration with a single filter call's overrides.
 *
 * @param pluginOptions - Options supplied during plugin registration.
 * @param callOptions - Options supplied to one filter invocation.
 * @returns Fully resolved TOC options.
 */
/**
 * Accept the shapes a template may pass as per-call options: an options
 * object, a bare number (shorthand for minHeadings), or nothing.
 *
 * @param callOptions - Raw per-call filter argument.
 * @returns Normalized options object.
 */
function normalizeCallOptions(callOptions?: TocOptionsInput | number | null): TocOptionsInput {
  if (typeof callOptions === "number") return { minHeadings: callOptions };
  if (callOptions && typeof callOptions === "object") return callOptions;
  return {};
}

function resolveOptions(pluginOptions: TocOptionsInput, callOptions?: TocOptionsInput | number | null): TocOptions {
  callOptions = normalizeCallOptions(callOptions);
  return {
    tags: callOptions.tags ?? pluginOptions.tags ?? DEFAULT_TOC_OPTIONS.tags,
    ignore: callOptions.ignore ?? pluginOptions.ignore ?? DEFAULT_TOC_OPTIONS.ignore,
    minHeadings: callOptions.minHeadings
      ?? pluginOptions.minHeadings
      ?? DEFAULT_TOC_OPTIONS.minHeadings,
  };
}

/**
 * Register structured-data and plain-markup TOC filters with Eleventy.
 *
 * @param eleventyConfig - Eleventy configuration API.
 * @param pluginOptions - Shared plugin options used by both filters.
 * @returns Nothing.
 */
export default function tocPlugin(
  eleventyConfig: EleventyConfigLike,
  pluginOptions: TocOptionsInput = {}
): void {
  /**
   * Return full Heading tree without applying rendering threshold.
   *
   * @param content - Rendered HTML containing headings.
   * @param callOptions - Per-call parsing overrides.
   * @returns Full Heading tree.
   */
  function tocItemsFilter(content: string, callOptions?: TocOptionsInput | number | null) {
    return parseHeadings(content, resolveOptions(pluginOptions, callOptions));
  }

  /**
   * Render plain fallback TOC with resolved rendering threshold.
   *
   * @param content - Rendered HTML containing headings.
   * @param callOptions - Per-call parsing and threshold overrides.
   * @returns Navigation HTML, or an empty string below threshold.
   */
  function tocFilter(content: string, callOptions?: TocOptionsInput | number | null) {
    return renderToc(content, resolveOptions(pluginOptions, callOptions));
  }

  eleventyConfig.addFilter("tocItems", tocItemsFilter);
  eleventyConfig.addFilter("toc", tocFilter);
  eleventyConfig.addFilter("tocCount", countItems);

  // Templates that render their own TOC (instead of the default `toc`
  // filter) read the same resolved options from this global.
  eleventyConfig.addGlobalData?.("tocConfig", resolveOptions(pluginOptions));
}

import { DEFAULT_TOC_OPTIONS } from "./defaults.js";
import { countItems, parseHeadings } from "./parse.js";
import type { TocItem, TocOptionsInput } from "./types.js";

/**
 * Escape text for safe placement in HTML element content.
 *
 * @param value - Unescaped text.
 * @returns HTML-safe element text.
 */
function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escape a value for safe placement inside a double-quoted HTML attribute.
 *
 * @param value - Unescaped attribute value.
 * @returns HTML-safe attribute value.
 */
function escapeAttribute(value: string): string {
  return escapeText(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Render one ordered-list level of the plain default TOC.
 *
 * @param items - Heading tree nodes for this list level.
 * @returns Nested ordered-list HTML.
 */
function renderList(items: TocItem[]): string {
  let markup = "<ol>";
  for (const item of items) {
    markup += `<li><a href="#${escapeAttribute(item.id)}">${escapeText(item.text)}</a>`;
    if (item.children.length > 0) markup += renderList(item.children);
    markup += "</li>";
  }
  return `${markup}</ol>`;
}

/**
 * Render the plugin's deliberately plain fallback navigation.
 *
 * @param content - Rendered HTML containing linkable headings.
 * @param options - Per-call parsing and threshold overrides.
 * @returns Navigation HTML, or an empty string below the threshold.
 */
export function renderToc(content: string, options: TocOptionsInput = {}): string {
  const minHeadings = options.minHeadings ?? DEFAULT_TOC_OPTIONS.minHeadings;
  const items = parseHeadings(content, options);

  if (countItems(items) < minHeadings) return "";

  return `<nav aria-label="Table of contents">${renderList(items)}</nav>`;
}

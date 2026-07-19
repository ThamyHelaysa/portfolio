import { DEFAULT_TOC_OPTIONS } from "./defaults.js";
import { countItems, parseHeadings } from "./parse.js";
import type { TocInput, TocItem, TocOptionsInput } from "./types.js";

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
 * Check that an unknown array contains complete Heading-tree nodes.
 *
 * @param value - Potential Heading tree supplied at runtime.
 * @returns Whether the value is safe for counting and rendering.
 */
function isHeadingTree(value: unknown): value is readonly TocItem[] {
  if (!Array.isArray(value)) return false;

  return value.every((item: unknown) => {
    if (!item || typeof item !== "object") return false;

    const candidate = item as Partial<TocItem>;
    return typeof candidate.id === "string"
      && typeof candidate.text === "string"
      && Number.isInteger(candidate.level)
      && isHeadingTree(candidate.children);
  });
}

/**
 * Render one ordered-list level of the plain default TOC.
 *
 * @param items - Heading tree nodes for this list level.
 * @returns Nested ordered-list HTML.
 */
function renderList(items: readonly TocItem[]): string {
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
 * @param content - Rendered HTML or a pre-built Heading tree.
 * @param options - Per-call parsing and threshold overrides.
 * @returns Navigation HTML, or an empty string below the threshold.
 */
export function renderToc(content: TocInput, options: TocOptionsInput = {}): string {
  const minHeadings = options.minHeadings ?? DEFAULT_TOC_OPTIONS.minHeadings;
  let items: readonly TocItem[];

  if (Array.isArray(content)) {
    items = isHeadingTree(content) ? content : [];
  } else {
    items = parseHeadings(content as string, options);
  }

  if (countItems(items) < minHeadings) return "";

  return `<nav aria-label="Table of contents">${renderList(items)}</nav>`;
}

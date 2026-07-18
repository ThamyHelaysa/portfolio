import { parse } from "node-html-parser";

import { DEFAULT_TOC_OPTIONS } from "./defaults.js";
import type { TocItem, TocOptionsInput } from "./types.js";

/**
 * Convert a heading tag name such as `h2` to its numeric outline level.
 *
 * @param tagName - HTML heading tag name.
 * @returns Numeric heading level.
 */
function headingLevel(tagName: string): number {
  return Number.parseInt(tagName.slice(1), 10);
}

/**
 * Remove descendants whose text is excluded from the visible heading title.
 *
 * @param heading - Parsed heading element to clean.
 * @param selectors - CSS selectors matching descendants to remove.
 * @returns Nothing.
 */
function removeIgnoredContent(
  heading: ReturnType<typeof parse>,
  selectors: readonly string[]
): void {
  for (const selector of selectors) {
    for (const ignoredNode of heading.querySelectorAll(selector)) {
      ignoredNode.remove();
    }
  }
}

/**
 * Normalize HTML layout whitespace into the single-spaced title users see.
 *
 * @param heading - Parsed heading element.
 * @returns Visible, whitespace-normalized heading text.
 */
function visibleText(heading: ReturnType<typeof parse>): string {
  return heading.textContent.replace(/\s+/g, " ").trim();
}

/**
 * Count every node in a Heading tree, including nested descendants.
 *
 * @param items - Heading tree nodes to count; non-arrays count as zero.
 * @returns Total number of nodes.
 */
export function countItems(items: readonly TocItem[] | unknown): number {
  if (!Array.isArray(items)) return 0;
  let count = 0;
  for (const item of items as TocItem[]) {
    count += 1 + countItems(item.children);
  }
  return count;
}

/**
 * Parse rendered HTML into a Heading tree using the ids already emitted by the
 * consumer's markdown pipeline.
 *
 * @param content - Rendered HTML containing linkable headings.
 * @param options - Per-call tag and ignore-selector overrides.
 * @returns Nested Heading tree in document order.
 */
export function parseHeadings(content: string, options: TocOptionsInput = {}): TocItem[] {
  const tags = options.tags ?? DEFAULT_TOC_OPTIONS.tags;
  const ignore = options.ignore ?? DEFAULT_TOC_OPTIONS.ignore;

  if (typeof content !== "string" || content.length === 0 || tags.length === 0) return [];

  const document = parse(content);
  const roots: TocItem[] = [];
  const ancestors: TocItem[] = [];

  for (const heading of document.querySelectorAll(tags.join(","))) {
    const id = heading.getAttribute("id");
    if (!id) continue;

    removeIgnoredContent(heading, ignore);

    const item: TocItem = {
      id,
      text: visibleText(heading),
      level: headingLevel(heading.rawTagName.toLowerCase()),
      children: [],
    };

    while (ancestors.length > 0 && ancestors[ancestors.length - 1].level >= item.level) {
      ancestors.pop();
    }

    const parent = ancestors[ancestors.length - 1];
    if (parent) {
      parent.children.push(item);
    } else {
      roots.push(item);
    }
    ancestors.push(item);
  }

  return roots;
}

import path from "node:path";

// @ts-expect-error nunjucks ships no types; runtime-only use in this test.
import nunjucks from "nunjucks";
import { describe, expect, it } from "vitest";

import { countItems, parseHeadings } from "../../../../src/_config/toc/parse.js";

const includesDir = path.resolve(process.cwd(), "src/_includes");

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(includesDir), {
  autoescape: false,
});
env.addFilter("tocCount", countItems);

const template = '{% from "macros/toc.njk" import toc %}{{ toc(items, minHeadings) }}';

function renderMacro(html: string, minHeadings?: number): string {
  const items = parseHeadings(html);
  return env.renderString(template, { items, minHeadings });
}

const threeHeadings =
  '<h2 id="one">One</h2><h3 id="one-a">One A</h3><h2 id="two">Two</h2>';

describe("toc macro", () => {
  it("renders the collapsible TOC when the Heading tree meets the minimum", () => {
    const output = renderMacro(threeHeadings, 3);

    expect(output).toContain('<details class="post-toc">');
    expect(output).toContain('<nav aria-label="Table of contents">');
    expect(output).toContain('href="#one-a"');
  });

  it("renders nothing below the minimum", () => {
    expect(renderMacro(threeHeadings, 4).trim()).toBe("");
  });

  it("stays visible when minHeadings is missing instead of silently vanishing", () => {
    expect(renderMacro(threeHeadings)).toContain('<details class="post-toc">');
  });
});

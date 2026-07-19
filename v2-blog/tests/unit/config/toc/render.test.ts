import { describe, expect, it } from "vitest";

import { renderToc } from "../../../../src/_config/toc/render.js";

const content = `
  <h2 id="first">First</h2>
  <h3 id="child">Child &amp; more</h3>
  <h2 id="last">Last</h2>
`;

describe("renderToc", () => {
  it("renders plain nested navigation markup by default", () => {
    const output = renderToc(content);

    expect(output).toContain('<nav aria-label="Table of contents">');
    expect(output).toContain('<a href="#first">First</a><ol><li><a href="#child">Child &amp; more</a>');
    expect(output).toContain('<a href="#last">Last</a>');
  });

  it("returns no markup below the configured heading threshold", () => {
    expect(renderToc('<h2 id="one">One</h2><h2 id="two">Two</h2>')).toBe("");
  });

  it("honors a per-call minHeadings override", () => {
    expect(renderToc(content, { minHeadings: 5 })).toBe("");
  });

  it("escapes text and ids in the default markup", () => {
    const unsafe = '<h2 id="a&quot;b">&lt;One&gt;</h2><h2 id="two">Two</h2><h2 id="three">Three</h2>';

    expect(renderToc(unsafe)).toContain('href="#a&quot;b">&lt;One&gt;</a>');
  });
});

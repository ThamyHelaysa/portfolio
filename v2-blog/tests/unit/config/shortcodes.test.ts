import { describe, expect, it } from "vitest";

import shortcodes from "../../../src/_config/shortcodes.js";
import { parseHeadings } from "../../../src/_config/toc/parse.js";

describe("section shortcode headings", () => {
  it.each([
    {
      name: "sectionBlock",
      level: 2,
      render: () => shortcodes.sectionBlock("Body", 'Café & "Sugar"', "Subtitle"),
    },
    {
      name: "blogSectionBlock",
      level: 3,
      render: () => shortcodes.blogSectionBlock("Excerpt", "/post/", 'Café & "Sugar"', "2026", [], 1),
    },
  ])("gives $name a markdown-compatible anchor", ({ level, render }) => {
    const html = render();

    expect(html).toContain(`<h${level} id="cafe-and-sugar"`);
    expect(parseHeadings(html)).toMatchObject([
      { id: "cafe-and-sugar", level },
    ]);
  });
});

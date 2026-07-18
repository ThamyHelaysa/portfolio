import { describe, expect, it } from "vitest";

import { parseHeadings } from "../../../../src/_config/toc/parse.js";

describe("parseHeadings", () => {
  it("builds a nested Heading tree", () => {
    const html = `
      <h2 id="one">One</h2>
      <h3 id="one-a">One A</h3>
      <h4 id="one-a-i">One A I</h4>
      <h3 id="one-b">One B</h3>
      <h2 id="two">Two</h2>
    `;

    expect(parseHeadings(html)).toEqual([
      {
        id: "one",
        text: "One",
        level: 2,
        children: [
          {
            id: "one-a",
            text: "One A",
            level: 3,
            children: [
              { id: "one-a-i", text: "One A I", level: 4, children: [] },
            ],
          },
          { id: "one-b", text: "One B", level: 3, children: [] },
        ],
      },
      { id: "two", text: "Two", level: 2, children: [] },
    ]);
  });

  it("nests a skipped level under the nearest shallower heading", () => {
    expect(parseHeadings('<h2 id="two">Two</h2><h4 id="four">Four</h4>')).toEqual([
      {
        id: "two",
        text: "Two",
        level: 2,
        children: [
          { id: "four", text: "Four", level: 4, children: [] },
        ],
      },
    ]);
  });

  it("keeps a heading before the first h2 at the root", () => {
    expect(parseHeadings('<h3 id="early">Early</h3><h2 id="later">Later</h2>')).toEqual([
      { id: "early", text: "Early", level: 3, children: [] },
      { id: "later", text: "Later", level: 2, children: [] },
    ]);
  });

  it("uses the deduplicated ids from rendered HTML", () => {
    expect(parseHeadings('<h2 id="foo">Foo</h2><h2 id="foo-1">Foo</h2>')).toMatchObject([
      { id: "foo" },
      { id: "foo-1" },
    ]);
  });

  it("removes ignored anchor content from heading text", () => {
    const html = `
      <h2 id="clean">
        Clean title
        <a class="header-anchor" href="#clean">#<span class="visually-hidden">Direct link to Clean title</span></a>
      </h2>
    `;

    expect(parseHeadings(html)[0]?.text).toBe("Clean title");
  });

  it("preserves visible inline code text", () => {
    expect(parseHeadings('<h2 id="code">Use <code>npm install</code> safely</h2>')[0]?.text)
      .toBe("Use npm install safely");
  });

  it("returns an empty tree for empty content", () => {
    expect(parseHeadings("")).toEqual([]);
  });

  it("returns an empty tree for non-string content instead of throwing", () => {
    expect(parseHeadings(undefined as unknown as string)).toEqual([]);
    expect(parseHeadings(null as unknown as string)).toEqual([]);
    expect(parseHeadings(42 as unknown as string)).toEqual([]);
  });

  it("skips a heading without an id", () => {
    expect(parseHeadings('<h2>No anchor</h2><h2 id="linked">Linked</h2>')).toEqual([
      { id: "linked", text: "Linked", level: 2, children: [] },
    ]);
  });

  it("honors custom tags and ignore selectors", () => {
    const html = '<h1 id="one">One <span data-ignore>hidden</span></h1><h2 id="two">Two</h2>';

    expect(parseHeadings(html, { tags: ["h1"], ignore: ["[data-ignore]"] })).toEqual([
      { id: "one", text: "One", level: 1, children: [] },
    ]);
  });
});

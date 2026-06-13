import { describe, expect, it } from "vitest";

import { filterSection, matchEntry, parseSiteIndex } from "../../../../src/_helpers/terminal/site-index.ts";

const ENTRIES = parseSiteIndex([
  { section: "posts", title: "Why I never heard of Lit", url: "/blog/2025/why-i-never-heard-of-lit/" },
  { section: "posts", title: "Using ngrok to test some web things", url: "/blog/2025/using-ngrok-to-test-some-web-things/" },
  { section: "posts", title: "Test driven fun", url: "/blog/2025/test-driven-fun/" },
  { section: "books", title: "Ring", url: "/books/ring/" },
  { section: "books", title: "A Seca", url: "/books/a-seca/" },
  { section: "pages", title: "About", url: "/about/" },
]);

describe("parseSiteIndex", () => {
  it("keeps well-formed entries", () => {
    const entries = parseSiteIndex([
      { section: "posts", title: "Why I never heard of Lit", url: "/blog/2025/why-i-never-heard-of-lit/" },
      { section: "books", title: "Ring", url: "/books/ring/" },
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ section: "posts", title: "Why I never heard of Lit", url: "/blog/2025/why-i-never-heard-of-lit/" });
  });

  it("drops entries missing a url or title, and ignores non-array input", () => {
    const entries = parseSiteIndex([
      { section: "books", title: "Ring", url: "/books/ring/" },
      { section: "posts", title: "No url" },
      { section: "posts", url: "/blog/x/" },
      null,
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("Ring");
    expect(parseSiteIndex("nope")).toEqual([]);
    expect(parseSiteIndex(null)).toEqual([]);
  });

  it("ignores unknown extra fields without breaking (forward-compatible)", () => {
    const entries = parseSiteIndex([
      { section: "posts", title: "T", url: "/blog/x/", description: "future search field", weight: 5 },
    ]);

    expect(entries[0]).toMatchObject({ section: "posts", title: "T", url: "/blog/x/" });
  });
});

describe("matchEntry", () => {
  it("matches an exact url slug", () => {
    const result = matchEntry(ENTRIES, "ring");
    expect(result.kind).toBe("match");
    if (result.kind === "match") expect(result.entry.url).toBe("/books/ring/");
  });

  it("matches a single partial (slug or title), case-insensitively", () => {
    const bySlug = matchEntry(ENTRIES, "NGROK");
    expect(bySlug.kind).toBe("match");
    if (bySlug.kind === "match") expect(bySlug.entry.url).toBe("/blog/2025/using-ngrok-to-test-some-web-things/");

    const byTitle = matchEntry(ENTRIES, "seca");
    expect(byTitle.kind).toBe("match");
    if (byTitle.kind === "match") expect(byTitle.entry.url).toBe("/books/a-seca/");
  });

  it("reports ambiguity when several entries partially match", () => {
    const result = matchEntry(ENTRIES, "test");
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") expect(result.entries.length).toBe(2);
  });

  it("reports none when nothing matches or the query is empty", () => {
    expect(matchEntry(ENTRIES, "zzzznope").kind).toBe("none");
    expect(matchEntry(ENTRIES, "   ").kind).toBe("none");
  });
});

describe("filterSection", () => {
  it("returns all entries when no section is given", () => {
    expect(filterSection(ENTRIES)).toHaveLength(ENTRIES.length);
  });

  it("returns only the requested section, case-insensitively", () => {
    const books = filterSection(ENTRIES, "BOOKS");
    expect(books.length).toBe(2);
    expect(books.every((e) => e.section === "books")).toBe(true);
  });

  it("returns empty for an unknown section", () => {
    expect(filterSection(ENTRIES, "widgets")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import { buildTree, findNode, matchEntry, parseSiteIndex, renderRootListing, renderSubtree } from "../../../../src/_helpers/terminal/site-index.ts";

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

  it("keeps description and ignores other unknown fields (forward-compatible)", () => {
    const entries = parseSiteIndex([
      { section: "posts", title: "T", url: "/blog/x/", description: "a summary", weight: 5 },
    ]);

    expect(entries[0]).toMatchObject({ section: "posts", title: "T", url: "/blog/x/", description: "a summary" });
    expect(entries[0]).not.toHaveProperty("weight");
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

describe("buildTree", () => {
  it("groups entries into a tree by URL path segments", () => {
    const root = buildTree(ENTRIES);

    const blog = root.children.find((n) => n.name === "blog");
    expect(blog).toBeDefined();
    expect(blog!.children.find((n) => n.name === "2025")).toBeDefined();

    const books = root.children.find((n) => n.name === "books");
    expect(books!.children.map((n) => n.name).sort()).toEqual(["a-seca", "ring"]);

    const about = root.children.find((n) => n.name === "about");
    expect(about!.children).toHaveLength(0);
  });
});

describe("buildTree counts", () => {
  it("sets each folder's count to its descendant leaf pages, recursively", () => {
    const root = buildTree(ENTRIES);
    const find = (name: string) => root.children.find((n) => n.name === name)!;

    expect(find("blog").count).toBe(3);
    expect(find("blog").children.find((n) => n.name === "2025")!.count).toBe(3);
    expect(find("books").count).toBe(2);
    expect(find("about").count).toBe(0);
  });
});

describe("buildTree home + findNode", () => {
  it("places the home page (url '/') as a root leaf named 'home'", () => {
    const root = buildTree(parseSiteIndex([{ section: "pages", title: "Home", url: "/" }]));
    const home = root.children.find((n) => n.name === "home");
    expect(home).toBeDefined();
    expect(home!.url).toBe("/");
    expect(home!.children).toHaveLength(0);
  });
});

describe("findNode", () => {
  it("finds a top-level folder and a nested leaf by name, case-insensitively", () => {
    const root = buildTree(ENTRIES);

    const blog = findNode(root, "blog");
    expect(blog?.name).toBe("blog");
    expect(blog!.children.length).toBeGreaterThan(0);

    const ring = findNode(root, "RING");
    expect(ring?.name).toBe("ring");
    expect(ring!.url).toBe("/books/ring/");

    expect(findNode(root, "nope")).toBeUndefined();
  });

  it("resolves a slash-separated path by walking segments from the root", () => {
    const root = buildTree(ENTRIES);

    const year = findNode(root, "blog/2025");
    expect(year?.name).toBe("2025");
    expect(year!.count).toBe(3);

    const leaf = findNode(root, "books/ring");
    expect(leaf?.url).toBe("/books/ring/");

    // a wrong path segment fails cleanly
    expect(findNode(root, "blog/1999")).toBeUndefined();
  });
});

describe("renderRootListing", () => {
  it("lists folders (slash + count) before leaf pages (plain)", () => {
    const lines = renderRootListing(buildTree(ENTRIES));

    const blogLine = lines.find((l) => l.startsWith("blog/"));
    expect(blogLine).toBeDefined();
    expect(blogLine).toMatch(/3/);

    const booksLine = lines.find((l) => l.startsWith("books/"));
    expect(booksLine).toMatch(/2/);

    // leaf page: plain name, no slash, no count
    expect(lines).toContain("about");

    // folders come before leaves
    expect(lines.findIndex((l) => l.startsWith("blog/"))).toBeLessThan(lines.indexOf("about"));
  });
});

describe("renderSubtree", () => {
  it("renders a tree with connectors, sub-folder counts, and slug leaves", () => {
    const lines = renderSubtree(findNode(buildTree(ENTRIES), "blog")!);
    const joined = lines.join("\n");

    expect(lines[0]).toMatch(/^blog/);
    expect(joined).toContain("└── 2025");        // sole child uses the corner connector
    expect(joined).toMatch(/2025\/?\s+3/);        // year folder shows its count
    expect(joined).toContain("├── ");             // a non-last leaf uses the tee connector
    expect(joined).toContain("why-i-never-heard-of-lit");
    expect(lines.some((l) => l.includes("└── test-driven-fun"))).toBe(true); // last leaf, corner
  });
});

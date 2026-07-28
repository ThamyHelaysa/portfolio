/// <reference types="node" />

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import matter from "@11ty/gray-matter";
import { describe, expect, it } from "vitest";

/**
 * Reads a source file from the repository using an absolute path rooted at `v2-blog`.
 *
 * @param relativePath - The repository-relative path to the file.
 * @returns The file contents as UTF-8 text.
 */
function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("page frontmatter", () => {
  it("keeps the Lighthouse audited routes aligned with explicit page permalinks", () => {
    const expectedRoutes = [
      { file: "src/pages/index.njk", permalink: "/" },
      { file: "src/pages/about.njk", permalink: "/about/" },
      { file: "src/pages/blog.njk", permalink: "/blog/" },
      { file: "src/pages/notes.njk", permalink: "/notes/" },
      { file: "src/pages/games.njk", permalink: "/games-that-i-may-or-may-not-play/" },
      { file: "src/pages/copyright.md", permalink: "/copyrighty/" },
    ];

    for (const page of expectedRoutes) {
      const { data } = matter(readRepoFile(page.file));

      expect(
        data.permalink,
        `${page.file} should keep permalink ${page.permalink}`,
      ).toBe(page.permalink);
    }
  });
});

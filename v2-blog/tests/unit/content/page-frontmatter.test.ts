/// <reference types="node" />

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

/**
 * Extracts a simple scalar frontmatter field from an Eleventy template file.
 *
 * @param source - The full file contents including frontmatter.
 * @param field - The frontmatter key to match.
 * @returns The trimmed scalar value when present, otherwise `null`.
 */
function getFrontmatterField(source: string, field: string): string | null {
  const match = source.match(
    new RegExp(`^${field}:\\s*(.+)$`, "m"),
  );

  return match?.[1]?.trim() ?? null;
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
      const source = readRepoFile(page.file);

      expect(
        getFrontmatterField(source, "permalink"),
        `${page.file} should keep permalink ${page.permalink}`,
      ).toBe(page.permalink);
    }
  });
});

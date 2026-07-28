/// <reference types="node" />

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const GAME_LOG_DIRECTORY = resolve(process.cwd(), "src/games");
const GAME_LOG_FIELDS = [
  "title",
  "platform",
  "yearPlayed",
  "status",
  "mood",
  "previewUrl",
  "previewType",
  "coverUrl",
] as const;
const MOODS = ["loved", "rage", "nostalgia", "masochism", "meh"] as const;
const STATUSES = ["finished", "dropped", "replaying", "shelved"] as const;

/**
 * Lists the markdown file names that make up the Game log.
 *
 * @returns Game log markdown file names.
 */
function gameLogFiles(): string[] {
  return readdirSync(GAME_LOG_DIRECTORY)
    .filter((fileName) => fileName.endsWith(".md"));
}

/**
 * Reads scalar YAML frontmatter fields from a Game log markdown entry.
 *
 * @param filePath - Absolute path to the markdown entry.
 * @returns A map of frontmatter field names to unquoted scalar values.
 */
function readFrontmatter(filePath: string): Record<string, string> {
  const source = readFileSync(filePath, "utf8");
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatter?.[1]) return {};

  return Object.fromEntries(
    frontmatter[1].split(/\r?\n/).flatMap((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) return [];

      const key = line.slice(0, separator).trim();
      const value = line
        .slice(separator + 1)
        .trim()
        .replace(/^(['"])(.*)\1$/, "$2");

      return [[key, value]];
    }),
  );
}

/**
 * Reads the markdown body from a Game log entry.
 *
 * @param filePath - Absolute path to the markdown entry.
 * @returns The trimmed freeform prose after the frontmatter block.
 */
function readBody(filePath: string): string {
  const source = readFileSync(filePath, "utf8");
  const body = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);

  return body?.[1]?.trim() ?? "";
}

describe("Game log content", () => {
  it("uses the approved frontmatter shape and closed enums", () => {
    const gameFiles = gameLogFiles();

    expect(gameFiles.length, "the Game log should ship at least one entry")
      .toBeGreaterThan(0);

    for (const fileName of gameFiles) {
      const frontmatter = readFrontmatter(
        resolve(GAME_LOG_DIRECTORY, fileName),
      );

      for (const field of GAME_LOG_FIELDS) {
        expect(
          Object.hasOwn(frontmatter, field),
          `${fileName} should define ${field}`,
        ).toBe(true);
      }

      expect(MOODS, `${fileName} should use a valid Mood`)
        .toContain(frontmatter.mood);
      expect(STATUSES, `${fileName} should use a valid status`)
        .toContain(frontmatter.status);
    }
  });

  it("keeps freeform prose in every entry body", () => {
    const gameFiles = gameLogFiles();

    for (const fileName of gameFiles) {
      expect(
        readBody(resolve(GAME_LOG_DIRECTORY, fileName)),
        `${fileName} should include body prose`,
      ).not.toBe("");
    }
  });
});

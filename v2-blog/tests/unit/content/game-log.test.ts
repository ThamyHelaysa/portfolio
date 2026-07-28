/// <reference types="node" />

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import matter from "gray-matter";
import { describe, expect, it } from "vitest";

import gameLog from "../../../src/_data/gameLog.js";

const GAME_LOG_DIRECTORY = resolve(process.cwd(), "src/games");
const REQUIRED_GAME_LOG_FIELDS = [
  "title",
  "platform",
  "yearPlayed",
  "status",
  "mood",
  "previewUrl",
  "previewType",
] as const;
const OPTIONAL_GAME_LOG_FIELDS = ["coverUrl"] as const;
const MOODS = gameLog.moods.map(({ value }) => value);
const STATUSES = gameLog.statuses;

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
 * Parses a Game log entry with the same frontmatter parser Eleventy uses.
 *
 * @param filePath - Absolute path to the markdown entry.
 * @returns Parsed frontmatter data and markdown body.
 */
function parseGameEntry(filePath: string): matter.GrayMatterFile<string> {
  return matter(readFileSync(filePath, "utf8"));
}

describe("Game log content", () => {
  it("matches Eleventy's YAML parsing semantics", () => {
    const fixtures = resolve(process.cwd(), "tests/fixtures/game-log");

    expect(
      parseGameEntry(resolve(fixtures, "valid-inline-comment.md")).data.mood,
    ).toBe("loved");
    expect(() => {
      parseGameEntry(resolve(fixtures, "invalid-unquoted-colon.md"));
    }).toThrow();
  });

  it("uses the approved content shape, closed enums, and body prose", () => {
    const gameFiles = gameLogFiles();

    expect(gameFiles.length, "the Game log should ship at least one entry")
      .toBeGreaterThan(0);

    for (const fileName of gameFiles) {
      const { content, data } = parseGameEntry(
        resolve(GAME_LOG_DIRECTORY, fileName),
      );

      for (const field of REQUIRED_GAME_LOG_FIELDS) {
        expect(
          Object.hasOwn(data, field),
          `${fileName} should define ${field}`,
        ).toBe(true);
      }

      for (const field of OPTIONAL_GAME_LOG_FIELDS) {
        if (!Object.hasOwn(data, field)) continue;

        expect(data[field], `${fileName} should define a usable ${field}`)
          .toBeTypeOf("string");
        expect(data[field], `${fileName} should define a usable ${field}`)
          .not.toBe("");
      }

      expect(MOODS, `${fileName} should use a valid Mood`)
        .toContain(data.mood);
      expect(STATUSES, `${fileName} should use a valid status`)
        .toContain(data.status);
      expect(
        content.trim(),
        `${fileName} should include body prose`,
      ).not.toBe("");
    }
  });
});

import { randomUUID } from "node:crypto";
import { readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface FavoriteOccupant {
  title: string;
  details: string;
  previewUrl: string;
  previewType: "image";
  coverUrl?: string;
}

export interface FavoriteRecord {
  id: string;
  kind: string;
  category: string;
  title: string;
  details: string;
  previewUrl: string;
  previewType: string;
  coverUrl?: string;
}

interface PersonalData {
  favorites: FavoriteRecord[];
  [key: string]: unknown;
}

/**
 * Converts a Favorite title into a filesystem-safe asset slug.
 */
export function slugFavoriteAsset(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Atomically replaces occupant fields while preserving a Favorite slot's identity and display copy.
 */
export async function replaceFavoriteOccupant(
  dataPath: string,
  slotId: string,
  occupant: FavoriteOccupant,
): Promise<FavoriteRecord> {
  const data = JSON.parse(await readFile(dataPath, "utf8")) as PersonalData;
  if (!Array.isArray(data.favorites)) {
    throw new Error(`Favorite data has no favorites array: ${dataPath}`);
  }

  const favoriteIndex = data.favorites.findIndex(({ id }) => id === slotId);
  if (favoriteIndex === -1) {
    throw new Error(`Unknown Favorite slot: ${slotId}`);
  }

  const previousOccupant = data.favorites[favoriteIndex];
  const nextFavorite = { ...previousOccupant, ...occupant };
  if (occupant.coverUrl === undefined) {
    delete nextFavorite.coverUrl;
  }
  data.favorites[favoriteIndex] = nextFavorite;

  const temporaryPath = `${dataPath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`);
    await rename(temporaryPath, dataPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }

  return previousOccupant;
}

/**
 * Collects regular files below a directory without following symbolic links.
 */
async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

/**
 * Returns source-relative paths whose contents reference an asset path.
 */
export async function findSourceReferences(
  sourceRoot: string,
  assetUrl: string,
): Promise<string[]> {
  const files = await collectSourceFiles(sourceRoot);
  const needle = Buffer.from(assetUrl.replace(/^\/+/, ""));
  const references: string[] = [];

  for (const filePath of files) {
    const contents = await readFile(filePath);
    if (contents.includes(needle)) {
      references.push(path.relative(sourceRoot, filePath).split(path.sep).join("/"));
    }
  }

  return references.sort();
}

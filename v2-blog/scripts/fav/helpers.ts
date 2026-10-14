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

export interface FavoriteSlot {
  data: PersonalData;
  favorite: FavoriteRecord;
  originalContents: string;
}

/**
 * Reads and validates one fixed Favorite slot before media work starts.
 */
export async function readFavoriteSlot(
  dataPath: string,
  slotId: string,
): Promise<FavoriteSlot> {
  const originalContents = await readFile(dataPath, "utf8");
  const data = JSON.parse(originalContents) as PersonalData;
  if (!Array.isArray(data.favorites)) {
    throw new Error(`Favorite data has no favorites array: ${dataPath}`);
  }

  const favorite = data.favorites.find(({ id }) => id === slotId);
  if (!favorite) {
    throw new Error(`Unknown Favorite slot: ${slotId}`);
  }
  if (favorite.previewType !== "image") {
    throw new Error(
      `Favorite slot "${slotId}" is not supported yet; see #149.`,
    );
  }

  return { data, favorite, originalContents };
}

/**
 * Atomically replaces a validated occupant while preserving slot identity and display copy.
 */
export async function replaceFavoriteOccupant(
  dataPath: string,
  slot: FavoriteSlot,
  occupant: FavoriteOccupant,
): Promise<FavoriteRecord> {
  const currentOccupant = slot.favorite;
  const nextFavorite: FavoriteRecord = { ...currentOccupant, ...occupant };
  if (occupant.coverUrl === undefined) {
    delete nextFavorite.coverUrl;
  }
  const nextData = {
    ...slot.data,
    favorites: slot.data.favorites.map((favorite) =>
      favorite === currentOccupant ? nextFavorite : favorite,
    ),
  };

  const temporaryPath = `${dataPath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(nextData, null, 2)}\n`);
    // shortcut: edits between this check and rename may be lost, add locking for concurrent writers.
    if ((await readFile(dataPath, "utf8")) !== slot.originalContents) {
      throw new Error("Favorite data changed during selection; run fav again.");
    }
    await rename(temporaryPath, dataPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }

  return { ...currentOccupant };
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

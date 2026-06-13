/** Built URL of the site index manifest. */
const SITE_INDEX_URL = "/assets/site-index.json";

/** Per-page-load cache of the fetched, parsed index. */
let cachedIndex: Promise<SiteIndexEntry[]> | undefined;

/** A navigable entry in the site index (one page of content). */
export interface SiteIndexEntry {
  section: "posts" | "books" | "pages";
  title: string;
  url: string;
  date?: string;
}

/** The outcome of resolving an `open <query>` against the index. */
export type MatchResult =
  | { kind: "match"; entry: SiteIndexEntry }
  | { kind: "ambiguous"; entries: SiteIndexEntry[] }
  | { kind: "none" };

/** Extracts the slug (last non-empty path segment) from a URL. */
function slugOf(url: string): string {
  return url.split("/").filter(Boolean).pop() ?? "";
}

/**
 * Resolves an `open` query against the index: an exact slug wins; otherwise a
 * single partial (slug or title) match wins; multiple are ambiguous.
 *
 * @param entries - The site index.
 * @param query - The user's `open` argument.
 * @returns A match, an ambiguous set, or none.
 */
export function matchEntry(entries: SiteIndexEntry[], query: string): MatchResult {
  const q = query.trim().toLowerCase();
  if (!q) return { kind: "none" };

  const exact = entries.find((e) => slugOf(e.url).toLowerCase() === q);
  if (exact) return { kind: "match", entry: exact };

  const partial = entries.filter(
    (e) => slugOf(e.url).toLowerCase().includes(q) || e.title.toLowerCase().includes(q)
  );

  if (partial.length === 1) return { kind: "match", entry: partial[0] };
  if (partial.length > 1) return { kind: "ambiguous", entries: partial };
  return { kind: "none" };
}

/**
 * Lazily fetches and parses the site index, caching it for the page load.
 * Coalesces concurrent calls; a failed fetch resolves to `[]` and is retryable.
 *
 * @returns A promise of the parsed site index entries.
 */
export function fetchSiteIndex(): Promise<SiteIndexEntry[]> {
  if (!cachedIndex) {
    cachedIndex = fetch(SITE_INDEX_URL, { cache: "force-cache" })
      .then((res) => (res.ok ? res.json() : []))
      .then(parseSiteIndex)
      .catch(() => {
        cachedIndex = undefined;
        return [];
      });
  }
  return cachedIndex;
}

/**
 * Filters the index by section for the `ls` / `list <section>` command.
 *
 * @param entries - The site index.
 * @param section - Optional section name (case-insensitive); omitted returns all.
 * @returns The matching entries (empty for an unknown section).
 */
export function filterSection(entries: SiteIndexEntry[], section?: string): SiteIndexEntry[] {
  if (!section) return entries;
  const s = section.trim().toLowerCase();
  return entries.filter((e) => e.section === s);
}

/**
 * Normalizes the fetched site-index payload into well-formed entries.
 * Tolerates extra fields (forward-compatible with future search metadata).
 *
 * @param raw - The parsed JSON payload.
 * @returns The valid entries; malformed input yields an empty array.
 */
export function parseSiteIndex(raw: unknown): SiteIndexEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> =>
      !!item && typeof item.title === "string" && typeof item.url === "string")
    .map((item) => ({
      section: item.section as SiteIndexEntry["section"],
      title: item.title as string,
      url: item.url as string,
      date: typeof item.date === "string" ? item.date : undefined,
    }));
}

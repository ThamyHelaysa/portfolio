import type { Block, Cell } from "./blocks.ts";

/** Built URL of the site index manifest. */
const SITE_INDEX_URL = "/assets/site-index.json";

/** Per-page-load cache of the fetched, parsed index. */
let cachedIndex: Promise<SiteIndexEntry[]> | undefined;

/** A navigable entry in the site index (one page of content). */
export interface SiteIndexEntry {
  section: "blog" | "books" | "pages";
  title: string;
  url: string;
  date?: string;
  description?: string;
}

/**
 * A node in the URL-derived site tree. Folders have children; leaves don't.
 * `url`/`title`/`description` are present when a page exists at this exact path
 * (intermediate path segments like a year folder have children but no page).
 */
export interface TreeNode {
  name: string;
  children: TreeNode[];
  count: number;
  url?: string;
  title?: string;
  description?: string;
}

/**
 * Builds a tree from index entries, keyed on URL path segments. Each entry's
 * path becomes a chain of folder nodes ending in a node carrying its page data.
 *
 * @param entries - The site index.
 * @returns The synthetic root node whose children are the top level.
 */
export function buildTree(entries: SiteIndexEntry[]): TreeNode {
  const root: TreeNode = { name: ".", children: [], count: 0 };

  for (const entry of entries) {
    const segments = entry.url.split("/").filter(Boolean);
    const path = segments.length ? segments : ["home"];

    let node = root;
    for (const segment of path) {
      let child = node.children.find((c) => c.name === segment);
      if (!child) {
        child = { name: segment, children: [], count: 0 };
        node.children.push(child);
      }
      node = child;
    }

    node.url = entry.url;
    node.title = entry.title;
    node.description = entry.description;
  }

  assignCounts(root);
  return root;
}

/**
 * Assigns each folder node its count of descendant leaf pages (recursive).
 * Leaves get a count of 0.
 *
 * @param node - The node to count from.
 * @returns The number of leaf descendants contributed by `node`.
 */
function assignCounts(node: TreeNode): number {
  if (node.children.length === 0) {
    node.count = 0;
    return 1;
  }
  let sum = 0;
  for (const child of node.children) sum += assignCounts(child);
  node.count = sum;
  return sum;
}

/** Whether a node is a folder (has children). */
function isFolder(node: TreeNode): boolean {
  return node.children.length > 0;
}

/**
 * Renders the top level of the tree for a bare `ls`: folders first
 * (`name/   count`), then leaf pages (plain name).
 *
 * @param root - The tree root.
 * @returns The lines to print.
 */
export function renderRootListing(root: TreeNode): string[] {
  const folders = root.children.filter(isFolder);
  const leaves = root.children.filter((n) => !isFolder(n));

  return [
    ...folders.map((f) => `${f.name}/   ${f.count}`),
    ...leaves.map((l) => l.name),
  ];
}

/**
 * Builds the bare-`ls` listing as a structured block: a tinted section wrapping
 * a two-column grid — folders (`name/` + a muted, right-aligned count) first,
 * then leaf pages. Lets the terminal render aligned columns instead of flat text.
 *
 * @param root - The tree root.
 * @returns A section block for {@link TerminalCore.render}.
 */
export function rootListingBlock(root: TreeNode): Block {
  const folders = root.children.filter(isFolder);
  const leaves = root.children.filter((n) => !isFolder(n));

  const rows: Cell[][] = [
    ...folders.map((f): Cell[] => [
      { text: `${f.name}/` },
      { text: String(f.count), tone: "muted", align: "end" },
    ]),
    ...leaves.map((l): Cell[] => [{ text: l.name }]),
  ];

  return { type: "section", title: "~/book_os", tone: "surface", body: [{ type: "columns", rows }] };
}

/** Renders a folder/leaf label: folders show `name/   count`, leaves `name`. */
function nodeLabel(node: TreeNode): string {
  return isFolder(node) ? `${node.name}/   ${node.count}` : node.name;
}

/**
 * Renders a node's descendants as an ASCII tree with box-drawing connectors.
 *
 * @param node - The folder whose children to render.
 * @param prefix - The accumulated indentation prefix.
 * @returns The tree lines.
 */
function renderChildren(node: TreeNode, prefix: string): string[] {
  const lines: string[] = [];
  node.children.forEach((child, i) => {
    const last = i === node.children.length - 1;
    lines.push(prefix + (last ? "└── " : "├── ") + nodeLabel(child));
    if (isFolder(child)) {
      lines.push(...renderChildren(child, prefix + (last ? "    " : "│   ")));
    }
  });
  return lines;
}

/**
 * Renders a folder node as a full `tree`-style listing (`ls <folder>`),
 * with the folder name as the header and its subtree beneath.
 *
 * @param node - The folder to render.
 * @returns The lines to print.
 */
export function renderSubtree(node: TreeNode): string[] {
  return [isFolder(node) ? `${node.name}/` : node.name, ...renderChildren(node, "")];
}

/**
 * Resolves a query to a tree node. A bare name is searched depth-first
 * (so `ring` finds a nested book); a slash path (`blog/2025`) is walked
 * segment by segment from `node`.
 *
 * @param node - The node to search from (typically the root).
 * @param query - A name or a slash-separated path.
 * @returns The matching node, or `undefined`.
 */
export function findNode(node: TreeNode, query: string): TreeNode | undefined {
  const segments = query.trim().split("/").filter(Boolean);
  if (segments.length === 0) return undefined;

  if (segments.length > 1) {
    let current: TreeNode | undefined = node;
    for (const segment of segments) {
      current = current?.children.find((c) => c.name.toLowerCase() === segment.toLowerCase());
    }
    return current;
  }

  return dfsByName(node, segments[0].toLowerCase());
}

/** Depth-first search for the first node whose name matches (lowercased). */
function dfsByName(node: TreeNode, name: string): TreeNode | undefined {
  for (const child of node.children) {
    if (child.name.toLowerCase() === name) return child;
    const deeper = dfsByName(child, name);
    if (deeper) return deeper;
  }
  return undefined;
}

/**
 * Sanitizes a user-typed navigation argument: lowercases, keeps only
 * slug/path characters (letters, digits, `/`, `-`, `_`, space), collapses
 * repeated separators, strips edge slashes (no path traversal), and caps length.
 *
 * @param input - The raw user argument.
 * @returns The cleaned query, safe to match against the index.
 */
export function sanitizeNavQuery(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9/_ -]/g, "")
    .replace(/\/+/g, "/")
    .replace(/ +/g, " ")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 120);
}

/** The outcome of resolving an `open <query>` against the index. */
export type MatchResult =
  | { kind: "match"; entry: SiteIndexEntry }
  | { kind: "ambiguous"; entries: SiteIndexEntry[] }
  | { kind: "none" };

/** The outcome of resolving an `open <query>`. */
export type OpenResult =
  | { kind: "navigate"; url: string; title: string }
  | { kind: "ambiguous"; entries: SiteIndexEntry[] }
  | { kind: "not-a-page" }
  | { kind: "none" };

/**
 * Resolves an `open` query to a navigation target. A slash path is walked
 * through the tree (a page-less folder like a year yields `not-a-page`); a
 * bare query falls back to slug/title matching. Navigation always targets a
 * URL from the index, never the raw user input.
 *
 * @param root - The site tree.
 * @param entries - The flat index (for bare slug/title matching).
 * @param query - The sanitized user argument.
 * @returns What `open` should do.
 */
export function resolveOpen(root: TreeNode, entries: SiteIndexEntry[], query: string): OpenResult {
  if (!query) return { kind: "none" };

  if (query.includes("/")) {
    const node = findNode(root, query);
    if (!node) return { kind: "none" };
    if (!node.url) return { kind: "not-a-page" };
    return { kind: "navigate", url: node.url, title: node.title ?? node.name };
  }

  const match = matchEntry(entries, query);
  if (match.kind === "match") return { kind: "navigate", url: match.entry.url, title: match.entry.title };
  if (match.kind === "ambiguous") return { kind: "ambiguous", entries: match.entries };
  return { kind: "none" };
}

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
    // no-cache (revalidate), not force-cache: the manifest changes whenever
    // content is added/deployed, so a stale cached copy must not be served.
    cachedIndex = fetch(SITE_INDEX_URL, { cache: "no-cache" })
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
      description: typeof item.description === "string" ? item.description : undefined,
    }));
}

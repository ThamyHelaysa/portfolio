/**
 * Global cache for instantiated CSSStyleSheet objects.
 * Maps the resolved URL to the constructed sheet.
 */
const shared = new Map<string, CSSStyleSheet>();

/**
 * Global cache for pending fetch/parsing promises.
 * Prevents multiple components from triggering simultaneous requests for the same file.
 */
const sharedPromises = new Map<string, Promise<CSSStyleSheet>>();
const sharedCssText = new Map<string, string>();
const sharedCssTextPromises = new Map<string, Promise<string>>();

/**
 * Checks browser support for Constructable Stylesheets.
 * This API allows sharing a single CSSStyleSheet instance across multiple Shadow DOMs
 * without cloning the CSS text, significantly reducing memory usage.
 */
function supportsConstructableStylesheets(): boolean {
  return (
    "adoptedStyleSheets" in Document.prototype &&
    "replaceSync" in CSSStyleSheet.prototype
  );
}

/**
 * Resolves the input string into a valid absolute URL path.
 * * Handles defaults and assumes a specific directory structure for bare filenames.
 *
 * @param input - The file path or name.
 * @returns The resolved absolute path.
 */
function resolveCssUrl(input?: string): string {
  if (!input) return "/assets/css/shadow.css";
  if (input.startsWith("/")) return input;
  if (input.includes("/")) return `/${input}`;
  return `/assets/css/${input}`;
}

/**
 * Fetches and creates a CSSStyleSheet instance for a given URL.
 * Implements the "Request Coalescing" pattern: if a request is already in flight,
 * subsequent calls wait for that same promise rather than starting a new fetch.
 *
 * @param url - The resolved URL of the CSS file.
 * @returns A promise resolving to the shared stylesheet.
 */
async function getSheet(url: string): Promise<CSSStyleSheet> {
  // 1. Return cached instance if available (fastest)
  if (shared.has(url)) {
    return shared.get(url)!;
  }

  // 2. Return existing promise if fetch is already in progress (prevents race conditions)
  if (sharedPromises.has(url)) {
    return sharedPromises.get(url)!;
  }

  // 3. Initiate new fetch
  const p = (async () => {
    // "force-cache" to respect HTTP caching headers
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const cssText = await res.text();

    const sheet = new CSSStyleSheet();
    // replaceSync is synchronous, blocking only this microtask, generally safe for CSS chunks
    sheet.replaceSync(cssText);

    shared.set(url, sheet);
    return sheet;
  })();

  // Cache the promise immediately
  sharedPromises.set(url, p);

  try {
    return await p;
  } finally {
    // The pending promise should never outlive the request lifecycle.
    // On success the stylesheet is cached in `shared`; on failure retries must be allowed.
    sharedPromises.delete(url);
  }
}

/**
 * Fetches and caches plain CSS text for the legacy stylesheet fallback path.
 * Uses request coalescing so repeated calls for the same URL share one in-flight fetch.
 *
 * @param url - The resolved URL of the CSS file.
 * @returns A promise resolving to the fetched CSS text.
 */
async function getCssText(url: string): Promise<string> {
  if (sharedCssText.has(url)) {
    return sharedCssText.get(url)!;
  }

  if (sharedCssTextPromises.has(url)) {
    return sharedCssTextPromises.get(url)!;
  }

  const p = (async () => {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const cssText = await res.text();
    sharedCssText.set(url, cssText);
    return cssText;
  })();

  sharedCssTextPromises.set(url, p);

  try {
    return await p;
  } finally {
    sharedCssTextPromises.delete(url);
  }
}

/**
 * Adopts a shared stylesheet into a ShadowRoot.
 * Prevents duplicates by checking existing sheets.
 *
 * @param shadowRoot - The target shadow root.
 * @param sheet - The stylesheet to adopt.
 */
function adoptSheet(shadowRoot: ShadowRoot, sheet: CSSStyleSheet): void {
  const existing = shadowRoot.adoptedStyleSheets || [];
  if (!existing.includes(sheet)) {
    shadowRoot.adoptedStyleSheets = [...existing, sheet];
  }
}

/**
 * Injects a fallback `<style>` tag for environments without constructable stylesheet support.
 * The injected style node is tagged per URL so repeated calls stay idempotent for the same root.
 *
 * @param shadowRoot - The target shadow root.
 * @param url - The resolved CSS URL used as the deduplication key.
 * @param cssText - The CSS text to inject into the fallback style element.
 */
function adoptFallbackStyle(shadowRoot: ShadowRoot, url: string, cssText: string): void {
  const existing = shadowRoot.querySelector(`style[data-shared-css-url="${url}"]`);
  if (existing) return;

  const style = document.createElement("style");
  style.dataset.sharedCssUrl = url;
  style.textContent = cssText;
  shadowRoot.appendChild(style);
}

/**
 * Main utility to load and apply Tailwind (or any CSS) to a Shadow DOM.
 * * Automatically handles URL resolution, caching, and browser compatibility.
 *
 * @param shadowRoot - The component's shadow root.
 * @param cssFileOrUrl - The CSS filename or path (e.g., "my-component.css").
 */
export async function adoptTailwind(shadowRoot: ShadowRoot, cssFileOrUrl?: string): Promise<void> {
  const url = resolveCssUrl(cssFileOrUrl);

  // Fallback: Legacy browsers (no Constructable Stylesheets)
  if (!supportsConstructableStylesheets()) {
    const cssText = await getCssText(url);
    adoptFallbackStyle(shadowRoot, url, cssText);
    return;
  }

  // Modern Path: Constructable Stylesheets
  const sheet = await getSheet(url);
  adoptSheet(shadowRoot, sheet);
}

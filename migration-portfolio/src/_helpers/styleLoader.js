/**
 * Global cache for instantiated CSSStyleSheet objects.
 * Maps the resolved URL to the constructed sheet.
 * @type {Map<string, CSSStyleSheet>}
 */
let shared = new Map();

/**
 * Global cache for pending fetch/parsing promises.
 * Prevents multiple components from triggering simultaneous requests for the same file.
 * @type {Map<string, Promise<CSSStyleSheet>>}
 */
let sharedPromises = new Map();

/**
 * Checks browser support for Constructable Stylesheets.
 * This API allows sharing a single CSSStyleSheet instance across multiple Shadow DOMs
 * without cloning the CSS text, significantly reducing memory usage.
 * @returns {boolean} True if the browser supports `adoptedStyleSheets`.
 */
function supportsConstructableStylesheets() {
  return (
    "adoptedStyleSheets" in Document.prototype &&
    "replaceSync" in CSSStyleSheet.prototype
  );
}

/**
 * Resolves the input string into a valid absolute URL path.
 * * Handles defaults and assumes a specific directory structure for bare filenames.
 *
 * @param {string} [input] - The file path or name.
 * @returns {string} The resolved absolute path.
 * @example
 * resolveCssUrl() // "/assets/css/shadow.css"
 * resolveCssUrl("foo.css") // "/assets/css/foo.css"
 * resolveCssUrl("/custom/style.css") // "/custom/style.css"
 */
function resolveCssUrl(input) {
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
 * @param {string} url - The resolved URL of the CSS file.
 * @returns {Promise<CSSStyleSheet>} A promise resolving to the shared stylesheet.
 */
async function getSheet(url) {
  // 1. Return cached instance if available (fastest)
  if (shared.has(url)) return shared.get(url);

  // 2. Return existing promise if fetch is already in progress (prevents race conditions)
  if (sharedPromises.has(url)) return sharedPromises.get(url);

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
    // If the fetch failed, remove from promise cache so retries are possible.
    // If it succeeded, it's already in the 'shared' Map, so we don't need the promise anymore.
    if (!shared.has(url)) sharedPromises.delete(url);
  }
}

/**
 * Adopts a shared stylesheet into a ShadowRoot.
 * Prevents duplicates by checking existing sheets.
 *
 * @param {ShadowRoot} shadowRoot - The target shadow root.
 * @param {CSSStyleSheet} sheet - The stylesheet to adopt.
 */
function adoptSheet(shadowRoot, sheet) {
  const existing = shadowRoot.adoptedStyleSheets || [];
  if (!existing.includes(sheet)) {
    shadowRoot.adoptedStyleSheets = [...existing, sheet];
  }
}

/**
 * Main utility to load and apply Tailwind (or any CSS) to a Shadow DOM.
 * * Automatically handles URL resolution, caching, and browser compatibility.
 *
 * @param {ShadowRoot} shadowRoot - The component's shadow root.
 * @param {string} [cssFileOrUrl] - The CSS filename or path (e.g., "my-component.css").
 * @returns {Promise<void>}
 */
export async function adoptTailwind(shadowRoot, cssFileOrUrl) {
  const url = resolveCssUrl(cssFileOrUrl);

  // Fallback: Legacy browsers (no Constructable Stylesheets)
  if (!supportsConstructableStylesheets()) {
    // minimal fallback
    const res = await fetch(url);
    const style = document.createElement("style");
    style.textContent = await res.text();
    shadowRoot.appendChild(style);
    return;
  }

  // Modern Path: Constructable Stylesheets
  const sheet = await getSheet(url);
  adoptSheet(shadowRoot, sheet);
}

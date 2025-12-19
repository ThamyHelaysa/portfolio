import { adoptTailwind } from "../_helpers/styleLoader.js";

/**
 * Available theme options.
 * @enum {string}
 */
const THEMES = /** @type {const} */ ({
  pinky: "pinky",
  dark: "dark",
});

/**
 * Key used to persist the theme preference in localStorage.
 * @constant {string}
 */
const STORAGE_KEY = "theme";

/**
 * A Web Component that manages the application's color theme.
 *
 * Features:
 * 1. **Persistence:** Saves the user's choice to `localStorage`.
 * 2. **System Sync:** Respects `prefers-color-scheme` unless the user overrides it.
 * 3. **Async Styling:** Loads Tailwind styles into Shadow DOM before rendering the UI to prevent FOUC (Flash Of Unstyled Content) inside the component.
 * 4. **Global Side Effects:** Toggles the `.dark` class and `data-theme` attribute on the `<html>` element.
 *
 * @element theme-toggle
 * @attr {string} theme - The current active theme ('pinky' or 'dark').
 */
class ThemeToggle extends HTMLElement {
  /**
   * Attributes to monitor for changes.
   * @readonly
   * @returns {string[]}
   */
  static observedAttributes = ["theme"];

  constructor() {
    super();
    /** @type {string} Internal state for the current theme. */
    this._theme = THEMES.pinky;
    this.attachShadow({ mode: "open" });

    // Bindings
    this._onClick = this._onClick.bind(this);
    this._onSystemChange = this._onSystemChange.bind(this);
  }

  /**
   * Lifecycle callback.
   * * Executes a split initialization strategy:
   * 1. **Synchronous:** Applies global theme state immediately (document root) to prevent page flashing.
   * 2. **Asynchronous:** Fetches CSS, then renders the button UI.
   */
  connectedCallback() {
    // 1. Initialize Global State Immediately (Sync)
    // Don't wait for CSS to load to set the document class
    this._initThemeState();

    // 2. Render UI (Async)
    adoptTailwind(this.shadowRoot, "toggle-theme-shadow.css")
      .then(() => {
        // Ensure connection before rendering
        if (!this.isConnected) return;

        this._render(); 
        this._cacheDOM();
        this._bindEvents();
        
        // Sync UI to the state
        this._syncUI(this._theme);
      });
  }

  /**
   * Lifecycle callback.
   * Removes event listeners to prevent memory leaks.
   */
  disconnectedCallback() {
    this._btn?.removeEventListener("click", this._onClick);
    this._mql?.removeEventListener("change", this._onSystemChange);
  }

  /**
   * Gets the current theme.
   * @returns {string}
   */
  get theme() {
    return this._theme;
  }

  /**
   * Sets the theme, updates persistence, and triggers UI updates.
   * * Note: This is the primary entry point for manual changes.
   * @param {string} value - The new theme to apply.
   */
  set theme(value) {
    const next = value === THEMES.dark ? THEMES.dark : THEMES.pinky;
    if (next === this._theme) return;

    this._theme = next;
    
    // Reflect state to attribute (triggers attributeChangedCallback)
    this.setAttribute("theme", next);
    
    // Persist
    localStorage.setItem(STORAGE_KEY, next);

    // Update
    this._applyThemeToDocument(next);
    this._syncUI(next);
  }

  /**
   * Reacts to attribute changes (e.g., via setAttribute or DevTools).
   * @param {string} name - Attribute name.
   * @param {string} _oldValue - Previous value.
   * @param {string} newValue - New value.
   */
  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === "theme" && newValue !== this._theme) {
      // Validate input strictly
      const validTheme = newValue === THEMES.dark ? THEMES.dark : THEMES.pinky;
      console.log('INSIDE: attributeChangedCallback', validTheme)
      
      // Update internal state directly to avoid triggering the Setter's "setAttribute"
      // avoiding the circular dependency loop.
      this._theme = validTheme;
      this._applyThemeToDocument(this._theme);
      this._syncUI(this._theme);
    }
  }

  /**
   * Determines the initial theme based on priority:
   * 1. Saved LocalStorage value.
   * 2. System Preference (`prefers-color-scheme`).
   * * Also sets up the system preference listener if no saved theme exists.
   * @private
   */
  _initThemeState() {
    this._mql = window.matchMedia("(prefers-color-scheme: dark)");
    const hasSaved = this._loadSavedTheme();

    if (!hasSaved) {
      // No save? Listen to system
      this._theme = this._mql.matches ? THEMES.dark : THEMES.pinky;
      this._mql.addEventListener("change", this._onSystemChange);
    }
    
    // Apply immediately to prevent FOUC
    this._applyThemeToDocument(this._theme);
  }

  /**
   * Checks LocalStorage for a previously saved theme.
   * @returns {boolean} True if a valid saved theme was found.
   * @private
   */
  _loadSavedTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === THEMES.dark || saved === THEMES.pinky) {
      this._theme = saved;
      return true;
    }
    return false;
  }

  /**
   * Handle button click.
   * Toggles the theme and disables system preference listening (user intent overrides system).
   * @private
   */
  _onClick() {
    // Standard Toggle Logic
    this.theme = this._theme === THEMES.pinky ? THEMES.dark : THEMES.pinky;
    
    // Stop listening to system once user makes a manual choice
    if (this._mql) this._mql.removeEventListener("change", this._onSystemChange);
  }

  /**
   * Handle OS-level theme changes (e.g., Mac Auto appearance).
   * Only active if the user hasn't manually set a theme yet.
   * @param {MediaQueryListEvent} e 
   * @private
   */
  _onSystemChange(e) {
    this.theme = e.matches ? THEMES.dark : THEMES.pinky;
  }

  /**
   * Inject HTML into the shadow root.
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <button type="button" aria-pressed="false">
        <span class="dot-container">
          <span class="theme-dot"></span>
        </span>
        <span class="theme-text"></span>
      </button>
    `;
  }

  /**
   * Caches DOM references to avoid repeated querySelectors.
   * @private
   */
  _cacheDOM() {
    /** @type {HTMLButtonElement} */
    this._btn = this.shadowRoot.querySelector("button");
    /** @type {HTMLSpanElement} */
    this._dot = this.shadowRoot.querySelector(".theme-dot");
    /** @type {HTMLSpanElement} */
    this._text = this.shadowRoot.querySelector(".theme-text");
  }

  /**
   * Attaches event listeners to the rendered DOM.
   * @private
   */
  _bindEvents() {
    this._btn.addEventListener("click", this._onClick);
  }

  /**
   * Applies the theme to the global `document.documentElement`.
   * Sets `data-theme` attribute and toggles the `.dark` class.
   * @param {string} theme 
   * @private
   */
  _applyThemeToDocument(theme) {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === THEMES.dark);
  }

  /**
   * Updates the button UI (Text, ARIA, CSS classes) to match the state.
   * @param {string} theme 
   * @private
   */
  _syncUI(theme) {
    // If UI isn't rendered yet (async css), do nothing
    if (!this._btn) return;

    const isDark = theme === THEMES.dark;

    // 1. Accessibility
    this._btn.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    this._btn.setAttribute("aria-pressed", String(isDark));

    // 2. Visuals
    this._dot.classList.toggle("sw:scale-100", isDark);
    this._dot.classList.toggle("sw:scale-0", !isDark);

    // 3. Text (Dynamic)
    this._text.textContent = isDark ? "Dark" : "Pinky"; 
  }
}

customElements.define("theme-toggle", ThemeToggle);
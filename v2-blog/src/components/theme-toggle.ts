import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { adoptTailwind } from "../_helpers/styleLoader.ts";

const THEMES = {
  pinky: "pinky",
  dark: "dark",
} as const;

type Theme = typeof THEMES[keyof typeof THEMES];
const STORAGE_KEY = "theme";

@customElement('theme-toggle')
export class ThemeToggle extends LitElement {

  @property({ type: String, reflect: true })
  theme: Theme = THEMES.pinky;

  private _mql: MediaQueryList | null = null;
  private _hasUserOverridden = false; // Track user manually set theme
  
  constructor() {
    super();
    this._onSystemChange = this._onSystemChange.bind(this);
  }

  static styles = css`
    :host {
      min-width: 100px;
    }
    button {
      background-color: transparent;
      border: none;
      box-shadow: none;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this._initThemeState();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mql?.removeEventListener("change", this._onSystemChange);
  }

  async firstUpdated() {
    try {
      await adoptTailwind(this.renderRoot as ShadowRoot, "toggle-theme-shadow.css");
    } catch (e) {
      console.error('[ThemeToggle] Failed to load styles', e);
    }
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('theme')) {
      localStorage.setItem(STORAGE_KEY, this.theme);

      this._applyThemeToDocument(this.theme);
    }
  }

  render() {
    const isDark = this.theme === THEMES.dark;
    const selTheme = this.theme;

    return html`
      <button type="button"
        aria-label=${isDark ? "Switch to light theme" : "Switch to dark theme"}
        aria-pressed=${String(isDark)}
        class="sw:flex sw:items-center sw:gap-2 sw:text-sm sw:min-w-[75px] sw:uppercase sw:font-sans sw:font-light sw:tracking-wider sw:text-inherit sw:hover:text-accent-red sw:transition-colors sw:cursor-pointer"
        @click=${this._handleUserToggle}>
        
        <span 
          class="dot-container ${isDark ? 'sw:before:scale-100' : 'sw:before:scale-0'} sw:before:content-[''] sw:before:w-2 sw:before:h-2 sw:before:rounded-full sw:before:bg-accent-red sw:before:transition-transform sw:before:duration-300">
        </span>
        
        <span class="theme-text">
          ${selTheme}
        </span>
      </button>
    `;
  }

  private _handleUserToggle() {
    this.theme = this.theme === THEMES.pinky ? THEMES.dark : THEMES.pinky;
    
    if (!this._hasUserOverridden && this._mql) {
      this._mql.removeEventListener("change", this._onSystemChange);
      this._hasUserOverridden = true;
    }
  }

  private _onSystemChange(e: MediaQueryListEvent) {
    // Only react if user hasn't overridden yet
    if (!this._hasUserOverridden) {
      this.theme = e.matches ? THEMES.dark : THEMES.pinky;
    }
  }

  private _initThemeState() {
    this._mql = window.matchMedia("(prefers-color-scheme: dark)");
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;

    if (saved && (saved === THEMES.dark || saved === THEMES.pinky)) {
      this.theme = saved;
      this._hasUserOverridden = true; // Saved implies previous user choice
    } else {
      this.theme = this._mql.matches ? THEMES.dark : THEMES.pinky;
      this._mql.addEventListener("change", this._onSystemChange);
    }

    this._applyThemeToDocument(this.theme);
  }

  private _applyThemeToDocument(theme: Theme) {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === THEMES.dark);
  }
}
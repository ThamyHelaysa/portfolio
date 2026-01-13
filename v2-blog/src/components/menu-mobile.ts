import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { adoptTailwind } from "../_helpers/styleLoader.ts";
import { animator } from "../_helpers/animationManager.ts";

@customElement("menu-mobile")
export class MenuMobile extends LitElement {

  @property({ type: Boolean, reflect: true })
  isOpen: boolean = false;

  @state() private _blockAnim: boolean = false;

  @query('#mobile-menu') private _menuWrapper!: HTMLDivElement;

  static styles = css`
    #mobile-menu {
      position: fixed;
      opacity: 0;
      transform: translateY(-100%) translateZ(0px);
      pointer-events: none;
      z-index: 99;
      contain: layout;
      will-change: transform, opacity;
      min-height: 100vh;
      min-height: 100svh;
      padding-bottom: env(safe-area-inset-bottom);
    }

    button {
      background-color: transparent;
      border: none;
      box-shadow: none;
    }
  `;

  private async _handleOpen() {
    if (this._blockAnim) return;

    this.isOpen = !this.isOpen;
    this._lockBody(this.isOpen);
    animator.cancel(this._menuWrapper);
    await this._showMenu(this.isOpen);
  }

  private async _handleClickLink(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (!link) return;

    console.log(target, link, link?.target);
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0 || link.target === '_blank') {
      this._handleOpen();
      return;
    }

    e.preventDefault();
    const href = link?.href;

    this._handleOpen();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = prefersReducedMotion ? 0 : 200;

    await new Promise(resolve => setTimeout(resolve, delay));

    window.location.href = href;
  }

  async firstUpdated() {
    try {
      await adoptTailwind(this.renderRoot as ShadowRoot, "menu-mobile-shadow.css");
    } catch (e) {
      console.error('[ThemeToggle] Failed to load styles', e);
    }
  }

  private async _showMenu(open: boolean) {
    this._blockAnim = true;

    console.log(open)

    const keyframes = open
      ? [
        { transform: 'translateY(-100%) translateZ(0px)', opacity: 0, pointerEvents: 'none' }, // Start
        { transform: 'translateY(0) translateZ(0px)', opacity: 1, pointerEvents: 'initial' }   // End
      ]
      : [
        { transform: 'translateY(0) translateZ(0px)', opacity: 1, pointerEvents: 'initial' },  // Start
        { transform: 'translateY(-100%) translateZ(0px)', opacity: 0, pointerEvents: 'none' }  // End
      ];

    try {
      await animator.animate(
        this._menuWrapper,
        keyframes,
        { duration: 650, easing: 'cubic-bezier(.37,.79,.14,.93)', fill: 'both' }
      ).catch((e) => console.log(e)).then(() => this._blockAnim = false);

    } catch (e) {
      console.log('Animation interrupted:', e);
    }
  }

  private _lockBody(lock = true) {
    if (!document.body) return;
    document.body.style.overflow = lock ? 'hidden' : 'initial'
  }

  protected render(): unknown {
    const open = this.isOpen;
    return html`
      <button
        class="btn sw:md:hidden sw:text-accent-primary sw:font-sans sw:text-sm sw:font-bold sw:uppercase sw:tracking-widest sw:px-2 sw:py-1 sw:hover:opacity-70 sw:transition-opacity"
        aria-expanded="${String(open)}"
        aria-controls="mobile-menu"
        @click=${this._handleOpen}>
          Menu
      </button>
      <div
        id="mobile-menu"
        class="sw:inset-0 sw:z-99 sw:bg-warm-bg sw:transition-colors sw:duration-500 sw:ease-in-out sw:md:hidden sw:flex sw:flex-col "
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
      >
        <div class="sw:px-6 sw:py-6 sw:flex sw:justify-between sw:items-center sw:border-b sw:border-accent-primary/5">
          <span class="sw:text-accent-primary sw:font-serif sw:text-xl sw:tracking-tight">Menu</span>
          <button
            @click="${this._handleOpen}"
            class="btn sw:text-accent-primary sw:font-sans sw:text-sm sw:font-bold sw:uppercase sw:tracking-widest sw:p-2"
            aria-label="Close menu"
          >
            Close
          </button>
        </div>

        <nav 
          class="sw:overflow-hidden sw:pb-6 sw:grow sw:flex sw:flex-col sw:justify-center sw:z-50" 
          @click="${this._handleClickLink}">
          <slot name="content"></slot>
          <div class="sw:pt-12 sw:px-8 sw:gap-8 sw:border-t sw:border-accent-primary/5 sw:transition-transform sw:transition-opacity sw:duration-500 sw:delay-600 ${open ? 'sw:opacity-100 sw:translate-x-0' : 'sw:opacity-0 sw:-translate-x-4'
      }">
            <div class="sw:flex sw:flex-col sw:gap-3">
              <a
                href="https://www.linkedin.com/in/thamy-helaysa"
                target="_blank"
                rel="noreferrer"
                class="sw:py-3 sw:text-lg sw:font-serif sw:italic sw:text-accent-primary/80 sw:hover:text-accent-primary"
              >
                LinkedIn &rarr;
              </a>
              <slot name="linkedin"></slot>
              <div class="sw:py-3 sw:flex sw:items-center sw:gap-4 sw:text-accent-primary">
                 <span class="sw:text-sm sw:uppercase sw:tracking-widest sw:opacity-50 ">Theme</span>
                 <theme-toggle class="hidden md:flex" data-template-id="mobile-theme-toggle-tmpl"></theme-toggle>
              </div>
            </div>
          </div>
        </nav>
      </div>
    `
  }

}

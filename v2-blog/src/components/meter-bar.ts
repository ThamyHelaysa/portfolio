import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import { onceInViewport } from "../_helpers/motion.ts";

const FADE_DURATION_MS = 200;

const FILLED_GLYPH = "▌";
const EMPTY_GLYPH = "░";

// Animated segment meter (mood level, reading time). Light DOM, styled by
// default.css (`mb-*` rules). Filled cells wipe in from the left over the
// `░` base glyphs once `data-ready` lands — the cell animation and its
// sibling-index() stagger live entirely in CSS, so final states hold even
// where WAAPI is unavailable.
@customElement("meter-bar")
export class MeterBar extends LitElement {
  @property({ type: Number }) value = 0;
  @property({ type: Number }) max = 5;

  private started = false;
  private animations: Animation[] = [];
  private unobserve?: () => void;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    // Light-DOM Lit renders alongside existing children instead of replacing
    // them — drop the server-rendered fallback glyphs or they show twice.
    this.textContent = "";
  }

  disconnectedCallback() {
    this.unobserve?.();
    this.unobserve = undefined;
    for (const animation of this.animations) animation.cancel();
    this.animations = [];
    super.disconnectedCallback();
  }

  protected firstUpdated(): void {
    this.unobserve = onceInViewport(this, () => this.startAnimations());
  }

  private startAnimations(): void {
    if (this.started || !this.isConnected) return;
    this.started = true;
    this.setAttribute("data-ready", "");

    if (typeof this.animate !== "function") return;

    this.animations.push(
      this.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: FADE_DURATION_MS,
        easing: "ease-out",
        fill: "backwards",
      }),
    );
  }

  protected render(): unknown {
    const total = Math.max(1, Math.floor(this.max));
    const filled = Math.min(total, Math.max(0, Math.round(this.value)));

    const cells = Array.from({ length: total }, (_, index) =>
      index < filled
        ? html`<span class="mb-cell mb-filled"
            ><span class="mb-base">${EMPTY_GLYPH}</span
            ><span class="mb-fill">${FILLED_GLYPH}</span></span
          >`
        : html`<span class="mb-cell"><span class="mb-base">${EMPTY_GLYPH}</span></span>`,
    );

    return html`<span class="mb-view" aria-hidden="true">${cells}</span>`;
  }
}

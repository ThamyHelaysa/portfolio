import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import { onceInViewport, prefersReducedMotion } from "../_helpers/motion.ts";
import { sampleSpringProgress } from "../_helpers/spring.ts";

const CELL_DURATION_MS = 450;
const CELL_STAGGER_MS = 80;
const FADE_DURATION_MS = 200;
const SPRING_SAMPLES = 30;

const FILLED_GLYPH = "▌";
const EMPTY_GLYPH = "░";

// Animated segment meter (mood level, reading time). Light DOM, styled by
// default.css (`mb-*` rules). Filled cells rise in left → right over the
// `░` base glyphs; final states live in CSS classes so the bar reads
// correctly even where WAAPI is unavailable.
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

    if (prefersReducedMotion()) return;

    const progress = sampleSpringProgress(SPRING_SAMPLES);
    const cells = this.querySelectorAll<HTMLElement>(".mb-filled");

    cells.forEach((cell, index) => {
      const fill = cell.querySelector<HTMLElement>(".mb-fill");
      const base = cell.querySelector<HTMLElement>(".mb-base");
      if (!fill || !base) return;

      const timing: KeyframeAnimationOptions = {
        duration: CELL_DURATION_MS,
        delay: index * CELL_STAGGER_MS,
        easing: "linear",
        fill: "backwards",
      };

      this.animations.push(
        fill.animate(
          progress.map((p, i) => ({
            offset: i / SPRING_SAMPLES,
            opacity: p,
            transform: `translateY(${((1 - p) * 40).toFixed(3)}%)`,
          })),
          timing,
        ),
        base.animate([{ opacity: 1 }, { opacity: 0 }], timing),
      );
    });
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

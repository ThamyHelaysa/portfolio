import { html, LitElement, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

import { parseDisplayDate, todayParts, type DateParts } from "../_helpers/date.ts";
import { onceInViewport, prefersReducedMotion } from "../_helpers/motion.ts";
import { sampleSpringProgress } from "../_helpers/spring.ts";

const SECTION_DURATION_MS = 1200;
const SECTION_STAGGER_MS = 150;
const FADE_DURATION_MS = 200;
const SPRING_SAMPLES = 60;

type SectionKey = "day" | "month" | "year";

// DOM order doubles as stagger order: day first, year settles last.
const SECTIONS: SectionKey[] = ["day", "month", "year"];
const SECTION_DIGITS: Record<SectionKey, number> = { day: 2, month: 2, year: 4 };

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

// Inclusive value path from `from` to `to`, one step at a time — the values
// the odometer counts through. Single item when they match.
export function sectionSteps(from: number, to: number): number[] {
  const step = to >= from ? 1 : -1;
  const values: number[] = [];
  for (let value = from; value !== to; value += step) values.push(value);
  values.push(to);
  return values;
}

// Odometer date. Light DOM: styled by default.css (`sd-*` rules) and the
// parent's utilities; server-rendered fallback text is replaced on upgrade.
// Digits render as vertical strips starting at the viewer's local "today"
// and spring upward into the target date, day → month → year.
@customElement("spin-date")
export class SpinDate extends LitElement {
  @property({ type: String }) date = "";

  private start: DateParts = todayParts();
  private started = false;
  private animations: Animation[] = [];
  private unobserve?: () => void;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    // Light-DOM Lit renders alongside existing children instead of replacing
    // them — drop the server-rendered fallback text or it shows twice.
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
    if (!parseDisplayDate(this.date)) {
      this.setAttribute("data-ready", "");
      return;
    }
    this.unobserve = onceInViewport(this, () => this.startAnimations());
  }

  private startAnimations(): void {
    if (this.started || !this.isConnected) return;
    this.started = true;
    this.setAttribute("data-ready", "");

    const canAnimate = typeof this.animate === "function";

    if (canAnimate) {
      this.animations.push(
        this.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: FADE_DURATION_MS,
          easing: "ease-out",
          fill: "backwards",
        }),
      );
    }

    const progress = sampleSpringProgress(SPRING_SAMPLES);
    const strips = this.querySelectorAll<HTMLElement>(".sd-strip");

    strips.forEach((strip, index) => {
      const count = strip.childElementCount;
      if (count < 2) return;

      // Strip is N stacked items; sliding up (N-1)/N of its own height lands
      // on the last one. Percentages keep it correct through font swaps.
      const distance = (-(count - 1) / count) * 100;

      // Final frame goes through the CSSOM, not commitStyles() or a forwards
      // fill: commitStyles is CSP-blocked on iOS Safari (style-src has no
      // 'unsafe-inline'), and forwards fills pin compositor layers forever.
      strip.style.transform = `translateY(${distance}%)`;
      if (!canAnimate) return;

      this.animations.push(
        strip.animate(
          progress.map((p, i) => ({
            offset: i / SPRING_SAMPLES,
            transform: `translateY(${(p * distance).toFixed(4)}%)`,
          })),
          {
            duration: SECTION_DURATION_MS,
            delay: index * SECTION_STAGGER_MS,
            easing: "linear",
            fill: "backwards",
          },
        ),
      );
    });
  }

  private renderSection(key: SectionKey, target: DateParts): TemplateResult {
    const width = SECTION_DIGITS[key];
    const from = prefersReducedMotion() ? target[key] : this.start[key];
    const steps = sectionSteps(from, target[key]);

    return html`<span class="sd-sec sd-sec-${width}"
      ><span class="sd-strip"
        >${steps.map((value) => html`<span class="sd-item">${pad(value, width)}</span>`)}</span
      ></span
    >`;
  }

  protected render(): unknown {
    const target = parseDisplayDate(this.date);
    if (!target) return html`${this.date}`;

    const [day, month, year] = SECTIONS.map((key) => this.renderSection(key, target));

    return html`<span class="sd-sr">${this.date}</span
      ><span class="sd-view" aria-hidden="true"
        >${day}<span class="sd-sep">/</span>${month}<span class="sd-sep">/</span>${year}</span
      >`;
  }
}

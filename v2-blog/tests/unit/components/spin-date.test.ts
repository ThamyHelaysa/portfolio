import { describe, expect, it, vi } from "vitest";

import { sectionSteps, SpinDate } from "../../../src/components/spin-date.ts";
import { todayParts } from "../../../src/_helpers/date.ts";

function setReducedMotion(enabled: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? enabled : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

async function mount(date: string): Promise<SpinDate> {
  const element = new SpinDate();
  element.setAttribute("date", date);
  // Server-rendered fallback text, like the real template ships.
  element.appendChild(document.createTextNode(date));
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
}

describe("sectionSteps", () => {
  it("counts up inclusively", () => {
    expect(sectionSteps(11, 14)).toEqual([11, 12, 13, 14]);
  });

  it("counts down inclusively", () => {
    expect(sectionSteps(7, 4)).toEqual([7, 6, 5, 4]);
  });

  it("collapses to a single value when equal", () => {
    expect(sectionSteps(5, 5)).toEqual([5]);
  });
});

describe("spin-date", () => {
  it("renders a screen-reader date and an aria-hidden odometer view", async () => {
    const element = await mount("27/03/2025");

    expect(element.querySelector(".sd-sr")?.textContent).toBe("27/03/2025");
    expect(element.querySelector(".sd-view")?.getAttribute("aria-hidden")).toBe("true");
    expect(element.querySelectorAll(".sd-strip")).toHaveLength(3);
  });

  it("replaces the server-rendered fallback instead of duplicating it", async () => {
    const element = await mount("27/03/2025");

    const strayText = Array.from(element.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    expect(strayText).toHaveLength(0);
    expect(element.querySelectorAll(".sd-view")).toHaveLength(1);
  });

  it("builds each strip counting from today toward the target", async () => {
    const element = await mount("27/03/2025");
    const today = todayParts();

    const strips = element.querySelectorAll(".sd-strip");
    expect(strips[0].childElementCount).toBe(Math.abs(today.day - 27) + 1);
    expect(strips[1].childElementCount).toBe(Math.abs(today.month - 3) + 1);
    expect(strips[2].childElementCount).toBe(Math.abs(today.year - 2025) + 1);

    expect(strips[0].firstElementChild?.textContent).toBe(
      String(today.day).padStart(2, "0"),
    );
    expect(strips[0].lastElementChild?.textContent).toBe("27");
    expect(strips[2].lastElementChild?.textContent).toBe("2025");
  });

  it("marks itself ready on start (no IntersectionObserver here = immediate)", async () => {
    const element = await mount("27/03/2025");
    expect(element.hasAttribute("data-ready")).toBe(true);
  });

  it("pins strips to their final position when WAAPI is unavailable", async () => {
    const element = await mount("01/01/2020");

    for (const strip of Array.from(element.querySelectorAll<HTMLElement>(".sd-strip"))) {
      const count = strip.childElementCount;
      if (count < 2) continue;
      const expected = `translateY(${(-(count - 1) / count) * 100}%)`;
      expect(strip.style.transform).toBe(expected);
    }
  });

  it("renders only the final value under reduced motion", async () => {
    setReducedMotion(true);
    const element = await mount("27/03/2025");

    for (const strip of Array.from(element.querySelectorAll(".sd-strip"))) {
      expect(strip.childElementCount).toBe(1);
    }
    expect(element.querySelector(".sd-view")?.textContent).toBe("27/03/2025");
  });

  it("falls back to plain text for an unparseable date", async () => {
    const element = await mount("soon™");

    expect(element.querySelector(".sd-view")).toBeNull();
    expect(element.textContent).toContain("soon™");
    expect(element.hasAttribute("data-ready")).toBe(true);
  });
});

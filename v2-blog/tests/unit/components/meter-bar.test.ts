import { describe, expect, it } from "vitest";

import { MeterBar } from "../../../src/components/meter-bar.ts";

async function mount(value: string, max = "5"): Promise<MeterBar> {
  const element = new MeterBar();
  element.setAttribute("value", value);
  element.setAttribute("max", max);
  // Server-rendered fallback glyphs, like the real template ships.
  element.appendChild(document.createTextNode("▌▌▌░░"));
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
}

describe("meter-bar", () => {
  it("renders max cells with the first `value` filled", async () => {
    const element = await mount("3");

    const cells = element.querySelectorAll(".mb-cell");
    expect(cells).toHaveLength(5);
    expect(element.querySelectorAll(".mb-filled")).toHaveLength(3);
    expect(element.querySelectorAll(".mb-fill")).toHaveLength(3);
  });

  it("keeps the glyph pair per filled cell (base + fill)", async () => {
    const element = await mount("2");

    const filled = element.querySelector(".mb-filled");
    expect(filled?.querySelector(".mb-base")?.textContent).toBe("░");
    expect(filled?.querySelector(".mb-fill")?.textContent).toBe("▌");

    const empty = element.querySelectorAll(".mb-cell")[4];
    expect(empty.querySelector(".mb-fill")).toBeNull();
    expect(empty.querySelector(".mb-base")?.textContent).toBe("░");
  });

  it("clamps value into 0..max", async () => {
    expect((await mount("9")).querySelectorAll(".mb-filled")).toHaveLength(5);
    expect((await mount("-2")).querySelectorAll(".mb-filled")).toHaveLength(0);
  });

  it("replaces the server-rendered fallback instead of duplicating it", async () => {
    const element = await mount("3");

    const strayText = Array.from(element.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    expect(strayText).toHaveLength(0);
    expect(element.querySelectorAll(".mb-view")).toHaveLength(1);
  });

  it("hides the view from assistive tech and marks itself ready", async () => {
    const element = await mount("4");

    expect(element.querySelector(".mb-view")?.getAttribute("aria-hidden")).toBe("true");
    expect(element.hasAttribute("data-ready")).toBe(true);
  });
});

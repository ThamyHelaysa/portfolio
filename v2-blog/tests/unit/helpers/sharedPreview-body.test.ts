import { beforeEach, describe, expect, it, vi } from "vitest";

describe("sharedPreview body attachment", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  it("does not crash if instantiated before document.body exists and attaches later", async () => {
    const originalBody = document.body;

    Object.defineProperty(document, "body", {
      configurable: true,
      get: () => null,
    });

    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();

    expect(document.querySelector("#mediaPreview")).toBeNull();

    Object.defineProperty(document, "body", {
      configurable: true,
      get: () => originalBody,
    });

    preview.reveal(
      { src: "/assets/example.webp", placement: "cursor", getRect: () => new DOMRect(0, 0, 40, 40) },
      { cursor: { x: 20, y: 30 } }
    );

    expect(document.querySelectorAll("#mediaPreview")).toHaveLength(1);
  });
});

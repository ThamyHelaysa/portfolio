import { beforeEach, describe, expect, it, vi } from "vitest";

describe("styleLoader", () => {
  beforeEach(() => {
    vi.resetModules();
    globalThis.fetch = vi.fn();
  });

  it("does not duplicate adopted stylesheets on repeated calls", async () => {
    globalThis.fetch.mockResolvedValue(new Response("body { color: red; }", { status: 200 }));

    const { adoptTailwind } = await import("../../../src/_helpers/styleLoader.ts");
    const host = document.createElement("div");
    const root = host.attachShadow({ mode: "open" });

    await adoptTailwind(root, "shadow.css");
    await adoptTailwind(root, "shadow.css");

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(root.adoptedStyleSheets).toHaveLength(1);
  });

  it("coalesces concurrent fetches and shares the same stylesheet instance", async () => {
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = () => resolve(new Response("body { color: pink; }", { status: 200 }));
    });

    globalThis.fetch.mockReturnValue(fetchPromise);

    const { adoptTailwind } = await import("../../../src/_helpers/styleLoader.ts");
    const rootA = document.createElement("div").attachShadow({ mode: "open" });
    const rootB = document.createElement("div").attachShadow({ mode: "open" });

    const pendingA = adoptTailwind(rootA, "toggle-theme-shadow.css");
    const pendingB = adoptTailwind(rootB, "toggle-theme-shadow.css");

    resolveFetch();

    await Promise.all([pendingA, pendingB]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(rootA.adoptedStyleSheets[0]).toBe(rootB.adoptedStyleSheets[0]);
  });
});

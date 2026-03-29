import { beforeEach, vi } from "vitest";

class TestStyleSheet {
  text = "";

  replaceSync(value: string) {
    this.text = value;
  }
}

function defineAdoptedStyleSheets(proto: object) {
  if (Object.getOwnPropertyDescriptor(proto, "adoptedStyleSheets")) return;

  Object.defineProperty(proto, "adoptedStyleSheets", {
    configurable: true,
    get() {
      return this.__adoptedStyleSheets ?? [];
    },
    set(value) {
      this.__adoptedStyleSheets = value;
    },
  });
}

function createMatchMedia(matches = false) {
  return vi.fn().mockImplementation(() => ({
    matches,
    media: "",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!globalThis.CSSStyleSheet) {
  globalThis.CSSStyleSheet = TestStyleSheet as unknown as typeof CSSStyleSheet;
}

defineAdoptedStyleSheets(Document.prototype);
defineAdoptedStyleSheets(ShadowRoot.prototype);

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
  sessionStorage.clear();

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: createMatchMedia(false),
  });

  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(Date.now()), 0)) as typeof requestAnimationFrame;
  }

  if (!globalThis.cancelAnimationFrame) {
    globalThis.cancelAnimationFrame = ((id: number) =>
      window.clearTimeout(id)) as typeof cancelAnimationFrame;
  }
});

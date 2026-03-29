import { beforeEach, vi } from "vitest";

class TestStyleSheet {
  text = "";

  replaceSync(value) {
    this.text = value;
  }
}

function defineAdoptedStyleSheets(proto) {
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
  globalThis.CSSStyleSheet = TestStyleSheet;
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
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  }

  if (!globalThis.cancelAnimationFrame) {
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  }
});

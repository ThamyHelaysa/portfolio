import js from "@eslint/js";
import tseslint from "typescript-eslint";

const browserGlobals = {
  console: "readonly",
  process: "readonly",
  window: "readonly",
  document: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  navigator: "readonly",
  screen: "readonly",
  fetch: "readonly",
  customElements: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  ResizeObserver: "readonly",
  HTMLElement: "readonly",
  HTMLButtonElement: "readonly",
  HTMLDialogElement: "readonly",
  HTMLDivElement: "readonly",
  HTMLFormElement: "readonly",
  HTMLLabelElement: "readonly",
  HTMLSpanElement: "readonly",
  HTMLTextAreaElement: "readonly",
  ShadowRoot: "readonly",
  Document: "readonly",
  CSSStyleSheet: "readonly",
  MediaQueryList: "readonly",
  MediaQueryListEvent: "readonly",
  KeyboardEvent: "readonly",
  MouseEvent: "readonly",
  Animation: "readonly",
  AnimationEvent: "readonly",
};

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,ts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-useless-assignment": "off",
      "no-var": "off",
      "no-console": "warn",
    },
  },
  {
    files: ["tests/**/*.{js,ts}"],
    rules: {
      "no-console": "off",
    },
  },
];

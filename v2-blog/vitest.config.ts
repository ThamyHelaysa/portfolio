import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup/vitest-dom.ts"],
    include: ["tests/unit/**/*.test.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});

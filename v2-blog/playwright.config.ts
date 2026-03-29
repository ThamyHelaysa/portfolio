import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

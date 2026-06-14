import { expect, test } from "@playwright/test";

test("Ctrl+Shift+C summons the overlay, runs help, and Esc closes it", async ({ page }) => {
  await page.goto("/");

  // Not present until summoned (lazy-loaded).
  await expect(page.locator("terminal-overlay")).toHaveCount(0);

  await page.keyboard.press("Control+Shift+C");

  const overlay = page.locator("terminal-overlay");
  await expect(overlay).toHaveAttribute("open", "");
  await expect(page.getByRole("dialog", { name: "Terminal" })).toBeVisible();

  // Input is focused on open; type help and run it.
  const input = page.locator("#overlay-input");
  await expect(input).toBeFocused();
  await input.fill("help");
  await page.keyboard.press("Enter");

  await expect(page.locator("#overlay-log")).toContainText("help - list commands");

  // Esc closes.
  await page.keyboard.press("Escape");
  await expect(overlay).not.toHaveAttribute("open", "");
});

test("ls lists content and open navigates to a post", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+Shift+C");

  const input = page.locator("#overlay-input");
  await expect(input).toBeFocused();

  // ls shows the top-level tree (folders with counts).
  await input.fill("ls");
  await page.keyboard.press("Enter");
  await expect(page.locator("#overlay-log")).toContainText("blog/");

  // drilling into a folder shows its tree of slugs.
  await input.fill("ls blog");
  await page.keyboard.press("Enter");
  await expect(page.locator("#overlay-log")).toContainText("using-ngrok-to-test-some-web-things");

  // open navigates to the matching post.
  await input.fill("open ngrok");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/blog/2025/using-ngrok-to-test-some-web-things/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ngrok");
});

test("the overlay is not summonable on the books terminal page", async ({ page }) => {
  await page.goto("/books/");
  await page.keyboard.press("Control+Shift+C");
  await expect(page.locator("terminal-overlay")).toHaveCount(0);
});

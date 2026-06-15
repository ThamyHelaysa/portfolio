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

test("session continuity: the overlay reopens with history after open navigates", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+Shift+C");

  const input = page.locator("#overlay-input");
  await expect(input).toBeFocused();

  await input.fill("open ngrok");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/blog/2025/using-ngrok-to-test-some-web-things/");

  // The overlay re-summons itself on the destination (after paint, on idle).
  const overlay = page.locator("terminal-overlay");
  await expect(overlay).toHaveAttribute("open", "", { timeout: 10000 });

  // Scrollback replayed + a cd-style arrival line for the new path.
  await expect(page.locator("#overlay-log")).toContainText(
    "cd ~/blog/2025/using-ngrok-to-test-some-web-things"
  );

  // Arrow-up recalls the command issued before the jump.
  await input.focus();
  await page.keyboard.press("ArrowUp");
  await expect(input).toHaveValue("open ngrok");
});

test("unlock: visiting the books page reveals the site-wide terminal button", async ({ page }) => {
  // Fresh profile (Playwright isolates storage per test): no button, locked.
  await page.goto("/");
  await expect(page.locator(".terminal-launch-desktop")).toBeHidden();
  expect(
    await page.evaluate(() => document.documentElement.classList.contains("term-unlocked"))
  ).toBe(false);

  // Visiting the books terminal sets the persistent unlock flag.
  await page.goto("/books/");
  await page.waitForFunction(() => localStorage.getItem("book_os:unlocked") !== null);

  // Back on a regular page the button is present (revealed pre-paint) ...
  await page.goto("/");
  await expect(page.locator(".terminal-launch-desktop")).toBeVisible();

  // ... and summons the overlay on click.
  await page.locator(".terminal-launch-desktop").click();
  await expect(page.locator("terminal-overlay")).toHaveAttribute("open", "");
});

test("closing the overlay then navigating normally does not resurrect it", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+Shift+C");
  await expect(page.locator("terminal-overlay")).toHaveAttribute("open", "");
  // Wait for the lazy bundle to upgrade the element (input focused) before
  // Escape, otherwise the keydown handler isn't wired yet.
  await expect(page.locator("#overlay-input")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.locator("terminal-overlay")).not.toHaveAttribute("open", "");

  await page.goto("/about/");
  // A normal navigation after closing must not bring the overlay back.
  await expect(page.locator("terminal-overlay")).toHaveCount(0);
});

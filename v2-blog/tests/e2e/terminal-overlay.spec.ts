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

test("after open navigates, the overlay does NOT reopen; history survives for re-summon", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+Shift+C");

  const input = page.locator("#overlay-input");
  await expect(input).toBeFocused();

  await input.fill("open ngrok");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/blog/2025/using-ngrok-to-test-some-web-things/");

  // It must not auto-open on the destination (no continuity reopen).
  await page.waitForTimeout(800);
  await expect(page.locator("terminal-overlay")).toHaveCount(0);

  // Re-summoning gives a fresh log, but arrow-up still recalls the prior command.
  await page.keyboard.press("Control+Shift+C");
  await expect(page.locator("#overlay-input")).toBeFocused();
  await expect(page.locator("#overlay-log")).toBeEmpty();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("#overlay-input")).toHaveValue("open ngrok");
});

test("closes via the ✕ button", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+Shift+C");
  await expect(page.locator("#overlay-input")).toBeFocused();

  await page.locator("#overlay-close").click();
  await expect(page.locator("terminal-overlay")).not.toHaveAttribute("open", "");
});

test("closes via the exit command", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+Shift+C");
  await expect(page.locator("#overlay-input")).toBeFocused();

  await page.locator("#overlay-input").fill("exit");
  await page.keyboard.press("Enter");
  await expect(page.locator("terminal-overlay")).not.toHaveAttribute("open", "");
});

test("closes on a backdrop click", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+Shift+C");
  await expect(page.locator("#overlay-input")).toBeFocused();

  // Click the dimmed backdrop in the top-left, outside the centered window.
  await page.mouse.click(5, 5);
  await expect(page.locator("terminal-overlay")).not.toHaveAttribute("open", "");
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

test("first summon shows the boot flavour and arms the once-ever chime", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+Shift+C");
  await expect(page.locator("#overlay-input")).toBeFocused();

  await expect(page.locator("#overlay-log")).toContainText("reticulating splines");
  // The chime path ran (synthesized via Web Audio) and set its persistent flag.
  expect(await page.evaluate(() => localStorage.getItem("book_os:chimed"))).not.toBeNull();
});

test("reduced motion: the chime does not play (no flag set)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Control+Shift+C");
  await expect(page.locator("#overlay-input")).toBeFocused();

  // Boot text still shows, but the chime is skipped and its flag stays unset.
  await expect(page.locator("#overlay-log")).toContainText("reticulating splines");
  expect(await page.evaluate(() => localStorage.getItem("book_os:chimed"))).toBeNull();
});

test("the theme command switches the theme and syncs the header toggle", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+Shift+C");
  await expect(page.locator("#overlay-input")).toBeFocused();

  await page.locator("#overlay-input").fill("theme dark");
  await page.keyboard.press("Enter");

  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);

  // The header toggle synced to the new theme via the shared theme-change
  // event (its reflected `theme` attribute flips) — no divergent state.
  await expect(page.locator('theme-toggle[theme="dark"]').first()).toBeAttached();
});

test("mobile: summoning from the drawer closes the drawer and opens the modal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });

  // Unlock so the drawer's >_ console entry is present.
  await page.goto("/books/");
  await page.waitForFunction(() => localStorage.getItem("book_os:unlocked") !== null);
  await page.goto("/");

  // Open the mobile drawer, then tap the summon entry.
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const summon = page.locator("menu-mobile [data-terminal-summon]");
  await expect(summon).toBeVisible();
  await summon.click();

  // Drawer closes; the modal opens fullscreen with focus in the input.
  await expect(page.locator("menu-mobile")).not.toHaveAttribute("isopen", "");
  await expect(page.locator("terminal-overlay")).toHaveAttribute("open", "");
  await expect(page.locator("#overlay-input")).toBeFocused();
});

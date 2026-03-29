import { expect, test } from "@playwright/test";

test("home page loads the core shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /blog/i })).toBeVisible();
});

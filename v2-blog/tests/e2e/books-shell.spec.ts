import { expect, test } from "@playwright/test";

test.describe("books shell readability", () => {
  test.describe.configure({ mode: "serial" });

  test.use({ javaScriptEnabled: false });

  test("books index exposes a readable static intro without JavaScript", async ({ page }) => {
    await page.goto("/books/");

    await expect(page.getByRole("heading", { level: 1, name: /book_os library/i })).toBeVisible();
    await expect(page.getByText(/type 'help' or 'list' to explore the library/i)).toBeVisible();
  });

  test("direct book pages keep their content readable without JavaScript", async ({ page }) => {
    await page.goto("/books/o-medico-e-o-monstro/");

    await expect(page.getByText(/AUTHOR: Robert Louis Stevenson/i)).toBeVisible();
    await expect(page.getByText(/Sometimes a guy drinks a potion and does crimes/i)).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";

for (const theme of ["pinky", "dark"]) {
  test(`${theme}: emphasis stays distinct without synthetic glyphs`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
    await page.goto("/blog/2025/using-ngrok-to-test-some-web-things/");
    await page.evaluate(async () => {
      const sample = document.createElement("p");
      sample.id = "typography-sample";
      sample.innerHTML = 'Regular text, <strong>strong emphasis</strong>, <b>bold emphasis</b>, <em>gentle emphasis</em> and <i>alternate voice</i>.';
      document.querySelector("article")!.prepend(sample);
      await document.fonts.ready;
    });

    const sample = page.locator("#typography-sample");
    for (const tag of ["strong", "b", "em", "i"]) {
      const emphasis = sample.locator(tag);
      await expect(emphasis).toHaveCSS("font-synthesis", "none");
      await expect(emphasis).toHaveCSS("font-weight", "400");
      await expect(emphasis).toHaveCSS("font-style", "normal");
      await expect(emphasis).toHaveCSS("text-decoration-line", "none");
      if (tag === "strong" || tag === "b") {
        await expect(emphasis).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      } else {
        await expect(emphasis).toHaveCSS("font-family", /Dreamer Culture/);
        const [ratio, token] = await emphasis.evaluate((el) => [
          parseFloat(getComputedStyle(el).fontSize) / parseFloat(getComputedStyle(el.parentElement!).fontSize),
          parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--text-emphasis") || "1.35"),
        ]);
        expect(ratio).toBeCloseTo(token);
      }
    }

    for (const heading of await page.locator("h1, h2, h3, h4").all()) {
      await expect(heading).toHaveCSS("font-weight", "400");
      await expect(heading).toHaveCSS("font-style", "normal");
    }

    await page.keyboard.press("Control+Shift+C");
    await expect(page.locator("#overlay-input")).toBeFocused();
    await expect(page.locator("#overlay-dialog")).toHaveCSS("font-synthesis", "weight style small-caps");
    await page.goto("/books/");
    await expect(page.locator("body")).toHaveCSS("font-synthesis", "weight style small-caps");
  });
}

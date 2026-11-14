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
      if (tag === "strong" || tag === "b") {
        await expect(emphasis).toHaveCSS("text-decoration-line", "underline");
      } else {
        await expect(emphasis).toHaveCSS("font-family", /Dreamer Culture/);
        await expect(emphasis).toHaveCSS("text-decoration-line", "none");
        expect(await emphasis.evaluate((el) => parseFloat(getComputedStyle(el).fontSize) /
          parseFloat(getComputedStyle(el.parentElement!).fontSize))).toBeCloseTo(1.35);
      }
    }

    const contrast = await sample.evaluate((el) => {
      const luminance = (color: string) => {
        const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((v) => {
          const channel = v / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const bg = luminance(getComputedStyle(document.body).backgroundColor);
      return Array.from(el.children).map((child) => {
        const fg = luminance(getComputedStyle(child).color);
        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      });
    });
    for (const ratio of contrast) expect(ratio).toBeGreaterThanOrEqual(4.5);

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

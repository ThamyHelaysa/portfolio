// utils/waitForVisual.ts
export default function waitForVisual(): Promise<number> {
  return new Promise((resolve) => {
    // Double rAF ensures the browser has calculated styles and is ready to paint
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}
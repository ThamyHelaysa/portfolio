export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

// Runs `callback` the first time `element` enters the viewport, then stops
// watching. Environments without IntersectionObserver (jsdom) run it
// immediately. Returns a cleanup function for disconnectedCallback.
export function onceInViewport(
  element: Element,
  callback: () => void,
  threshold = 0.3,
): () => void {
  if (typeof IntersectionObserver === "undefined") {
    callback();
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        callback();
      }
    },
    { threshold },
  );

  observer.observe(element);
  return () => observer.disconnect();
}

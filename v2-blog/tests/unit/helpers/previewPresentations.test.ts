import { beforeEach, describe, expect, it, vi } from "vitest";

// The disc slide animates through animationManager (WAAPI) — mock it.
const { animatorMock } = vi.hoisted(() => ({
  animatorMock: { animate: vi.fn(), cancel: vi.fn() },
}));
vi.mock("../../../src/_helpers/animationManager.ts", () => ({ animator: animatorMock }));

import {
  AlbumPresentation,
  createMediaPresentations,
} from "../../../src/_helpers/previewPresentations.ts";

describe("previewPresentations", () => {
  beforeEach(() => {
    animatorMock.animate.mockReset();
    animatorMock.animate.mockResolvedValue(undefined);
    animatorMock.cancel.mockReset();
  });

  it("registers a presentation only for album (other kinds render plain)", () => {
    const presentations = createMediaPresentations();
    expect(presentations.album).toBeInstanceOf(AlbumPresentation);
    expect(presentations.book).toBeUndefined();
    expect(presentations.game).toBeUndefined();
    expect(presentations.project).toBeUndefined();
  });

  describe("AlbumPresentation", () => {
    it("builds an album Face holding a Cover image and a vinyl disc", () => {
      const p = new AlbumPresentation();
      expect(p.kind).toBe("album");
      expect(p.el.classList.contains("album-face")).toBe(true);
      const cover = p.el.querySelector("img.album-cover");
      const vinyl = p.el.querySelector("div.album-vinyl");
      expect(cover).not.toBeNull();
      expect(vinyl).not.toBeNull();
      // Cover is decorative — the trigger card carries semantics.
      expect(cover?.getAttribute("alt")).toBe("");
    });

    it("loads a Cover src blurred and clears the blur on decode", () => {
      const p = new AlbumPresentation();
      const cover = p.el.querySelector("img.album-cover") as HTMLImageElement;

      p.loadCover("/assets/images/previews/cover.jpeg");
      expect(cover.getAttribute("src")).toBe("/assets/images/previews/cover.jpeg");
      expect(cover.classList.contains("is-loaded")).toBe(false);

      cover.dispatchEvent(new Event("load"));
      expect(cover.classList.contains("is-loaded")).toBe(true);
    });

    it("clears the blur on error so a failed Cover never stays frosted", () => {
      const p = new AlbumPresentation();
      const cover = p.el.querySelector("img.album-cover") as HTMLImageElement;
      p.loadCover("/assets/broken.jpeg");
      cover.dispatchEvent(new Event("error"));
      expect(cover.classList.contains("is-loaded")).toBe(true);
    });

    it("clears the Cover when given a null src", () => {
      const p = new AlbumPresentation();
      const cover = p.el.querySelector("img.album-cover") as HTMLImageElement;
      p.loadCover("/assets/a.jpeg");
      cover.dispatchEvent(new Event("load"));

      p.loadCover(null);
      expect(cover.hasAttribute("src")).toBe(false);
      expect(cover.classList.contains("is-loaded")).toBe(false);
    });

    it("toggles the Face's is-active on activate/deactivate", () => {
      const p = new AlbumPresentation();
      p.activate();
      expect(p.el.classList.contains("is-active")).toBe(true);
      p.deactivate();
      expect(p.el.classList.contains("is-active")).toBe(false);
    });

    it("play() lifts the disc to the front, spins it, and animates the slide", () => {
      const p = new AlbumPresentation();
      const disc = p.el.querySelector(".album-vinyl") as HTMLElement;

      p.play({ reducedMotion: false });

      expect(disc.classList.contains("is-front")).toBe(true);
      expect(p.el.classList.contains("is-spinning")).toBe(true);
      expect(animatorMock.animate).toHaveBeenCalledTimes(1);
      expect(animatorMock.animate.mock.calls[0][0]).toBe(disc);
    });

    it("play() under reduced motion is audio-only: no disc motion at all", () => {
      const p = new AlbumPresentation();
      const disc = p.el.querySelector(".album-vinyl") as HTMLElement;

      p.play({ reducedMotion: true });

      expect(disc.classList.contains("is-front")).toBe(false);
      expect(p.el.classList.contains("is-spinning")).toBe(false);
      expect(animatorMock.animate).not.toHaveBeenCalled();
    });

    it("stop() halts the spin and slides the disc back behind the Cover", async () => {
      const p = new AlbumPresentation();
      const disc = p.el.querySelector(".album-vinyl") as HTMLElement;

      p.play({ reducedMotion: false });
      p.stop();

      expect(p.el.classList.contains("is-spinning")).toBe(false);
      // A return slide is animated; is-front drops once it resolves.
      expect(animatorMock.animate).toHaveBeenCalledTimes(2);
      await Promise.resolve();
      expect(disc.classList.contains("is-front")).toBe(false);
    });

    it("deactivate() resets the disc transform and cancels any animation", () => {
      const p = new AlbumPresentation();
      const disc = p.el.querySelector(".album-vinyl") as HTMLElement;
      disc.style.transform = "translate(58%, -50%)";

      p.play({ reducedMotion: false });
      p.deactivate();

      expect(disc.classList.contains("is-front")).toBe(false);
      expect(p.el.classList.contains("is-spinning")).toBe(false);
      expect(disc.style.transform).toBe("");
      expect(animatorMock.cancel).toHaveBeenCalledWith(disc);
    });
  });
});

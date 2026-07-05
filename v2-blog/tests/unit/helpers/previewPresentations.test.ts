import { describe, expect, it } from "vitest";
import {
  AlbumPresentation,
  createMediaPresentations,
} from "../../../src/_helpers/previewPresentations.ts";

describe("previewPresentations", () => {
  it("registers a presentation only for album (other kinds render plain)", () => {
    const presentations = createMediaPresentations();
    expect(presentations.album).toBeInstanceOf(AlbumPresentation);
    expect(presentations.book).toBeUndefined();
    expect(presentations.game).toBeUndefined();
    expect(presentations.project).toBeUndefined();
  });

  describe("AlbumPresentation", () => {
    it("builds a container holding a Cover image and a vinyl layer", () => {
      const p = new AlbumPresentation();
      expect(p.kind).toBe("album");
      expect(p.el.classList.contains("album-presentation")).toBe(true);
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

    it("toggles the container's visible class on activate/deactivate", () => {
      const p = new AlbumPresentation();
      p.activate();
      expect(p.el.classList.contains("visible")).toBe(true);
      p.deactivate();
      expect(p.el.classList.contains("visible")).toBe(false);
    });
  });
});

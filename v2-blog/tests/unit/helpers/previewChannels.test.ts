import { describe, expect, it, vi } from "vitest";
import {
  AudioChannel,
  ImageChannel,
  VideoChannel,
  createMediaChannels,
} from "../../../src/_helpers/previewChannels.ts";

describe("previewChannels", () => {
  it("builds one channel per type, each with its element", () => {
    const channels = createMediaChannels();
    expect(channels.image).toBeInstanceOf(ImageChannel);
    expect(channels.video).toBeInstanceOf(VideoChannel);
    expect(channels.audio).toBeInstanceOf(AudioChannel);
    expect(channels.image.el.tagName).toBe("IMG");
    expect(channels.video.el.tagName).toBe("VIDEO");
    expect(channels.audio.el.tagName).toBe("AUDIO");
  });

  describe("ImageChannel", () => {
    it("loads a src blurred, clears the blur on decode, activates/deactivates", () => {
      const ch = new ImageChannel();

      ch.load("/assets/a.webp");
      expect(ch.el.classList.contains("is-loaded")).toBe(false);

      ch.el.dispatchEvent(new Event("load"));
      expect(ch.el.classList.contains("is-loaded")).toBe(true);

      ch.activate();
      expect(ch.el.classList.contains("visible")).toBe(true);
      ch.deactivate();
      expect(ch.el.classList.contains("visible")).toBe(false);
    });

    it("clears the blur on error so a failed load never stays frosted", () => {
      const ch = new ImageChannel();
      ch.load("/assets/broken.webp");
      ch.el.dispatchEvent(new Event("error"));
      expect(ch.el.classList.contains("is-loaded")).toBe(true);
    });

    it("has no-op play/pause (images are reveal-only)", () => {
      const ch = new ImageChannel();
      expect(() => ch.play()).not.toThrow();
      expect(() => ch.pause()).not.toThrow();
      expect(ch.play()).toBeUndefined();
    });
  });

  describe("VideoChannel", () => {
    it("re-blurs on src change and clears on canplay", () => {
      const ch = new VideoChannel();
      ch.el.classList.add("is-loaded");

      ch.load("/assets/a.mp4");
      expect(ch.el.classList.contains("is-loaded")).toBe(false);

      ch.el.dispatchEvent(new Event("canplay"));
      expect(ch.el.classList.contains("is-loaded")).toBe(true);
    });

    it("delegates play and guards pause on the paused flag", () => {
      const ch = new VideoChannel();
      const play = vi.fn().mockResolvedValue(undefined);
      const pause = vi.fn();
      Object.defineProperty(ch.el, "play", { configurable: true, value: play });
      Object.defineProperty(ch.el, "pause", { configurable: true, value: pause });

      Object.defineProperty(ch.el, "paused", { configurable: true, get: () => false });
      ch.play();
      ch.pause();
      expect(play).toHaveBeenCalledTimes(1);
      expect(pause).toHaveBeenCalledTimes(1);

      // Already paused → pause() is a no-op, no redundant call.
      Object.defineProperty(ch.el, "paused", { configurable: true, get: () => true });
      ch.pause();
      expect(pause).toHaveBeenCalledTimes(1);
    });
  });

  describe("AudioChannel", () => {
    it("has no visual: activate/deactivate never touch the visible class", () => {
      const ch = new AudioChannel();
      ch.activate();
      expect(ch.el.classList.contains("visible")).toBe(false);
      ch.deactivate();
      expect(ch.el.classList.contains("visible")).toBe(false);
    });

    it("delegates play and guards pause", () => {
      const ch = new AudioChannel();
      const play = vi.fn().mockResolvedValue(undefined);
      const pause = vi.fn();
      Object.defineProperty(ch.el, "play", { configurable: true, value: play });
      Object.defineProperty(ch.el, "pause", { configurable: true, value: pause });
      Object.defineProperty(ch.el, "paused", { configurable: true, get: () => false });

      ch.play();
      ch.pause();
      expect(play).toHaveBeenCalledTimes(1);
      expect(pause).toHaveBeenCalledTimes(1);
    });
  });
});

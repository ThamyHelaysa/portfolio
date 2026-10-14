import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { acquireCandidate } from "../../../scripts/fav/acquisition.ts";

afterEach(() => vi.unstubAllGlobals());

describe("Favorite candidate acquisition", () => {
  it.each([undefined, "1"])("caps streaming downloads with Content-Length %s", async (length) => {
    const directory = await mkdtemp(path.join(tmpdir(), "fav-acquisition-"));
    let chunksRead = 0;
    const cancel = vi.fn();
    const body = new ReadableStream({
      /** Supplies a 100 MB response one MB at a time. */
      pull(controller) {
        chunksRead += 1;
        controller.enqueue(new Uint8Array(1024 * 1024));
        if (chunksRead === 100) controller.close();
      },
      cancel,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, {
      headers: length ? { "content-length": length } : {},
    })));

    try {
      await expect(
        acquireCandidate("https://example.com/cover", directory),
      ).rejects.toThrow("Image exceeds 25 MB download limit.");
      expect(chunksRead).toBeLessThan(30);
      expect(cancel).toHaveBeenCalledOnce();
      await expect(readdir(directory)).resolves.toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("accepts a streamed image exactly at the 25 MB cap", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "fav-acquisition-"));
    let chunksRead = 0;
    const body = new ReadableStream({
      /** Streams a candidate exactly at the download limit. */
      pull(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024));
        chunksRead += 1;
        if (chunksRead === 25) controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));

    try {
      const candidate = await acquireCandidate("https://example.com/cover", directory);
      expect((await stat(candidate)).size).toBe(25 * 1024 * 1024);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("aborts before reading a response declared over the cap", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "fav-acquisition-"));
    const fetch = vi.fn().mockResolvedValue(new Response("unused", {
      headers: { "content-length": "26214401" },
    }));
    vi.stubGlobal("fetch", fetch);

    try {
      await expect(acquireCandidate("https://example.com/cover", directory))
        .rejects.toThrow("Image exceeds 25 MB download limit.");
      expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
      await expect(readdir(directory)).resolves.toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("removes partial downloads when a stream fails", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "fav-acquisition-"));
    let chunksRead = 0;
    const body = new ReadableStream({
      /** Fails after the writer has received part of the candidate. */
      pull(controller) {
        chunksRead += 1;
        if (chunksRead > 2) controller.error(new Error("Connection lost"));
        else controller.enqueue(new Uint8Array(1024));
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));

    try {
      await expect(acquireCandidate("https://example.com/cover", directory))
        .rejects.toThrow("Connection lost");
      await expect(readdir(directory)).resolves.toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("copies a local extension-less image with a preview-safe filename", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "fav-acquisition-"));
    const source = path.join(directory, "source");
    try {
      await writeFile(source, "local image");
      const candidate = await acquireCandidate(source, directory);
      expect(path.basename(candidate)).toBe("candidate.jpg");
      await expect(readFile(candidate, "utf8")).resolves.toBe("local image");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it.each([
    ["cover", ".jpg"],
    ["cover.img", ".jpg"],
    ["cover.unknown", ".jpg"],
    ["cover.PNG?size=large", ".png"],
  ])(
    "gives %s a filename macOS can preview as an image",
    async (pathname, extension) => {
      const directory = await mkdtemp(path.join(tmpdir(), "fav-acquisition-"));
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("image bytes")));

      try {
        const candidate = await acquireCandidate(`https://example.com/${pathname}`, directory);
        expect(path.basename(candidate)).toBe(`candidate${extension}`);
        await expect(readFile(candidate, "utf8")).resolves.toBe("image bytes");
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );
});

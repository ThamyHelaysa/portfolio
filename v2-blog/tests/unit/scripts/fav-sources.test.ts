import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeIsbn,
  openLibraryIsbnCover,
  searchItunesTracks,
  searchOpenLibraryBooks,
} from "../../../scripts/fav/sources.ts";

afterEach(() => vi.unstubAllGlobals());

/** Stubs fetch with one JSON payload and returns the spy. */
function stubJson(payload: unknown, init?: ResponseInit) {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(payload), init));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("iTunes track source", () => {
  it("maps a track onto occupant fields and full-size artwork", async () => {
    const fetch = stubJson({
      results: [{
        trackName: "Cochise",
        artistName: "Audioslave",
        collectionName: "Audioslave",
        trackTimeMillis: 221978,
        previewUrl: "https://audio-ssl.itunes.apple.com/preview.m4a",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/a/b.jpg/100x100bb.jpg",
      }],
    });

    const [candidate] = await searchItunesTracks("audioslave cochise");

    expect(candidate).toEqual({
      title: "Cochise",
      details: "Audioslave",
      label: "Cochise — Audioslave · Audioslave · 3:41",
      audioUrl: "https://audio-ssl.itunes.apple.com/preview.m4a",
      imageUrl: "https://is1-ssl.mzstatic.com/image/thumb/a/b.jpg/600x600bb.jpg",
    });
    const requested = new URL(fetch.mock.calls[0][0]);
    expect(requested.searchParams.get("entity")).toBe("song");
    expect(requested.searchParams.get("term")).toBe("audioslave cochise");
  });

  it("keeps an artwork URL whose size segment it does not recognise", async () => {
    stubJson({
      results: [{
        trackName: "Unknown shape",
        previewUrl: "https://audio.example/preview.m4a",
        artworkUrl100: "https://images.example/cover.png",
      }],
    });

    const [candidate] = await searchItunesTracks("anything");

    expect(candidate.imageUrl).toBe("https://images.example/cover.png");
  });

  it.each([
    { trackName: "No preview", artworkUrl100: "https://a/100x100bb.jpg" },
    { previewUrl: "https://audio.example/preview.m4a" },
  ])("drops a result missing a track name or preview", async (result) => {
    stubJson({ results: [result] });

    await expect(searchItunesTracks("query")).resolves.toEqual([]);
  });

  it("reports an unusable duration rather than guessing", async () => {
    stubJson({
      results: [{
        trackName: "No duration",
        previewUrl: "https://audio.example/preview.m4a",
      }],
    });

    const [candidate] = await searchItunesTracks("query");

    expect(candidate.label).toContain("?:??");
  });

  it("names the source when the search fails", async () => {
    stubJson({}, { status: 503, statusText: "Service Unavailable" });

    await expect(searchItunesTracks("query")).rejects.toThrow(
      "iTunes search failed: 503 Service Unavailable",
    );
  });
});

describe("OpenLibrary book source", () => {
  it("maps a doc onto occupant fields and its cover", async () => {
    const fetch = stubJson({
      docs: [{
        title: "The Canterville Ghost",
        author_name: ["Oscar Wilde", "Someone Else"],
        cover_i: 6960817,
        first_publish_year: 1887,
      }],
    });

    const [candidate] = await searchOpenLibraryBooks("canterville ghost");

    expect(candidate).toEqual({
      title: "The Canterville Ghost",
      details: "Oscar Wilde",
      label: "The Canterville Ghost — Oscar Wilde · 1887",
      imageUrl: "https://covers.openlibrary.org/b/id/6960817-L.jpg",
    });
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get("q")).toBe(
      "canterville ghost",
    );
  });

  it("drops a doc with no cover, since the cover is the point", async () => {
    stubJson({ docs: [{ title: "Coverless", author_name: ["Nobody"] }] });

    await expect(searchOpenLibraryBooks("coverless")).resolves.toEqual([]);
  });

  it.each([
    ["9780140328721", "9780140328721"],
    ["978-0-14-032872-1", "9780140328721"],
    ["043942089X", "043942089X"],
  ])("addresses the cover directly for ISBN %s", async (query, isbn) => {
    const fetch = stubJson({ docs: [] });

    const candidates = await searchOpenLibraryBooks(query);

    expect(fetch).not.toHaveBeenCalled();
    expect(candidates).toEqual([{
      title: "",
      details: "",
      label: `ISBN ${isbn} — cover lookup`,
      imageUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    }]);
  });

  it("names the source when the search fails", async () => {
    stubJson({}, { status: 500, statusText: "Internal Server Error" });

    await expect(searchOpenLibraryBooks("query")).rejects.toThrow(
      "OpenLibrary search failed: 500 Internal Server Error",
    );
  });
});

describe("ISBN recognition", () => {
  it.each(["canterville ghost", "12345", "97801403287211", "043942089Y"])(
    "treats %s as a title query",
    (query) => {
      expect(normalizeIsbn(query)).toBeNull();
    },
  );

  it("builds the ISBN cover URL", () => {
    expect(openLibraryIsbnCover("9780140328721")).toBe(
      "https://covers.openlibrary.org/b/isbn/9780140328721-L.jpg",
    );
  });
});

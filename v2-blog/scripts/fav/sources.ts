const ITUNES_SEARCH = "https://itunes.apple.com/search";
const OPENLIBRARY_SEARCH = "https://openlibrary.org/search.json";
const OPENLIBRARY_COVERS = "https://covers.openlibrary.org/b";
const CANDIDATE_LIMIT = 8;

export interface SourceCandidate {
  /** Occupant title the pick prefills. */
  title: string;
  /** Occupant details the pick prefills. */
  details: string;
  /** One-line summary shown in the picker. */
  label: string;
  /** Cover artwork to download, when the source offers one. */
  imageUrl?: string;
  /** Audio excerpt to download, when the source offers one. */
  audioUrl?: string;
}

/**
 * Reads a keyless JSON endpoint, failing with the source name on a bad status.
 */
async function fetchSourceJson(
  sourceName: string,
  url: URL,
): Promise<unknown> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(
      `${sourceName} search failed: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

/**
 * Trades iTunes' 100px thumbnail for the largest size its CDN serves.
 *
 * The size lives in the URL path rather than a query parameter and Apple does
 * not document it, so an unrecognised shape keeps the thumbnail instead of
 * guessing.
 */
function upscaleItunesArtwork(artworkUrl: string): string {
  return artworkUrl.replace(/\/\d+x\d+bb\.jpg$/, "/600x600bb.jpg");
}

/**
 * Renders a track duration as m:ss for the picker.
 */
function formatTrackTime(milliseconds: unknown): string {
  if (typeof milliseconds !== "number" || !Number.isFinite(milliseconds)) {
    return "?:??";
  }
  // Floor, not round: players show a 3:41.9 track as 3:41, and the label
  // exists so the author recognises the track they already know.
  const totalSeconds = Math.floor(milliseconds / 1000);
  const seconds = totalSeconds % 60;
  return `${Math.floor(totalSeconds / 60)}:${String(seconds).padStart(2, "0")}`;
}

interface ItunesTrack {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  artworkUrl100?: string;
}

/**
 * Searches iTunes for tracks that can fill the album slot.
 *
 * Songs rather than albums: one request then yields the artwork and the
 * excerpt together, and the slot stores a track title beside its artist.
 */
export async function searchItunesTracks(
  query: string,
): Promise<SourceCandidate[]> {
  const url = new URL(ITUNES_SEARCH);
  url.searchParams.set("term", query);
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", String(CANDIDATE_LIMIT));

  const payload = (await fetchSourceJson("iTunes", url)) as {
    results?: ItunesTrack[];
  };
  return (payload.results ?? [])
    .filter((track) => track.trackName && track.previewUrl)
    .map((track) => ({
      title: track.trackName as string,
      details: track.artistName ?? "",
      label: [
        `${track.trackName} — ${track.artistName ?? "unknown artist"}`,
        track.collectionName,
        formatTrackTime(track.trackTimeMillis),
      ]
        .filter(Boolean)
        .join(" · "),
      audioUrl: track.previewUrl,
      imageUrl: track.artworkUrl100
        ? upscaleItunesArtwork(track.artworkUrl100)
        : undefined,
    }));
}

interface OpenLibraryDoc {
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

/**
 * Builds the OpenLibrary cover URL for an ISBN.
 */
export function openLibraryIsbnCover(isbn: string): string {
  return `${OPENLIBRARY_COVERS}/isbn/${isbn}-L.jpg`;
}

/**
 * Recognises a bare ISBN-10 or ISBN-13, ignoring separators.
 */
export function normalizeIsbn(query: string): string | null {
  const digits = query.replace(/[\s-]/g, "");
  return /^(?:\d{9}[\dX]|\d{13})$/i.test(digits) ? digits : null;
}

/**
 * Searches OpenLibrary for books whose cover can fill the books slot.
 *
 * A query that is just an ISBN skips the search and addresses the cover
 * directly, which is the only lookup that works for an edition the title
 * search ranks poorly.
 */
export async function searchOpenLibraryBooks(
  query: string,
): Promise<SourceCandidate[]> {
  const isbn = normalizeIsbn(query);
  if (isbn) {
    return [{
      title: "",
      details: "",
      label: `ISBN ${isbn} — cover lookup`,
      imageUrl: openLibraryIsbnCover(isbn),
    }];
  }

  const url = new URL(OPENLIBRARY_SEARCH);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(CANDIDATE_LIMIT));
  url.searchParams.set(
    "fields",
    "title,author_name,cover_i,first_publish_year",
  );

  const payload = (await fetchSourceJson("OpenLibrary", url)) as {
    docs?: OpenLibraryDoc[];
  };
  return (payload.docs ?? [])
    .filter((doc) => doc.title && doc.cover_i)
    .map((doc) => ({
      title: doc.title as string,
      details: doc.author_name?.[0] ?? "",
      label: [
        `${doc.title} — ${doc.author_name?.[0] ?? "unknown author"}`,
        doc.first_publish_year,
      ]
        .filter(Boolean)
        .join(" · "),
      imageUrl: `${OPENLIBRARY_COVERS}/id/${doc.cover_i}-L.jpg`,
    }));
}

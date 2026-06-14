// Build-time site index for the terminal `ls` / `open` commands.
// Emits /assets/site-index.json from the published collections plus the
// top-level pages collection. Every URL comes from the real Eleventy
// permalink (never hardcoded). Drafts and future-dated content are excluded
// by `published` / `books`. Individual notes have no pages (permalink:false)
// and are intentionally omitted; the /notes/ listing is a page.

export const data = {
  permalink: "/assets/site-index.json",
  eleventyExcludeFromCollections: true,
};

export function render({ collections }) {
  const entries = [];

  for (const post of collections.published || []) {
    entries.push({
      section: "blog",
      title: post.data.title,
      url: post.url,
      date: post.date ? new Date(post.date).toISOString() : undefined,
      description: post.data.description,
    });
  }

  for (const book of collections.books || []) {
    entries.push({
      section: "books",
      title: book.data.title,
      url: book.url,
      description: book.data.description,
    });
  }

  for (const page of collections.pages || []) {
    entries.push({
      section: "pages",
      title: page.data.title,
      url: page.url,
      description: page.data.description,
    });
  }

  return JSON.stringify(entries);
}

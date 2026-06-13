// Build-time site index for the terminal `ls` / `open` commands.
// Emits /assets/site-index.json from the published collections. Drafts and
// future-dated content are already excluded by `published` / `books`.
// Individual notes have no pages (permalink:false) and are intentionally omitted;
// the /notes/ listing is included as a page.

const PAGES = [
  { title: "Home", url: "/" },
  { title: "Blog", url: "/blog/" },
  { title: "Notes", url: "/notes/" },
  { title: "Books", url: "/books/" },
  { title: "About", url: "/about/" },
  { title: "Games", url: "/games/" },
  { title: "Copyright", url: "/copyright/" },
];

export const data = {
  permalink: "/assets/site-index.json",
  eleventyExcludeFromCollections: true,
};

export function render({ collections }) {
  const entries = [];

  for (const post of collections.published || []) {
    entries.push({
      section: "posts",
      title: post.data.title,
      url: post.url,
      date: post.date ? new Date(post.date).toISOString() : undefined,
    });
  }

  for (const book of collections.books || []) {
    entries.push({ section: "books", title: book.data.title, url: book.url });
  }

  for (const page of PAGES) {
    entries.push({ section: "pages", title: page.title, url: page.url });
  }

  return JSON.stringify(entries);
}

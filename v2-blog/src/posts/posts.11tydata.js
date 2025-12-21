export const layout = "post.njk";
export const tags = ["posts"];
export const eleventyComputed = {
  permalink: data => {
    // 1. Get the date safely
    const d = new Date(data.date || new Date());
    const year = d.getFullYear();
    // 2. Slugify the title
    const slug = data.page.fileSlug;
    // 3. Return the new path
    return `/blog/${year}/${slug}/`;
  }
};
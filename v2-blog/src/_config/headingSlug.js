import slugify from "slugify";

/** Create the canonical slug for headings, post folders, and Favorite assets. */
export function headingSlug(value) {
  return slugify(String(value), {
    lower: true,
    strict: true,
    remove: /["]/g,
  });
}

import slugify from "slugify";

/** Create the canonical anchor slug used by rendered post headings. */
export function headingSlug(value) {
  return slugify(String(value), {
    lower: true,
    strict: true,
    remove: /["]/g,
  });
}

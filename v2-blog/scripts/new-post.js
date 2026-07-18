// scripts/new-post.js
// Scaffolds a new blog post: src/posts/<slug>/index.md
//
// Usage:
//   npm run new:post -- "My cool post title"
//
// The folder name becomes the URL slug (permalink is /blog/<year>/<slug>/,
// computed in src/posts/posts.11tydata.js from the post date + fileSlug).
// The post starts as draft: true — on publish, remove that line and bump
// `date` to the publish day so the permalink year is correct.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_DIR = path.join(__dirname, "..", "src", "posts");

function slugify(title) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (pt-BR titles)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isoToday() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function template(title, date) {
  return `---
title: "${title.replace(/"/g, '\\"')}"
date: "${date}"
draft: true
description: ""
# updateDate: ""
# mood:
#     label: "annoyed at Safari >.<"
#     level: 4
tags:
    - dev
---

Intro paragraph. Hook the reader — what happened, why it matters.

> **Note:** Optional skip-link for the impatient: [The fix](#the-fix).

## The problem

What broke / what you were trying to do.

{% raw %}
<!-- Available elements (delete this block before publishing):

Video (paired shortcode, files in src/assets/videos/):
{% videoContainer "demo-desktop.mp4", "demo-mobile.mp4", "loop" %}
  Caption text for the video.
{% endvideoContainer %}

Error console blockquote:
<blockquote class="error-block block">
Exact error message here.
</blockquote>

Warning blockquote:
<blockquote class="warning-block block">
Warning text here.
</blockquote>

Dialogue bit:
***Oracle:*** Question someone asked?</br>
***Me:*** Your reaction.</br></br>

External link (always noreferrer + blank):
<a rel="noreferrer" target="_blank" href="https://example.com">link text</a>
-->
{% endraw %}

## The fix

How you solved it.

### Recap

1. First takeaway;
2. Second takeaway.

## The end

Closing thoughts, thanks for reading.

[**I was here.**](/copyrighty/)
`;
}

function main() {
  const title = process.argv.slice(2).join(" ").trim();

  if (!title) {
    console.error('Usage: npm run new:post -- "My cool post title"');
    process.exit(1);
  }

  const slug = slugify(title);
  if (!slug) {
    console.error(`Could not build a slug from "${title}".`);
    process.exit(1);
  }

  const postDir = path.join(POSTS_DIR, slug);
  const postFile = path.join(postDir, "index.md");

  if (fs.existsSync(postDir)) {
    console.error(`Post already exists: ${path.relative(process.cwd(), postDir)}`);
    process.exit(1);
  }

  fs.mkdirSync(postDir, { recursive: true });
  fs.writeFileSync(postFile, template(title, isoToday()), "utf8");

  console.log(`Created ${path.relative(process.cwd(), postFile)}`);
  console.log("Draft — remove `draft: true` and set `date` to the publish day when ready.");
}

main();

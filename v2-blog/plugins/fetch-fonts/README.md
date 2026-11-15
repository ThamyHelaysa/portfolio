# fetch-fonts

Local Netlify Build Plugin. On production builds it downloads the licensed
webfonts from the site-wide Netlify Blobs store `licensed-fonts` into
`fonts/`, where `eleventy.config.ts` picks them up. Other contexts (deploy
previews, branch deploys) and builds outside Netlify use the fallback fonts.
A production build fails if any file is missing.

Credentials come from the build (`SITE_ID`, `NETLIFY_API_TOKEN`); no token is
configured anywhere. The plugin only reads the store.

## Uploading the fonts (one-off, or when the files change)

From `v2-blog/`, with the files from the vendor download in `fonts/`:

```bash
npx netlify-cli login
npx netlify-cli link   # pick the v2-blog site
for f in dreamer-culture-regular.woff2 dreamer-culture-regular.woff \
         ingram-mono-regular.woff2 ingram-mono-regular.woff; do
  npx netlify-cli blobs:set licensed-fonts "$f" --input "fonts/$f"
done
npx netlify-cli blobs:list licensed-fonts
```

Only the `.woff`/`.woff2` binaries go up; the vendor `.css` files stay local
(their copyright comment is already in `src/_includes/css/fonts.css`). The
vendor account remains the source of truth.

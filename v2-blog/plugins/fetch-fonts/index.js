// Licensed webfonts can't live in this public repo (EULA 2.11), so production
// builds pull them from a Netlify Blobs store. Upload steps: README.md here.
import { mkdir, writeFile } from "node:fs/promises";
import { getStore } from "@netlify/blobs";

export const STORE = "licensed-fonts";
export const FILES = [
  "dreamer-culture-regular.woff2",
  "dreamer-culture-regular.woff",
  "ingram-mono-regular.woff2",
  "ingram-mono-regular.woff",
];

export const onPreBuild = async ({ constants, utils }) => {
  // The licence covers one domain; previews and branch deploys use the fallback stack.
  if (process.env.CONTEXT !== "production") {
    console.log(`fetch-fonts: "${process.env.CONTEXT}" context, using fallback fonts.`);
    return;
  }
  try {
    const store = getStore({
      name: STORE,
      siteID: constants.SITE_ID,
      token: constants.NETLIFY_API_TOKEN,
    });
    await mkdir("fonts", { recursive: true });
    for (const file of FILES) {
      const data = await store.get(file, { type: "arrayBuffer" });
      if (!data) throw new Error(`"${file}" missing from store "${STORE}"`);
      await writeFile(`fonts/${file}`, new Uint8Array(data));
    }
    console.log(`fetch-fonts: ${FILES.length} licensed font files fetched.`);
  } catch (error) {
    // Fail rather than silently ship fallback fonts; the previous deploy stays live.
    utils.build.failBuild("fetch-fonts: could not fetch licensed fonts", { error });
  }
};

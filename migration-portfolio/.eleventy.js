import fs from 'fs';
import path from 'path';
import cssnano from 'cssnano';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss'; // Assuming Tailwind v4 or the postcss plugin
import collections from "./config/collections.js";

export default function (eleventyConfig) {

  // 1. WATCH TARGET: Tell Eleventy to watch your CSS source files
  // If you don't add this, you have to restart the server to see CSS changes.
  eleventyConfig.addWatchTarget("./src/assets/styles/");

  // 2. COMPILE TAILWIND
  eleventyConfig.on('eleventy.before', async () => {
    // INPUT: Where your source CSS lives
    const tailwindInputPath = path.resolve('./src/assets/styles/index.css');
    
    // OUTPUT: MUST match the path in your HTML <link> tag
    // Changed from 'styles/index.css' to 'css/main.css' to match your error log
    const tailwindOutputPath = './dist/assets/css/main.css'; 
    
    const cssContent = fs.readFileSync(tailwindInputPath, 'utf8');

    const outputDir = path.dirname(tailwindOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const result = await processor.process(cssContent, {
      from: tailwindInputPath,
      to: tailwindOutputPath,
    });

    fs.writeFileSync(tailwindOutputPath, result.css);
  });

  const processor = postcss([
    tailwindcss(),
    cssnano({ preset: 'default' }),
  ]);

  // Collections
  Object.keys(collections).forEach(collectionName => {
    eleventyConfig.addCollection(collectionName, collections[collectionName]);
  });

  // 3. PASSTHROUGH FIX
  // Avoid copying the raw CSS folder if it's inside assets. 
  // We only want the compiled version.
  // Using a glob pattern to copy everything in assets EXCEPT the styles folder if needed.
  // For now, simpler is:
  eleventyConfig.addPassthroughCopy("src/assets/images"); 
  eleventyConfig.addPassthroughCopy("src/assets/fonts");
  // Do NOT passthrough "src/assets" broadly if it contains your raw source CSS, 
  // or it might overwrite your compiled file during the build race.

  eleventyConfig.addPassthroughCopy("src/components");

  return {
    dir: {
      input: 'src',
      output: 'dist',
      includes: '_includes',
      layouts: '_layouts'
    }
  };
}
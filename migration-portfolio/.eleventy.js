import fs from 'fs';
import path from 'path';
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss'; // Assuming Tailwind v4 or the postcss plugin
import collections from "./src/_config/collections.js";
import shortcodes from "./src/_config/shortcodes.js";
import filters from './src/_config/filters.js';

export default function (eleventyConfig) {

  // Watch CSS files
  eleventyConfig.addWatchTarget("./src/assets/styles/");

  // Compile tailwind
  eleventyConfig.on('eleventy.before', async () => {
    // INPUT: Where your source CSS lives
    const tailwindInputPath = path.resolve('./src/assets/styles/index.css');
    
    // OUTPUT: MUST match the path in your HTML <link> tag
    const tailwindOutputPath = './dist/assets/css/index.css'; 
    
    const cssContent = fs.readFileSync(tailwindInputPath, 'utf8');

    const outputDir = path.dirname(tailwindOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const result = await processor.process(cssContent, {
      from: path.resolve(tailwindInputPath),
      to: path.resolve(tailwindOutputPath),
    });

    fs.writeFileSync(tailwindOutputPath, result.css);
  });

  const processor = postcss([
    tailwindcss(),
    autoprefixer(),
    cssnano({ preset: 'default' }),
  ]);

  // Collections
  // Object.keys(collections).forEach(collectionName => {
  // });
  eleventyConfig.addCollection("posts", collections.posts);
  eleventyConfig.addCollection("projects", collections.projects);

  // Filters
  eleventyConfig.addFilter("formatYear", filters.formatYear);
  eleventyConfig.addFilter("formatDatefull", filters.formatDateFull);

  // Shortcodes
  eleventyConfig.addPairedShortcode("sectionBlock", shortcodes.sectionBlock);
  eleventyConfig.addPairedShortcode("blogSectionBlock", shortcodes.blogSectionBlock);

  // Avoid copying the raw CSS folder if it's inside assets. 
  // We only want the compiled version.
  // Using a glob pattern to copy everything in assets EXCEPT the styles folder if needed.
  // For now, simpler is:
  eleventyConfig.addPassthroughCopy("src/assets/css"); 
  // eleventyConfig.addPassthroughCopy("src/assets/fonts");
  // Do NOT passthrough "src/assets" broadly if it contains your raw source CSS, 
  // or it might overwrite your compiled file during the build race.


  return {
    dir: {
      input: 'src',
      output: 'dist',
      includes: '_includes',
      layouts: '_layouts'
    },
    markdownTemplateEngine: "njk", // this is fine
    htmlTemplateEngine: "njk",
  };
}
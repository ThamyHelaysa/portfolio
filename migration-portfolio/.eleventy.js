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
    // const tailwindInputPath = path.resolve('./src/assets/styles/global.css');
    // 1. Define your compilation targets
    const targets = [
      {
        input: './src/assets/styles/global.css',
        output: './dist/assets/css/global.css'
      },
      {
        input: './src/assets/styles/shadow.css',
        output: './dist/assets/css/shadow.css'
      }
    ];

    for (const target of targets) {
      const inputPath = path.resolve(target.input);
      const outputPath = path.resolve(target.output);

      // Ensure input exists to avoid crashing
      if (!fs.existsSync(inputPath)) {
        console.warn(`⚠️ CSS Input not found: ${inputPath}`);
        continue;
      }

      const cssContent = fs.readFileSync(inputPath, 'utf8');
      const outputDir = path.dirname(outputPath);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Process with Tailwind
      const result = await processor.process(cssContent, {
        from: inputPath,
        to: outputPath,
      });

      fs.writeFileSync(outputPath, result.css);
      console.log(`[Tailwind] Compiled: ${target.input} -> ${target.output}`);
    }
    // OUTPUT: MUST match the path in your HTML <link> tag
    // const tailwindOutputPath = './dist/assets/css/global.css'; 

    // const cssContent = fs.readFileSync(tailwindInputPath, 'utf8');

    // const outputDir = path.dirname(tailwindOutputPath);
    // if (!fs.existsSync(outputDir)) {
    //   fs.mkdirSync(outputDir, { recursive: true });
    // }

    // const result = await processor.process(cssContent, {
    //   from: path.resolve(tailwindInputPath),
    //   to: path.resolve(tailwindOutputPath),
    // });

    // fs.writeFileSync(tailwindOutputPath, result.css);
  });

  const processor = postcss([
    tailwindcss(),
    autoprefixer(),
    cssnano({ preset: 'default' }),
  ]);

  // eleventyConfig.addCollection("posts", collections.posts);
  eleventyConfig.addCollection("projects", collections.projects);
  eleventyConfig.addCollection("published", collections.published);

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

  eleventyConfig.addPassthroughCopy("src/components/*.js");
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
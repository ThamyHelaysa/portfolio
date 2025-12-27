import fs from 'node:fs';
import path from 'node:path';
import esbuild from "esbuild";
import { createHash } from 'node:crypto';

import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import collections from './src/_config/collections.js';
import shortcodes from "./src/_config/shortcodes.js";
import filters from './src/_config/filters.js';

export default function (eleventyConfig: any) {

  // Watch CSS files
  eleventyConfig.addWatchTarget("./src/assets/styles/**/*.css");

  const processor = postcss([
    tailwindcss(),
    autoprefixer(),
    cssnano({ preset: 'default' }),
  ]);

  eleventyConfig.addExtension("ts", {
    outputFileExtension: "js", // Output as .js
    compile: async (_: any, inputPath: string) => {
      // Skip files outside the '_helpers and components' directory 
      if (!inputPath.includes("_helpers") && !inputPath.includes("components")) return;

      return async (_: any) => {
        // Compile using esbuild
        const result = await esbuild.build({
          entryPoints: [inputPath],
          write: false,
          bundle: true,     // Bundle dependencies
          format: "esm",
          minify: true,     // Minify for performance
          target: "es2020", // Modern JS target
        });

        // Return the compiled code
        return result.outputFiles[0].text;
      };
    },
  });

  eleventyConfig.addTemplateFormats("ts");

  eleventyConfig.addFilter("cspHash", (rawString: string) => {
    const hash = createHash("sha256").update(rawString).digest("base64");
    return `'sha256-${hash}'`;
  });

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
      },
      {
        input: './src/assets/styles/toggle-theme-shadow.css',
        output: './dist/assets/css/toggle-theme-shadow.css'
      },
      {
        input: './src/assets/styles/note-modal-shadow.css',
        output: './dist/assets/css/note-modal-shadow.css'
      },
      {
        input: './src/assets/styles/menu-mobile-shadow.css',
        output: './dist/assets/css/menu-mobile-shadow.css'
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
  });


  eleventyConfig.addCollection("projects", collections.projects);
  eleventyConfig.addCollection("published", collections.published);
  eleventyConfig.addCollection("notesPublished", collections.notesPublished);

  // Filters
  eleventyConfig.addFilter("formatYear", filters.formatYear);
  eleventyConfig.addFilter("formatDatefull", filters.formatDateFull);

  // Shortcodes
  eleventyConfig.addPairedShortcode("sectionBlock", shortcodes.sectionBlock);
  eleventyConfig.addPairedShortcode("blogSectionBlock", shortcodes.blogSectionBlock);
  eleventyConfig.addPairedShortcode("videoContainer", shortcodes.videoContainer);

  // Passthrough
  eleventyConfig.addPassthroughCopy("src/assets/images");
  eleventyConfig.addPassthroughCopy("src/assets/fonts");
  eleventyConfig.addPassthroughCopy({
    "src/assets/videos": "assets/videos"
  });

  return {
    dir: {
      input: 'src',
      output: 'dist',
      includes: '_includes',
      layouts: '_layouts'
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
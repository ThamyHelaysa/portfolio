import fs from 'node:fs';
import path from 'node:path';
import esbuild from "esbuild";
import { createHash } from 'node:crypto';

import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import slugifyCM from "slugify";
import Image, { ImageMetadata, ImageEntry } from "@11ty/eleventy-img";

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
          packages: "bundle"
        });

        // Return the compiled code
        return result.outputFiles[0].text;
      };
    },
  });

  eleventyConfig.addTemplateFormats("ts");

  const moduleSlug = slugifyCM as any;
  const linkSlugify = (s: string) => moduleSlug(s, {
    lower: true,
    strict: true,
    remove: /["]/g,
  });

  const mdLib = MarkdownIt({ html: true })
    .use(markdownItAnchor, {
      slugify: linkSlugify,
      permalink: markdownItAnchor.permalink.linkInsideHeader({
        symbol: "#",
        placement: "after",
        class: "header-anchor",
        ariaHidden: false, // Keep visible for screen readers
        // @ts-ignore
        assistiveText: (title) => `Direct link to “${title}”`,
        visuallyHiddenClass: "visually-hidden",
      }),
    });

  eleventyConfig.setLibrary("md", mdLib);

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
  // eleventyConfig.addPairedShortcode("imageContainer", shortcodes.imageContainer);

  eleventyConfig.addAsyncShortcode("imageContainer", async function (
    content: string,
    desktopSrc: string,
    mobileSrc: string | null | undefined,
    alt: string
  ) {

    const srcDir = "./src/assets/images/";
    const desktopPath = path.join(srcDir, desktopSrc);

    const commonOptions = {
      urlPath: "/assets/images/",
      outputDir: "./dist/assets/images/",
      formats: ["webp", "jpeg"],
    };

    // Generate Desktop Metadata
    const desktopStats = await Image(desktopPath, {
      ...commonOptions,
      widths: [800, "auto"], // Desktop width + original
    }) as ImageMetadata; // <--- Force TS to use our Interface

    // Generate Mobile Metadata (Square Crop)
    let mobileStats: ImageMetadata;

    if (mobileSrc) {
      // Manual file provided
      mobileStats = await Image(path.join(srcDir, mobileSrc), {
        ...commonOptions,
        widths: [425],
      }) as ImageMetadata;
    } else {
      // Auto-crop center using Sharp
      mobileStats = await Image(desktopPath, {
        ...commonOptions,
        widths: [425],
        sharpOptions: {
          animated: true,
          resize: {
            width: 425,
            height: 425,
            fit: "cover",
            position: "center",
          },
        },
      }) as ImageMetadata;
    }

    // Prepare HTML Parts
    const jpegEntries = desktopStats["jpeg"];

    if (!jpegEntries || jpegEntries.length === 0) {
      throw new Error(`No JPEG generated for ${desktopSrc}`);
    }
    const fallbackSrc = jpegEntries[jpegEntries.length - 1];
    let sourceHTML = "";

    // A. Mobile Sources (Square, max-width 425px)
    for (const [format, entries] of Object.entries(mobileStats)) {
      if (!entries || entries.length === 0) continue;
      const entry = entries[0];

      sourceHTML += `<source 
        media="(max-width: 425px)" 
        srcset="${entry.srcset}" 
        type="${entry.sourceType}"
        width="${entry.width}" 
        height="${entry.height}">`; // <--- Prevents CLS on mobile
    }

    // B. Desktop Sources (Landscape, min-width 426px)
    for (const [format, entries] of Object.entries(desktopStats)) {
      if (!entries || entries.length === 0) continue;
      const entry = entries[0];

      // Only use WebP for source (JPEG is fallback)
      if (entry.format === 'webp') {
        const srcset = entries.map(e => e.srcset).join(", ");
        sourceHTML += `<source 
                media="(min-width: 426px)" 
                srcset="${srcset}" 
                type="${entry.sourceType}"
                sizes="100vw">`;
      }
    }

    // 4. Return HTML
    return `
    <figure class="image-wrapper">
      <picture>
        ${sourceHTML}
        <img 
            src="${fallbackSrc.url}" 
            width="${fallbackSrc.width}" 
            height="${fallbackSrc.height}" 
            alt="${alt}"
            loading="lazy"
            decoding="async">
      </picture>
      <figcaption>${content}</figcaption>
    </figure>
    `;
  });

  // Passthrough
  eleventyConfig.addPassthroughCopy({ "src/assets/images": "assets/images" });
  eleventyConfig.addPassthroughCopy("src/assets/fonts");
  eleventyConfig.addPassthroughCopy({
    "src/assets/videos": "assets/videos"
  });

  eleventyConfig.addPassthroughCopy({
    "src/assets/asciiart": "assets/asciiart"
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
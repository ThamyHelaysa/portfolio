// https://www.lenesaile.com/en/blog/organizing-the-eleventy-config-file/
// Importing from config
// const collections = require('./config/collections.js');
import pluginWebc from '@11ty/eleventy-plugin-webc';
import collections from './config/collections.js';

export default function (eleventyConfig) {

  // eleventyConfig.addPlugin(pluginWebc);

  eleventyConfig.addPlugin(pluginWebc, {
    components: ["./src/_components/**/*.webc"],
  });

  // eleventyConfig.addBundle("css");

  // Collections
  Object.keys(collections).forEach(collectionName => {
    eleventyConfig.addCollection(collectionName, collections[collectionName]);
  });

  eleventyConfig.addWatchTarget("./src/_components/**/*.webc");
  eleventyConfig.addWatchTarget("./src/css/**/*.css");

  // eleventyConfig.addPassthroughCopy("src/js");
  // eleventyConfig.addPassthroughCopy("./src/css");

  // eleventyConfig.addBundle("css", {
	// 	toFileDirectory: "dist",
	// 	// Add all <style> content to `css` bundle (use <style eleventy:ignore> to opt-out)
	// 	// Supported selectors: https://www.npmjs.com/package/posthtml-match-helper
	// 	bundleHtmlContentFromSelector: "style",
	// });


  // Copy static assets (optional later)
  // eleventyConfig.addPassthroughCopy("public");

  // fonts and imgs and pdf
  // eleventyConfig.addPassthroughCopy('src/assets/fonts/');
  // ['src/assets/fonts/', 'src/assets/images/', 'src/assets/pdf/'].forEach(path =>
  //   eleventyConfig.addPassthroughCopy(path)
  // );

  // Favicon
  // eleventyConfig.addPassthroughCopy({
  //   'src/assets/images/favicon/*': '/'
  // });

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      layouts: '_layouts'
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "webc",
    passthroughFileCopy: true
  };
}

module.exports = function (eleventyConfig) {
  // Copy static assets (optional later)
  eleventyConfig.addPassthroughCopy("public");

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      layouts: '_layouts'
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    passthroughFileCopy: true
  };
};

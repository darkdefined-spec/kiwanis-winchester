const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  // Pass-through copies
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/functions");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy({ "src/_assets_root": "/" });

  // Watch targets
  eleventyConfig.addWatchTarget("src/css/");
  eleventyConfig.addWatchTarget("src/content/");

  // Date filters
  eleventyConfig.addFilter("readableDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("LLLL d, yyyy")
  );
  eleventyConfig.addFilter("isoDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toISO()
  );
  eleventyConfig.addFilter("year", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy")
  );

  // Sort newsletters by date descending, grouped by year
  eleventyConfig.addCollection("newslettersByYear", function (collectionApi) {
    const newsletters = collectionApi
      .getFilteredByGlob("src/content/newsletters/*.md")
      .sort((a, b) => b.date - a.date);

    const byYear = {};
    for (const nl of newsletters) {
      const yr = DateTime.fromJSDate(nl.date, { zone: "utc" }).toFormat("yyyy");
      if (!byYear[yr]) byYear[yr] = [];
      byYear[yr].push(nl);
    }
    // Return as sorted array of {year, items}
    return Object.entries(byYear)
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .map(([year, items]) => ({ year, items }));
  });

  // Events sorted newest first
  eleventyConfig.addCollection("events", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/content/events/*.md")
      .sort((a, b) => b.date - a.date);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      layouts: "_layouts",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "html", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};

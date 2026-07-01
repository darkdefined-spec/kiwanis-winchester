const { DateTime } = require("luxon");
const markdownIt = require("markdown-it");

const markdown = markdownIt({
  breaks: true,
  html: false,
  linkify: true,
});

module.exports = function (eleventyConfig) {
  // Pass-through copies
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/functions");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });
  eleventyConfig.addPassthroughCopy({ "src/_assets_root": "/" });

  // Watch targets
  eleventyConfig.addWatchTarget("src/css/");
  eleventyConfig.addWatchTarget("src/content/");
  eleventyConfig.addWatchTarget("src/_data/");

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
  eleventyConfig.addFilter("markdownInline", (value) =>
    markdown.renderInline(value || "")
  );
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value || null));
  eleventyConfig.addFilter("groupNewslettersByYear", (items) => {
    const byYear = {};
    for (const item of items || []) {
      const year = String(item.year || item.date || "").slice(0, 4) || "Archive";
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(item);
    }
    return Object.entries(byYear)
      .sort(([a], [b]) => parseInt(b, 10) - parseInt(a, 10))
      .map(([year, entries]) => ({
        year,
        items: entries.sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
      }));
  });

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

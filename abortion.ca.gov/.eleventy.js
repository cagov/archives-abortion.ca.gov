const cagovBuildSystem = require("@cagov/11ty-build-system");
const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const cheerio = require("cheerio");
const { EleventyI18nPlugin } = require("@11ty/eleventy");
const { pagePath, relativePath, langPathActive, i18n, localizedPath } = require("./src/js/eleventy/filters");
const processProviderData = require('./src/js/eleventy/provider-data.js');

const markdown = markdownIt({
  html: true,
  breaks: true,
  linkify: true,
}).use(markdownItAnchor, { level: 3 });

module.exports = function (eleventyConfig) {
  eleventyConfig.htmlTemplateEngine = "njk";
  
  eleventyConfig.setLibrary('md', markdown);

  eleventyConfig.addPlugin(cagovBuildSystem, {
    processors: {
      sass: {
        watch: ["src/css/**/*"],
        output: "_site_dist/index.css",
        minify: true,
        options: {
          file: "src/css/index.scss",
          includePaths: ["./src/css/sass"],
        },
      },
      esbuild: [
        {
          watch: ["src/js/**/*"],
          options: {
            entryPoints: ["src/js/site.js", "src/js/provider-search.js"],
            bundle: true,
            minify: true,
            external: [
              "/images/marker-icon.png",
              "/images/layers.png",
              "/images/layers-2x.png",
            ],
            outdir: "_site_dist/",
          },
        },
      ],
    },
  });


  // https://www.11ty.dev/docs/plugins/i18n/ canary version docs
  eleventyConfig.addPlugin(EleventyI18nPlugin, {
     // any valid BCP 47-compatible language tag is supported
     defaultLanguage: "en",
  });

  eleventyConfig.addFilter("i18n", i18n);
  eleventyConfig.addFilter("pagePath", pagePath);
  eleventyConfig.addFilter("relativePath", relativePath);
  eleventyConfig.addFilter("langPathActive", langPathActive);
  eleventyConfig.addFilter("localizedPath", localizedPath);
  
  eleventyConfig.addFilter("includes", (items, value) => {
    return (items || []).includes(value);
  });
  // This will be useful when setting social media meta/og tags.
  eleventyConfig.addFilter("changeDomain", function (url, domain) {
    try {
      let u = new URL(url, `https://${domain}`);
      u.host = domain;
      return u.href;
    } catch {
      return url;
    }
  });

  let counter = 0;
  eleventyConfig.addTransform("customTransforms", function (html, outputPath) {
    const $ = cheerio.load(html, null, true);

    // For each link, we'll add "noreferrer" to the rel attribute.
    $("a").each((i, el) => {
      const rel = $(el).attr("rel");
      const href = $(el).attr("href");

      // Get the rel's values into an array, if they exist.
      const relValues = rel ? rel.split(' ') : [];

      // Check if the link is local to the site. 
      // (We don't need to add noreferrer to internal links.)
      const isLocal = (
        href.indexOf('/') === 0 
        || href.indexOf('https://abortion.ca.gov') === 0
      );

      // Check if the link already has noreferrer on its rel attribute.
      const hasNoreferrer = relValues.includes("noreferrer");

      // If rel does not contain "noreferrer", and it's not a local link, then add "noreferrer".
      if (!hasNoreferrer && !isLocal) {
        relValues.push("noreferrer");
      }

      // Add or replace rel on the link with revised values.
      if (relValues.length > 0) {
        $(el).attr("rel", relValues.join(' '));
      }

      // // localize in-site hrefs
      // const known_languages = ['en','es','ko','tl','vi','zh-hans','zh-hant'];
      // var locale = 'en';
      // for (const loc of known_languages) {
      //   if (outputPath.startsWith("_site/"+loc+"/")) {
      //     locale = loc;
      //     break;
      //   }
      // }
      // if (locale != 'en' && isLocal && !href.includes('/'+locale+'/') && href.startsWith("/")) {
      //   const new_url = "/"+locale+href;
      //   $(el).attr("href",new_url);
      //   console.log("Localizing",href,new_url,outputPath);
      // }

    });

    return $.html();
  });

  // Revert to 11ty 1.0 passthrough copy on --serve, for now.
  eleventyConfig.setServerPassthroughCopyBehavior("copy");

  eleventyConfig.addPassthroughCopy({
    "src/assets/img/": "assets/img/",
  });
  eleventyConfig.addPassthroughCopy({ "src/pdf": "pdf" });

  processProviderData();

  eleventyConfig.addPassthroughCopy({
    "pages/_data/cities.json": "data/cities.json",
  });
  eleventyConfig.addPassthroughCopy({ "src/css/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({
    "src/js/provider-search/leaflet/images": "images",
  });

  return {
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "md",
    templateFormats: ["html", "njk", "11ty.js", "md"],
    dir: {
      input: "pages",
      output: "_site",
    },
  };
};

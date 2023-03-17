// This exists to run the linkchecker individually. It is also integrated into the e2e tests so will run along with those which are configured to run on commit and preview branch builds on github.

import { expect, test } from "@playwright/test";
import { linkTest } from './linkcheck.mjs';

let src_PageUrls = ["/", 
                "/404",   
                "/getting-an-abortion/about-abortion/", 
                "/getting-an-abortion/how-to-pay-for-an-abortion/", 
                "/getting-an-abortion/planning/", 
                "/getting-an-abortion/types-of-abortion/", 
                "/support/communities/", 
                "/support/health-and-wellness/", 
                "/find-a-provider/",
                "/your-rights/your-legal-right-to-an-abortion/", 
                "/your-rights/your-privacy/", 
                "/contact-us/", 
                "/our-partners/", 
                "/privacy-policy/",
                "/translating-this-website/",
                "/use-policy/",
              ];
let pageUrls = [];

let prefixes = ["" , "/es", "/tl", "/zh-hans","/zh-hant", "/ko", "/vi"];

prefixes.forEach((prefix) => {
  src_PageUrls.forEach((url) => {
    pageUrls.push(prefix + url);
  });
});

test.describe.serial("linkCheck", () => {

  pageUrls.forEach((slug) => {

    test(slug, async ({ page }) => {

      await page.goto("http://127.0.0.1:8081"+slug);
      await expect(await linkTest(slug, page)).toBeTruthy();
    
    });
  });
});
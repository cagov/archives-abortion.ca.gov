// @ts-check
import { test, expect } from "@playwright/test";
import {
  injectAxe,
  checkA11y
} from "axe-playwright";

import { linkTest } from './linkcheck.mjs';

let testLocation = "http://localhost:8081";

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
let prefixes = ["", "/es", "/tl", "/zh-hans","/zh-hant", "/ko", "/vi"];
prefixes.forEach((prefix) => {
  src_PageUrls.forEach((url) => {
    pageUrls.push(prefix + url);
  });
});

pageUrls.forEach(pageUrl => {

  test("each page test: a11y, error, links "+pageUrl, async ({ page }) => {

    let errorCount = 0;
    // this check gets tripped if there is any js error on the page
    page.on("pageerror", msg => {
      errorCount++;
      console.log(msg)
    })

    await page.goto(testLocation+pageUrl);

    // check for js errors
    await expect(errorCount).toEqual(0);

    // check a11y violations
    await injectAxe(page);

    // @ts-ignore
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    })

    // link checker
    await expect(await linkTest(pageUrl, page)).toBeTruthy();

  });
});

/*
* this is a rewrite of linkcheck that lets it run inside of the e2e test set
* this seems like a good idea because we want to test a11y on each page, then test links
* 
* sample usage
* 
* test(slug, async ({ page }) => {
*   await expect(await linkTest(slug, page)).toBeTruthy();
* });
*/

class Link {
  constructor(url, slug, list) {
    this.url = url;
    this.slug = slug;
    this.status = "";
    this.list = list;
  }
  validateURL = () => {
    const url = this.url;
    const list = this.list.items;

    if (
      url.includes("#") ||
      url.includes("ca.gov") ||
      url.includes("tel:") ||
      url.includes("http") ||
      list.includes(url)
    ) {
      this.status = null;
    } else {
      list.push(url);
      this.status = "check it";
    }
    return this.status;
  };
}

class List {
  constructor() {
    this.items = [];
  }
}

export async function linkTest(slug, page) {
  const list = new List();

  const onPageLinks = page.locator("a >> visible=true");
  const count = await onPageLinks.count();
  let testSuccess = true;

  for (let i = 1; i < count; ++i) {
    const url = await onPageLinks.nth(i).getAttribute("href");

    const linkToTry = new Link(url, slug, list);

    if (linkToTry.validateURL() == "check it") {
      const response = await page.request.get(url);

      if (!response.ok()) {
        console.log("----" + slug);
        console.log("----------------------------------");

        const message = `${response.status()} - ${response.statusText()} - ${url}`;
        const color = response.ok() ? "\x1b[36m%s\x1b[0m" : "\x1b[35m%s\x1b[0m";
        console.log(color, message.toString());
        testSuccess = false;
      }
    }
  }
  return testSuccess;
}
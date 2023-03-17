// @ts-check
import { test, expect } from "@playwright/test";

let testLocation = "http://localhost:8081";

test('find a provider page find all and autocomplete', async ({ page }) => {
  await page.goto(testLocation+'/find-a-provider/');

  const findAllProviders = await page.locator('#search-all');
  findAllProviders.click();
  await expect(page.locator("cagov-abortion-provider-list .provider-card")).toHaveCount(6)

  const searchField = await page.locator("#cityinput")
  await searchField.type('San Francisco') // expect the two separate city results: San Francisco and South San Francisco

  await expect(await page.locator(".provider-search-field ul li")).toHaveCount(2)

});

test('spanish find a provider page can show some providers', async ({ page }) => {
  await page.goto(testLocation+'/es/find-a-provider/');

  const findAllProviders = await page.locator('#search-all');
  await findAllProviders.click();

  await expect(await page.locator("cagov-abortion-provider-list .provider-card")).toHaveCount(6)

});
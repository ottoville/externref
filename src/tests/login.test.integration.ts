import { describe, beforeAll, it } from '@jest/globals';
import type { Page, Browser } from 'puppeteer-core';
import { jest } from '@jest/globals';
import assert from 'assert';

//@ts-ignore
const browser = globalThis.__BROWSER_GLOBAL__ as Browser;
jest.setTimeout(10000);
describe('/ (Home Page)', () => {
  let page: Page;
  beforeAll(async () => {
    await new Promise((res) => {
      setTimeout(res, 2000);
    });
    page = await browser.newPage();
    await page.goto('https://localhost:4280');
  }, 10000);

  it('should load without error', async () => {
    const elem = await page.waitForSelector('game-container >>> a');
    await elem?.click();
  });
  it('should fill the form', async () => {
    await page.waitForNavigation({
      waitUntil: 'domcontentloaded',
    });
    const username = await page.waitForSelector('input[name="userDetails"]');
    await username?.evaluate((node) => {
      (node as HTMLInputElement).value = 'puppeteer';
    });
    //  page.screenshot({path:'./sreenshot1.jpg'});
    const submit = await page.waitForSelector('button[type="submit"]');
    await submit?.click();
  });
  it('should have logged in', async () => {
    await page.waitForNavigation({
      waitUntil: 'domcontentloaded',
    });
    //page.screenshot({path:'./sreenshot2.jpg'});
    await new Promise((res) => setTimeout(res, 5000));
    const playoffline = await page.waitForSelector(
      'game-container >>> #loginmethods1 button',
    );
    const playofflinevisibiltity = await playoffline?.evaluate((node) =>
      (node as HTMLButtonElement).checkVisibility(),
    );
    assert.equal(playofflinevisibiltity, false);
    const playonline = await page.waitForSelector(
      'game-container >>> #loginmethods2 button',
    );
    const playonlinevisibiltity = await playonline?.evaluate((node) =>
      (node as HTMLButtonElement).checkVisibility(),
    );
    assert.equal(playonlinevisibiltity, true);
  });
});

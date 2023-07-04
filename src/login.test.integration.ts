import { describe, beforeAll, it, expect } from '@jest/globals';
import type { Page, Browser } from 'puppeteer-core';
import { jest } from '@jest/globals';

//@ts-ignore
const browser = globalThis.__BROWSER_GLOBAL__ as Browser;
jest.setTimeout(10000);
describe(
    '/ (Home Page)',
    () => {
        let page: Page;
        beforeAll(async () => {
            await new Promise((res) => {
                setTimeout(res,
                    2000);
            });
            page = await browser.newPage();
            await page.goto('https://localhost:4280');
        },
        10000);

        it('should load without error',
            async () => {
                const elem = await page.waitForSelector('#loginmethods a');
                await elem?.click();
            });
        it('should fill the form',
            async () => {
                await page.waitForNavigation({
                    waitUntil: 'domcontentloaded',
                });
                const username = await page.waitForSelector('input[name="userDetails"]');
                await username?.evaluate((node) => { (node as HTMLInputElement).value = 'puppeteer'; });
                //  page.screenshot({path:'./sreenshot1.jpg'});
                const submit = await page.waitForSelector('button[type="submit"]');
                await submit?.click();
            });
        it('should have logged in',
            async () => {
            //  page.screenshot({path:'./sreenshot2.jpg'});
                const elem2 = await page.waitForSelector('#loginmethods button');
                const r = await elem2?.evaluate((node) =>
                    (node as HTMLButtonElement).textContent);
                expect(r).toContain('Play');
            });
    });
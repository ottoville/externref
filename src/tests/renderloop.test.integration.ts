import type { Engine } from "../engine.js";
import type { Page, Browser } from 'puppeteer-core';

import { describe, beforeAll, it, expect } from '@jest/globals'


const browser = globalThis.__BROWSER_GLOBAL__ as Browser;

describe('Physic time ', function () {
    let page: Page;
    beforeAll(async () => {
        await new Promise((res) => {
            setTimeout(res, 2000)
        });
        page = await browser.newPage();
        await page.goto('https://localhost:4280');
    }, 10000);
    it('should load without error', async () => {
        const elem = await page.waitForSelector('button');
        await elem?.click();
        await page.waitForSelector('progress');
        await page.waitForFunction(() => !document.querySelector('progress'));
    })
    it('Delta has changed', async function () {
        const [value0, value1] = await page.evaluate(async function () {
            //@ts-expect-error
            const engine: Engine = window.engine;

            const deltaView = new Float32Array(engine.gpu!.timeAndDeltaBuffer, 4, 1);
            const value0_ = deltaView[0];
            await new Promise(res => { setTimeout(res, 1234) });
            const value1_ = deltaView[0];
            return [value0_, value1_];
        });
        expect(Number.isFinite(value1)).toBe(true)
        expect(value0).not.toBe(value1)
    });

})

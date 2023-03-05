import { describe, beforeAll, it, jest, expect } from '@jest/globals'
import { Page, Browser } from 'puppeteer-core';

import { Box as Box2 } from "../GPU/Meshes/Box.js";

import type { Engine } from "../engine.js";
//@ts-ignore
const browser = globalThis.__BROWSER_GLOBAL__ as Browser;

describe('Lights ', function () {
    jest.setTimeout(30000)
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
    it('should render boxes', async () => {
        const [greenPixel, redPixel] = await page.evaluate(async function () {
            //@ts-expect-error
            // eslint-disable-next-line import/extensions
            const Box: typeof Box2 = (await import('/js/GPU/Meshes/Box.js')).Box;
            //@ts-expect-error
            const engine: Engine = window.engine;
            const b = new Box({ can_collide: false, label: 'redBox' });
            const b2 = new Box({ can_collide: false, label: 'greenBox', color: [0, 1, 0, 0] });
            //green on left, red on right
            b.translation = [0, 400, -300]
            b2.translation = [0, 400, 300]
            b.update_scale(200, 200, 200);
            b2.update_scale(200, 200, 200);
            //@ts-expect-error
            const control = engine!.mainCamera.attachControllerForCamera({
                attachCameraController: () => undefined,
                deAttachCameraController: () => undefined,
                serialize: () => undefined
            });
            control.updatePosition(position => position.set([5000, 400, 0]));
            control.updateDirection((direction) => {
                direction[0] = 1;
                direction[1] = 0;
                direction[2] = 0;
            });
            await new Promise<void>(res => {
                requestAnimationFrame(() => res());
            });
            await new Promise<void>(res => {
                requestAnimationFrame(() => res());
            });
            await new Promise((res) => {
                setTimeout(res, 500)
            });
            const renderTarget = engine.gpu!.renderPassScreen.colorRenderTargets.gRenderTargetDiffuse.resolveTexture!;

            const data = await renderTarget.toBitmap();
            let bytesPerRow = renderTarget.size.width * renderTarget.bytes_per_fixel;
            const missAlignment = bytesPerRow % 256;

            if (missAlignment !== 0) {
                bytesPerRow = bytesPerRow - missAlignment + 256;
            }
            return [
                new Uint8ClampedArray(data.buffer, bytesPerRow * 300 + 300 * renderTarget.bytes_per_fixel, 4),
                new Uint8ClampedArray(data.buffer, bytesPerRow * 300 + 500 * renderTarget.bytes_per_fixel, 4)
            ] as const;
        });
        // Data is in BGR format.
        expect(redPixel).toEqual({
            0: 0,
            1: 0,
            2: 76,
            3: 255
        });
        expect(greenPixel).toEqual({
            0: 0,
            1: 13,
            2: 0,
            3: 255
        })
    });
})

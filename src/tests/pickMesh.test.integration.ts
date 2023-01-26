import { describe, beforeAll, it, jest, expect } from '@jest/globals'
import type { Page, Browser } from 'puppeteer-core';

import { Box as Box2 } from "../GPU/Meshes/Box.js";

import type { Engine } from "../engine.js";
import type { TerraVector3 } from '../Math.js';
import type { MainNode } from '../MainNode.js';
const browser = globalThis.__BROWSER_GLOBAL__ as Browser;

describe('Pick box ', function () {
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
    it('should pick', async () => {
        const [pickInfo0, pickInfo, boxId] = await page.evaluate(async function () {
            //@ts-expect-error
            // eslint-disable-next-line import/extensions
            const Box: typeof Box2 = (await import('/js/GPU/Meshes/Box.js')).Box;
            //@ts-expect-error
            const engine: Engine = window.engine;
            const b = new Box({ can_collide: false, label: 'PickGreenbox' });
            b.translation = [0, 400, 0]
            b.update_scale(500, 500, 500);
            //@ts-expect-error
            const control = engine!.mainCamera.attachControllerForCamera({
                attachCameraController: () => undefined,
                deAttachCameraController: () => undefined
            });
            control.updatePosition(position => position.set([5000, 400, 0]))
            control.updateDirection(direction => direction.set([1, 0, 0]))

            const [pickedPosition, pickedMesh] = await new Promise<[{
                position: TerraVector3;
                meshId: number;
            } | null, {
                position: TerraVector3;
                mesh: MainNode;
            } | null]>((res) => {
                engine.gpu!.afterRenderStart(async () => {
                    engine.gpu!.mousePosition[0] = (engine.canvas!.width / 2) | 0;
                    engine.gpu!.mousePosition[1] = (engine.canvas!.height / 2) | 0;
                    res([await engine.gpu!.renderPassScreen.pickPosition(true), await engine.gpu!.renderPassScreen.pickMesh(undefined)]);
                })
            });
            return [pickedPosition, { position: pickedMesh?.position, label: pickedMesh?.mesh.label }, b.id] as const;
        });
        expect(pickInfo0).not.toBeNull();
        expect(pickInfo.label).not.toBeNull();
        //window.printRenderTarget2()
        //window.printRenderTarget3()
        expect(pickInfo0!.meshId).toStrictEqual(boxId);
        expect(Math.round(pickInfo0!.position[0]!)).toStrictEqual(500)
        expect(Math.round(pickInfo0!.position[1]!)).toStrictEqual(400)
        expect(Math.floor(pickInfo0!.position[2]!)).toStrictEqual(0)
        expect(pickInfo!.label).toStrictEqual('PickGreenbox');
    });
})

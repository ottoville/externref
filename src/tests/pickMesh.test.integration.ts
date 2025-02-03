import { describe, beforeAll, it, jest } from '@jest/globals';
import type { Page, Browser } from 'puppeteer-core';

import { Box as Box2 } from '../GPU/Meshes/Box.js';

import type { Engine } from '../engine.js';
import type { TerraVector3 } from '../Math.js';
import type { MainNode } from '../MainNode.js';
import assert from 'assert';
//@ts-ignore
const browser = globalThis.__BROWSER_GLOBAL__ as Browser;

describe('Pick box ', function () {
  jest.setTimeout(30000);
  let page: Page;
  beforeAll(async () => {
    await new Promise((res) => {
      setTimeout(res, 2000);
    });
    page = await browser.newPage();
    await page.goto('https://localhost:4280');
  }, 10000);
  it('should load without error', async () => {
    const elem = await page.waitForSelector('game-container >>> button', {visible: true});
    await elem?.click();
    await page.waitForSelector('game-container >>> progress');
    await page.waitForSelector('game-container >>> progress', { hidden: true });
  });
  it('should pick', async () => {
    const [pickInfo0, pickInfo, boxId] = await page.evaluate(async function () {
      //@ts-expect-error
      // eslint-disable-next-line import/extensions
      const Box: typeof Box2 = (await import('/js/GPU/Meshes/Box.js')).Box;
      //@ts-expect-error
      const engine: Engine = window.engine;
      const b = new Box(
        {
          can_collide: false,
        },
        { label: 'PickGreenbox' },
      );
      b.setTranslation([0, 400, 0]);

      b.update_scale(500, 500, 500);
      //@ts-expect-error
      const control = engine!.gpu.mainCamera.attachControllerForCamera({
        attachCameraController: () => undefined,
        deAttachCameraController: () => undefined,
      });
      control.updatePosition(5000, 400, 0);
      control.updateDirection(1, 0, 0);

      const [pickedPosition, pickedMesh] = await new Promise<
        [
          {
            position: TerraVector3;
            meshId: number;
          } | null,
          {
            position: TerraVector3;
            mesh: MainNode;
          } | null,
        ]
      >((res) => {
        engine.gpu!.afterRenderStart(async () => {
          engine.gpu!.mousePosition[0] = (engine.canvas!.width / 2) | 0;
          engine.gpu!.mousePosition[1] = (engine.canvas!.height / 2) | 0;
          res([
            await engine.gpu!.renderPassScreen.pickPosition(true),
            await engine.gpu!.renderPassScreen.pickMesh([b]),
          ]);
        });
      });
      return [
        pickedPosition,
        {
          label: pickedMesh?.mesh.label,
          position: pickedMesh?.position,
        },
        b.id,
      ] as const;
    });
    assert.notEqual(pickInfo0, null);
    assert.notEqual(pickInfo.label, null);
    //window.printRenderTarget2()
    //window.printRenderTarget3()
    assert.strictEqual(pickInfo0!.meshId, boxId);
    assert.strictEqual(Math.round(pickInfo0!.position[0]!), 500);
    assert.strictEqual(Math.round(pickInfo0!.position[1]!), 400);
    assert.strictEqual(Math.floor(pickInfo0!.position[2]!), 0);
    assert.strictEqual(pickInfo!.label, 'PickGreenbox');
  });
});

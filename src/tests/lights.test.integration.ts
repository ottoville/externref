import { describe, beforeAll, it, jest } from '@jest/globals';
import { Page, Browser } from 'puppeteer-core';

import { Box as Box2 } from '../GPU/Meshes/Box.js';

import type { Engine } from '../engine.js';
import { CameraController } from '../controllers/CameraController.js';
import assert from 'assert';
//@ts-ignore
const browser = globalThis.__BROWSER_GLOBAL__ as Browser;

describe('Lights ', function () {
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
    const elem = await page.waitForSelector('game-container >>> button');
    await elem?.click();
    await page.waitForSelector('game-container >>> progress');
    await page.waitForSelector('game-container >>> progress', { hidden: true });
  });
  it('should render boxes', async () => {
    const [greenPixel, redPixel] = await page.evaluate(async function () {
      //@ts-expect-error
      // eslint-disable-next-line import/extensions
      const Box: typeof Box2 = (await import('/js/GPU/Meshes/Box.js')).Box;
      //@ts-expect-error
      const engine: Engine = window.engine;
      const b = new Box(
        {
          can_collide: false,
        },
        {
          label: 'redBox',
        },
      );
      const b2 = new Box(
        {
          can_collide: false,
          color: [0, 1, 0, 0],
        },
        {
          label: 'greenBox',
        },
      );
      //green on left, red on right
      b.setTranslation([0, 400, -300]);
      b2.setTranslation([0, 400, 300]);
      b.update_scale(200, 200, 200);
      b2.update_scale(200, 200, 200);
      const control = engine!.gpu!.mainCamera.attachControllerForCamera({
        attachCameraController: () => undefined,
        deAttachCameraController: () => undefined,
        serialize: () => undefined,
      } as unknown as CameraController);
      control.updatePosition(5000, 400, 0);
      control.updateDirection(1, 0, 0);
      await new Promise<void>((res) => {
        requestAnimationFrame(() => res());
      });
      await new Promise<void>((res) => {
        requestAnimationFrame(() => res());
      });
      await new Promise((res) => {
        setTimeout(res, 500);
      });
      const renderTarget =
        engine.gpu!.renderPassScreen.props.colorRenderTargets
          .gRenderTargetDiffuse.resolveTexture!;
      renderTarget.renderTarget.texture.print_bitmap();

      const { bytesPerRow, data } =
        await renderTarget.renderTarget.texture.toBitmap();
      const bytes_per_pixel = renderTarget.renderTarget.texture.bytes_per_fixel;

      return [
        new Uint8ClampedArray(
          data.buffer,
          bytesPerRow * 300 + 300 * bytes_per_pixel,
          4,
        ),
        new Uint8ClampedArray(
          data.buffer,
          bytesPerRow * 300 + 500 * bytes_per_pixel,
          4,
        ),
      ] as const;
    });
    // Data is in BGR format
    assert.deepEqual(Object.values(greenPixel), [0, 255, 0, 255]);
    assert.deepEqual(Object.values(redPixel), [0, 0, 255, 255]);
  });
});

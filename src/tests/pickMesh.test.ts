/* eslint-disable @typescript-eslint/no-unused-vars */
import { Box } from "../GPU/Meshes/Box.js";

import type { Engine } from "../engine.js";
declare const engine: Engine;

/*
  Open test-build/node-modules/@types/node/assert.d.ts and runTest.ts to enable assert
*/
export const run = (asr: typeof assert) => {
    describe('Pick box ', function () {
      it('Pick position and mesh', async function (done) {
        this.timeout(3000);
        /*engine.mainCamera.updateDirection(v => v.set([0,-1,0])); */
        const b = new Box(undefined, undefined,false,'PickGreenbox');
        b.translation = [0,400,0]
        b.update_scale(500, 500, 500);

        engine.mainCamera.position = [5000,400,0];
        engine.mainCamera.updateDirection((direction) => {
          direction[0]=1;
          direction[1]=0;
          direction[2]=0;
        });
        await new Promise<void>((res, rej) => {
          requestAnimationFrame(async () => {
            try {
              engine.mousePosition[0]=(engine.canvas.width/2)|0;
              engine.mousePosition[1]=(engine.canvas.height/2)|0;
      
              const pickInfo0 = await engine.gpu.renderPassScreen.pickPosition(true);
              const pickInfo = await engine.gpu.renderPassScreen.pickMesh(undefined);

              if(pickInfo0 === null) {
                done(new Error('Did not hit anything'));
                  //@ts-ignore
                  window.printRenderTarget2()
                return;
              }
              asr.strictEqual(pickInfo0!.meshId, b.id);
              asr.strictEqual(Math.round(pickInfo0!.position[0]!), 500)
              asr.strictEqual(Math.round(pickInfo0!.position[1]!), 400)
              asr.strictEqual(Math.floor(pickInfo0!.position[2]!), 0)
              asr.strictEqual(pickInfo!.mesh.label, 'PickGreenbox');
              res();
            } catch(e) {
              console.error(e);
              done(new Error(e))
              //@ts-ignore
              window.printRenderTarget3()
              rej();
            }
          })
        });
        done();
      });
    })
  
}
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Box } from "../GPU/Meshes/Box.js";

import type { Engine } from "../engine.js";
import { TerraVector3 } from "../Math.js";
declare const engine: Engine;

/*
  Open test-build/node-modules/@types/node/assert.d.ts and runTest.ts to enable assert
*/
export const run = (asr: typeof assert) => {
    
    describe('Bounding box ', function () {
      it('Update scale, translation and rotation', function () {
        engine.mainCamera.updateDirection(v => v.set([0,-1,0]));
        const b = new Box(undefined, undefined,false,'bigbox');
        b.update_scale(engine.rustEngine, 1000, 10, 1000);
        b.SetTranslation([0,-100,0]);
        /*const pickInfo0 = await engine.gpu.renderPassScreen.pickPosition(true);
        const pickInfo = await engine.gpu.renderPassScreen.pickMesh(undefined);
        console.log(pickInfo0)
        console.log(pickInfo)*/
      });
    })
  
}
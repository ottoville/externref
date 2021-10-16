import { Box } from "../GPU/Meshes/Box.js";

import type { Engine } from "../engine.js";
declare const engine: Engine;

/*
  Open test-build/node-modules/@types/node/assert.d.ts and runTest.ts to enable assert
*/
export const run = (asr: typeof assert) => {
    
    describe('Bounding box ', function () {
      it('Update scale, translation and rotation', function () {
        const b = new Box(undefined, undefined,'bigbox');
        b.update_scale(engine.rustEngine, 500, 500, 500);
        b.SetTranslation([123,1000,123]);
        b.update_rotation(engine.rustEngine,Math.sin(1.1),0,0,Math.cos(1.1));
        const minBounding=b.bounding_min
        const maxBounding=b.bounding_max

        asr.deepEqual(minBounding[0],-377)
        asr.deepEqual(minBounding[1],301.50128173828125)
        asr.deepEqual(minBounding[2],-575.4987182617188)

        asr.deepEqual(maxBounding[0],623)
        asr.deepEqual(maxBounding[1],1698.498779296875)
        asr.deepEqual(maxBounding[2],821.4987182617188)
        
      });

    })
  
}
import type { Engine } from "../engine.js";
declare const engine: Engine;

/*
  Open test-build/node-modules/@types/node/assert.d.ts to enable assert
*/

type assertionType = typeof assert;
export const run = async (assert: assertionType) => {
    
    describe('Physic time ', function () {
      it('Delta has changed', async function () {
        const value0=engine.deltaView[0];
        await new Promise(res => setTimeout(res,1234));
        const value1=engine.deltaView[0];

        assert.ok(Number.isFinite(value1));
        assert.notStrictEqual(value0,value1)
        
      });

    })
  
}
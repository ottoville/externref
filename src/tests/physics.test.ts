/* eslint-disable @typescript-eslint/no-unused-vars */
import { Box } from "../GPU/Meshes/Box.js";

/*
  Open test-build/node-modules/@types/node/assert.d.ts and runTest.ts to enable assert
*/
export const run = (asr: typeof assert) => {
    
    describe('Physics ', function () {
      it('Has gravity and collision', async function (done) {
        this.timeout(5000);

        /*engine.mainCamera.updateDirection(v => v.set([0,-1,0])); */
        const b = new Box(undefined, undefined,true,'gravitybixbox');
        b.update_scale(100, 5, 100);
        b.translation = [123,300,123];

        const b2 = new Box(undefined, 400,true,'gravitygreenbox',[0,1,0,0]);
        b2.translation = [123, 320, 123];
        b2.hasGravity=true;
        let ticks=0;
        const translation=b2.translation;
        //@ts-expect-error
        let oldTranslation:[number,number,number]=[...translation]
        let collided=false;
        await new Promise<void>((res, rej) => {
          b2.onPhysicTick=() => {
            b2.force=[0,0,-1];
            if(ticks < 3) {
              //@ts-expect-error
              oldTranslation=[...translation];
              ticks++;
              return;
            }
            asr.strictEqual(translation[2] < oldTranslation[2], true);
            if(translation[1] === oldTranslation[1]) {
              asr.strictEqual(ticks < 10, false);
              if(!collided) {
                collided=true;
                console.log('collided', ticks);
              }
              // Gravity is broken
              asr.strictEqual(collided, true);
              if(!collided) {
                rej();
              }
            } else {
              asr.strictEqual(collided, false);
              if(collided) {
                // Its jumping on floor, not stable
                rej();
              }
            }
            //@ts-expect-error
            oldTranslation=[...translation];
            
            ticks++;
            if(ticks > 250) {
              res();
            }
        }
        });
        asr.strictEqual(collided, true);
        done();
      });
    })
  
}
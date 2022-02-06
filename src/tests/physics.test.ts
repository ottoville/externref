/* eslint-disable @typescript-eslint/no-unused-vars */
import { Box } from "../GPU/Meshes/Box.js";

/*
  Open test-build/node-modules/@types/node/assert.d.ts and runTest.ts to enable assert
*/
export const run = (asr: typeof assert) => {
    
    describe('Physics Has gravity and collision', function () {
      const slope = new Box(undefined, undefined,true,'gravitybixbox2');
      slope.update_scale(200, 5, 200);
      slope.update_rotation(Math.sin(1.4),0,0,Math.cos(1.4));
      slope.translation = [23,500,23];

      it('Flat ground', async function (done) {
        this.timeout(5000);
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
        let falling=false;
        await new Promise<void>((res, rej) => {
          b2.onPhysicTick=() => {
            b2.force=[0,0,-1];
            if(ticks < 3) {
              //@ts-expect-error
              oldTranslation=[...translation];
              ticks++;
              return;
            }
            if(translation[2] >= oldTranslation[2]) {
              done(new Error('Force not applied'))
            }
            if(translation[1] === oldTranslation[1]) {
              if(ticks < 10) {
                done(new Error('Collide too early'));
              }
              if(!collided) {
                collided=true;
              }
              if(!falling) {
                done(new Error('Gravity is broken'))
              }
            } else {
              falling=true;
              if(collided) {
                done(new Error('jumping on floor'))
              }
            }
            //@ts-expect-error
            oldTranslation=[...translation];
            
            ticks++;
            if(ticks > 250) {
              res();
              delete b2.onPhysicTick;
            }
        }
        });
        if(!collided)
          done(new Error('Did not collide'));
        else
          done();
      });
      it('Uphill', async function (done) {
        this.timeout(6000);
        const b2 = new Box(undefined, 400,true,'gravitygreenbox2',[0,1,0,0]);
        b2.translation = [23, 500, -100];
        b2.hasGravity=true;
        let ticks=0;
        const translation=b2.translation;
        //@ts-expect-error
        let oldTranslation:[number,number,number]=[...translation]
        let collided=false;
        await new Promise<void>((res, rej) => {
            b2.onCollide=() => {
              b2.force[2]=10
            }
            b2.onPhysicTick=() => {
              if(ticks < 3) {
                //@ts-expect-error
                oldTranslation=[...translation];
                ticks++;
                return;
              }
              if(translation[1] > oldTranslation[1]) {
                if(ticks < 10) {
                  done(new Error('Collide too early'));
                }
                collided=true;
              } else if(collided) {
                done(new Error('Went throught plane'));
              }
              //@ts-expect-error
              oldTranslation=[...translation];
              
              ticks++;
              if(ticks > 300) {
                res();
                delete b2.onPhysicTick;
              }
          }
          })
          if(!collided)
            done(new Error('Did not collide'));
          else
            done();        
      });
      it('Downhill', async function (done) {
        this.timeout(5000);
        const b2 = new Box(undefined, 400,true,'gravitygreenbox3',[0,1,0,0]);
        b2.translation = [30, 600, 120];
        b2.hasGravity=true;
        let ticks=0;
        let collided=false;
        await new Promise<void>((res, rej) => {
            b2.onPhysicTick=() => {
              if(ticks < 3) {
                ticks++;
                return;
              }
              if(b2.is_colliding && !collided) {
                collided=true;
                if(ticks < 10)
                  done(new Error('Collide too early'));
              } else if (!b2.is_colliding && collided ) {
                  done(new Error('Jumped on plane'));
              }
              
              ticks++;
              if(ticks > 250) {
                res();
                delete b2.onPhysicTick;
              }
          }
          })
          if(!collided)
            done(new Error('Did not collide'));
          else
            done();        
      })
    })
  
}
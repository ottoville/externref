import { describe, beforeAll, it, expect, jest } from '@jest/globals';

import { Box } from '../GPU/Meshes/Box.js';
import { Engine } from '../engine.js';
import fs from 'fs';
jest.setTimeout(16000);

describe('Physics Has gravity and collision',
    function () {
        let engine: Engine | void;
        beforeAll(async () => {
            engine = await Engine.initEngine(undefined,
                (e) => {
                    console.log('error',
                        e.message);
                },
                {
                    collider: fs.readFileSync('../wwwroot/collider/colliderSimdO.wasm'),
                    rust: fs.readFileSync('../node/wasm32-unknown-unknown/debug/engine.wasm'),
                });
            const slope = new Box({
                can_collide: true, fixed: true, label: 'gravitybixbox2',
            });
            slope.update_scale(200,
                5,
                200);
            slope.rotation = [Math.sin(1.4), 0, 0, Math.cos(1.4)];
            slope.translation = [23, 500, 23];

        },
        10000);

        it('Flat ground',
            async function () {
                const b = new Box({
                    can_collide: true, fixed: true, label: 'gravitybixbox',
                });
                b.update_scale(100,
                    5,
                    100);
                b.translation = [123, 300, 123];

                const b2 = new Box({
                    can_collide: true, color: [0, 1, 0, 0], label: 'gravitygreenbox', point_light: 400,
                });
                b2.translation = [123, 320, 123];
                b2.hasGravity = true;
                let ticks = 0;
                const translation = b2.translation;
                //@ts-expect-error
                let oldTranslation: [number, number, number] = [...translation];
                let collided = false;
                let falling = false;
                await new Promise<void>((res) => {
                    console.log('creating physictick');

            engine!.physics.onPhysicTick.add(() => {
                b2.apply_impulse([0, 0, -1]);
                //b2.force = [0, 0, -1];
                if (ticks < 3) {
                    //@ts-expect-error
                    oldTranslation = [...translation];
                    ticks++;
                    return;
                }
                // console.log('height', translation[1])
                //Force not applied
                expect(translation[2]).toBeLessThan(oldTranslation[2]);

                if (translation[1] === oldTranslation[1]) {
                    //Collide too early
                    expect(ticks).toBeGreaterThan(9);

                    if (!collided) {
                        collided = true;
                    }
                    //Gravity is broken
                    expect(falling).not.toBeFalsy();
                } else {
                    falling = true;
                    //jumping on floor
                    expect(collided).toBeFalsy();
                }
                //@ts-expect-error
                oldTranslation = [...translation];
                //console.log('tick', ticks)
                ticks++;
                if (ticks > 250) {
                    res();
                    engine!.physics.onPhysicTick.clear();
                }
            });
                });
                expect(collided).not.toBeFalsy();
            },
            10000);
    /*it('Uphill', async function() {
      const b2 = new Box(undefined, 400, true, 'gravitygreenbox2', [0, 1, 0, 0]);
      b2.translation = [23, 500, -100];
      b2.hasGravity = true;
      let ticks = 0;
      const translation = b2.translation;
      //@ts-expect-error
      let oldTranslation: [number, number, number] = [...translation]
      let collided = false;
      await new Promise<void>((res, rej) => {
        console.log('listening oncollide for',b2.id)
        b2.onCollide = () => {
          console.log('oncollide')
          b2.apply_impulse([0,0,10]);
         // b2.force[2] = 10
        }
        engine!.physics.onPhysicTick.add(() => {
          if (ticks < 3) {
            //@ts-expect-error
            oldTranslation = [...translation];
            ticks++;
            return;
          }
          if (translation[1] > oldTranslation[1]) {
            //Collide too early
            expect(ticks).toBeGreaterThan(9)
            collided = true;
          } else {
            //Went throught plane
            expect(collided).toBeFalsy();
          }
          //Jumped on plane
        //  expect(collided && !b2.is_colliding).toBeFalsy()
          //@ts-expect-error
          oldTranslation = [...translation];

          ticks++;
          if (ticks > 300) {
            res();
            engine!.physics.onPhysicTick.clear();
          }
        })
      });
      expect(collided).toBeTruthy();
    }, 12000);
    it('Downhill', function (done) {
      const b2 = new Box(undefined, 400, true, 'gravitygreenbox3', [0, 1, 0, 0]);
      b2.translation = [30, 600, 120];
      b2.hasGravity = true;
      let ticks = 0;
      let collided = false;
      new Promise<void>((res, rej) => {
        b2.onPhysicTick = () => {
          if (ticks < 3) {
            ticks++;
            return;
          }
          if (b2.is_colliding && !collided) {
            collided = true;
            if (ticks < 10)
              done(new Error('Collide too early'));
          } else if (!b2.is_colliding && collided) {
            done(new Error('Jumped on plane'));
          }

          ticks++;
          if (ticks > 250) {
            res();
            delete b2.onPhysicTick;
          }
        }
      })
      if (!collided)
        done(new Error('Did not collide'));
      else
        done();
    }, 5000)*/
    });
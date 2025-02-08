import { describe, beforeAll, it, jest } from '@jest/globals';

import { Box } from '../GPU/Meshes/Box.js';
import { Engine } from '../engine.js';
import fs from 'fs';
import { MainNode, RigidBody } from '../MainNode.js';
import assert from 'assert';
import { Ellipsoid } from '../nodes/DataNode.js';
import { TerraMatrix } from '../Math.js';
jest.setTimeout(16000);

describe('Physics Has gravity and collision', function () {
  let engine: Engine | void;
  beforeAll(async () => {
    engine = await Engine.initEngine(
      undefined,
      (e) => {
        console.log('error', e.message);
      },
      {
        collider: fs.readFileSync('./wwwroot/collider/colliderSimd.wasm'),
        rust: fs.readFileSync('./wwwroot/engine.wasm'),
      },
    );
    const slope = new Box(
      {
        can_collide: true,
      },
      {
        label: 'gravitybixbox2',
        rigid_body: RigidBody.fixed,
      },
    );
    slope.update_scale(200, 5, 200);
    slope.rotation = [Math.sin(1.4), 0, 0, Math.cos(1.4)];
    slope.setTranslation([23, 500, 23]);
  }, 10000);

  it('Flat ground', async function () {
    const b = new Box(
      {
        can_collide: true,
      },
      {
        label: 'gravitybixbox',
        rigid_body: RigidBody.fixed,
      },
    );
    b.update_scale(100, 5, 100);
    b.setTranslation([123, 600, 123]);
    //@ts-expect-error ellipsoid
    const b2: Box & Ellipsoid = new Box(
      {
        can_collide: false,
        color: [0, 1, 0, 0],
      },
      {
        label: 'gravitygreenbox',
        point_light: 400,
        rigid_body: RigidBody.off,
      },
    );
    engine!.physics.tickables.push(b2);
    b2.setTranslation([123, 620, 123]);

    b2.hasGravity = true;
    const closeDistance = 0.0022;
    b2.grip = 0;
    b2.radius = {
      0: 1,
      1: 1,
      2: 1,
    };
    //@ts-expect-error ellipsoid
    b2.closeDistanceVector = [
      closeDistance / b2.radius[0],
      closeDistance / b2.radius[1],
      closeDistance / b2.radius[2],
    ];
    b2.collisionsScalingMatrix = new TerraMatrix([
      1.0 / b2.radius[0],
      0.0,
      0.0,
      0.0,
      0.0,
      1.0 / b2.radius[1],
      0.0,
      0.0,
      0.0,
      0.0,
      1.0 / b2.radius[2],
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
    ]);
    b2.checkCollide = (
      _dt: number,
      velocityPerDelta: readonly [number, number, number],
    ) => {
      const translation = b2.getTranslationFromId();
      const scaledPosition = engine!.collider.scaledPosition;
      scaledPosition[0] = translation[0] / b2.radius[0];
      scaledPosition[1] = translation[1] / b2.radius[1];
      scaledPosition[2] = translation[2] / b2.radius[2];
      const scaledVelocity = engine!.collider.scaledVelocity;
      scaledVelocity[0] = velocityPerDelta[0] / b2.radius[0];
      scaledVelocity[1] = velocityPerDelta[1] / b2.radius[1];
      scaledVelocity[2] = velocityPerDelta[2] / b2.radius[2];

      engine!.collideWithWorld(
        b2,
        scaledPosition,
        scaledVelocity,
        translation,
        velocityPerDelta,
      );
      b2.setTranslation([
        engine!.collider.finalPosition[0],
        engine!.collider.finalPosition[1],
        engine!.collider.finalPosition[2],
      ]);
    };
    let ticks = 0;
    const translation0 = [...b2.getTranslationFromId()] as [
      number,
      number,
      number,
    ];

    let oldTranslation: [number, number, number] = [...translation0];
    let collided = false;
    let falling = false;
    await new Promise<void>((res) => {
      b2.onPhysicTick = (_dt, mesh) => {
        const translation = MainNode.getTranslation(mesh);

        b2.impulse = [0, 0, -1];
        if (ticks < 3) {
          oldTranslation = [translation[0], translation[1], translation[2]];
          ticks++;
          return;
        }
        // console.log('height', translation[1])
        //Force not applied
        assert.equal(translation[2] < oldTranslation[2], true);

        if (translation[1] === oldTranslation[1]) {
          //Collide too early
          assert.equal(ticks > 9, true);

          if (!collided) {
            collided = true;
          }
          //Gravity is broken
          assert.equal(falling, true);
        } else {
          falling = true;
          //jumping on floor
          assert.equal(collided, false);
        }
        oldTranslation = [translation[0], translation[1], translation[2]];
        //console.log('tick', ticks)
        ticks++;
        if (ticks > 250) {
          res();
          delete b2.onPhysicTick;
        }
      };
    });
    assert.notEqual(collided, false);
  }, 10000);
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

import { describe, beforeAll, it, jest } from '@jest/globals';

import { Box } from '../GPU/Meshes/Box.js';
import { Engine } from '../engine.js';
import fs from 'fs';
import { MainNode, RigidBody } from '../MainNode.js';
import assert from 'assert';
import { Ellipsoid } from '../nodes/DataNode.js';
import { TerraMatrix } from '../Math.js';
import { create_rust_label } from '../utils.js';
import { IndexedSingleColoredMesh } from '../GPU/AbstractMeshes/IndexedSingleColoredMesh.js';
import { Externref } from '../externref.js';
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
    const mesh = engine!.rust.new_character_mesh(
      1,
      ...create_rust_label('human'),
    );
    //@ts-expect-error ellipsoid
    const b2: IndexedSingleColoredMesh & Ellipsoid =
      new IndexedSingleColoredMesh(
        {
          can_collide: false,
          vertices: engine!.rust.get_geometry(mesh),
        },
        mesh,
      );
    engine!.rust.set_mesh_externref(mesh, new Externref(false, b2));

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
      const impulse = b2.impulse;
      b2.onPhysicTick = (_dt, mesh) => {
        const translation = MainNode.getTranslation(mesh);
        impulse[0] = 0;
        impulse[1] = 0;
        impulse[2] = -1;
        if (ticks < 3) {
          oldTranslation = [translation[0], translation[1], translation[2]];
          ticks++;
          return;
        }
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
        ticks++;
        if (ticks > 250) {
          res();
          delete b2.onPhysicTick;
        }
      };
    });
    assert.notEqual(collided, false);
  }, 10000);

  it('Uphill', async function () {
    const mesh = engine!.rust.new_character_mesh(
      1,
      ...create_rust_label('human'),
    );
    //@ts-expect-error ellipsoid
    const b2: IndexedSingleColoredMesh & Ellipsoid =
      new IndexedSingleColoredMesh(
        {
          can_collide: false,
          vertices: engine!.rust.get_geometry(mesh),
        },
        mesh,
      );
    engine!.rust.set_mesh_externref(mesh, new Externref(false, b2));

    engine!.physics.tickables.push(b2);

    b2.setTranslation([23, 500, -100]);
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
    await new Promise<void>((res) => {
      const impulse = b2.impulse;
      b2.onCollideCharacter = () => {
        impulse[0] = 0;
        impulse[1] = 0;
        impulse[2] = 10;
      };
      b2.onPhysicTick = (_dt, mesh) => {
        const translation = MainNode.getTranslation(mesh);

        if (ticks < 3) {
          oldTranslation = [translation[0], translation[1], translation[2]];
          ticks++;
          return;
        }
        if (translation[1] > oldTranslation[1]) {
          //Collide too early
          assert.equal(ticks > 9, true);
          collided = true;
        } else {
          //Went throught plane
          assert.equal(collided, false);
        }
        //Jumped on plane
        //  expect(collided && !b2.is_colliding).toBeFalsy()
        oldTranslation = [translation[0], translation[1], translation[2]];

        ticks++;
        if (ticks > 300) {
          res();
          delete b2.onPhysicTick;
        }
      };
    });
    assert.equal(collided, true);
  }, 12000);

  it('Downhill', async function () {
    const mesh = engine!.rust.new_character_mesh(
      1,
      ...create_rust_label('human'),
    );
    //@ts-expect-error ellipsoid
    const b2: IndexedSingleColoredMesh & Ellipsoid =
      new IndexedSingleColoredMesh(
        {
          can_collide: false,
          vertices: engine!.rust.get_geometry(mesh),
        },
        mesh,
      );
    engine!.rust.set_mesh_externref(mesh, new Externref(false, b2));

    engine!.physics.tickables.push(b2);
    b2.setTranslation([30, 600, 120]);
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
    let collided = false;
    await new Promise<void>((res) => {
      b2.onPhysicTick = () => {
        if (ticks < 3) {
          ticks++;
          return;
        }
        if (b2.colliding_character && !collided) {
          collided = true;
          assert.equal(ticks < 10, false);
        } else {
          //Jumped on plane
          assert.equal(!b2.colliding_character && collided, false);
        }

        ticks++;
        if (ticks > 250) {
          res();
          delete b2.onPhysicTick;
        }
      };
    });
    assert.equal(collided, true);
  }, 12000);
});

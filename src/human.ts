import type { Engine, ListenerObj } from './engine.js';
import type { Scene } from './Scene.js';
import { ARROW_KEYS } from './controllers/CameraController.js';
import { create_rust_label } from './utils.js';
import { Externref } from './externref.js';
import { IndexedSingleColoredMesh } from './GPU/AbstractMeshes/IndexedSingleColoredMesh.js';
import { DataNode } from './nodes/DataNode.js';
declare const engine: Engine;
const maxAcceleration = 10;
const maxSpeedSquared = 100;
export class Human extends IndexedSingleColoredMesh {
  arrowKeysDown = 0;
  control = false;
  angle = Math.PI;
  verticalAngle = Math.PI * 0.5;
  haveControl = false;
  // Todo: refer to rapier
  // direction: [number, number, number];
  constructor({ scenes }: { scenes: Scene[] }) {
    const sceneids = scenes
      ? scenes.reduce((acc, scene) => acc | scene.id, 0)
      : 1;
    const mesh = engine.rust.new_character_mesh(
      sceneids,
      ...create_rust_label('human'),
    );
    super(
      {
        can_collide: false,
        vertices: engine.rust.get_geometry(mesh),
      },
      mesh,
    );
    engine.rust.set_mesh_externref(this.id, new Externref(false, this));
    engine.physics.tickables.push(this);
    this.hasGravity = true;
    this.update_scale(1, 1, 1);

    engine.addInputListener(this.#keydownfunction);
    engine.addInputListener(this.#keyupfunction);
    engine.addInputListener(this.#pointerMoveFunction);
  }
  #pointerMoveFunction: ListenerObj<'pointermove'> = {
    cb: (e: PointerEvent) => {
      this.pointerMovement = {
        x: e.movementX,
        y: e.movementY,
      };
    },
    object: this,
    options: {
      force: true,
    },
    type: 'pointermove',
  };
  #keydownfunction: ListenerObj<'keydown'> = {
    cb: (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        this.arrowKeysDown |= ARROW_KEYS.UP;
      } else if (e.key === 'ArrowDown') {
        this.arrowKeysDown |= ARROW_KEYS.DOWN;
      }
      if (e.key === 'ArrowLeft') {
        this.arrowKeysDown |= ARROW_KEYS.LEFT;
      } else if (e.key === 'ArrowRight') {
        this.arrowKeysDown |= ARROW_KEYS.RIGHT;
      }
    },
    object: this,
    type: 'keydown',
  };
  #keyupfunction: ListenerObj<'keyup'> = {
    cb: (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        this.arrowKeysDown &= ~ARROW_KEYS.UP;
        //  this.#mesh.grip=0;
      } else if (e.key === 'ArrowDown') {
        this.arrowKeysDown &= ~ARROW_KEYS.DOWN;
      }
      if (e.key === 'ArrowLeft') {
        this.arrowKeysDown &= ~ARROW_KEYS.LEFT;
      } else if (e.key === 'ArrowRight') {
        this.arrowKeysDown &= ~ARROW_KEYS.RIGHT;
      }
    },
    object: this,
    type: 'keyup',
  };
  pointerMovement = {
    x: 0,
    y: 0,
  };
  override onPhysicTick = (_delta: number, mesh: rust_pointer<'mesh'>) => {
    if (!this.haveControl) {
      return;
    }
    if (this.pointerMovement.x || this.pointerMovement.y) {
      if (this.pointerMovement.x) {
        this.angle -= (Math.PI * this.pointerMovement.x) / engine.canvas!.width;
        this.pointerMovement.x = 0;
      }
      if (this.pointerMovement.y) {
        this.verticalAngle -=
          (Math.PI * this.pointerMovement.y) / engine.canvas!.width;
        this.pointerMovement.y = 0;
      }
      if (this.verticalAngle < 0) {
        this.verticalAngle = Math.PI * 2 + this.verticalAngle;
      }
      if (this.verticalAngle < 0) {
        throw new Error('negative angle');
      }
      this.verticalAngle = this.verticalAngle % (Math.PI * 2);
      this.angle = this.angle % (Math.PI * 2);
      if (this.angle < 0) this.angle = Math.PI * 2 - this.angle;
      const vang = this.verticalAngle - Math.PI;
      // TODO: create quaternion rotation instead and multiply quaternion with that
      engine.rust.update_euler_angles_from_mutex(mesh, vang, this.angle, 0);
      if (this.colliding_character) {
        /*
          If character is colliding, update character velocity to same direction as its facingF
        */
        const velocity = DataNode.getVelocity(mesh);
        const horizontalSpeed = Math.hypot(velocity[0], velocity[2]);
        const direction2 = [Math.sin(this.angle), Math.cos(this.angle)] as [
          number,
          number,
        ];
        direction2[0] *= -horizontalSpeed;
        direction2[1] *= -horizontalSpeed;
        DataNode.setVelocity(mesh, [direction2[0], velocity[1], direction2[1]]);
      }
    }
    if (this.colliding_character) {
      const velocity = DataNode.getVelocity(mesh);
      const horizontalSpeed = Math.hypot(velocity[0], velocity[2]);
      const direction2 = [Math.sin(this.angle), Math.cos(this.angle)] as [
        number,
        number,
      ];
      if (this.arrowKeysDown) {
        let angle = 0;
        let diagonal = false;
        if (
          (this.arrowKeysDown & ARROW_KEYS.UP_RIGHT) ===
          ARROW_KEYS.UP_RIGHT
        ) {
          diagonal = true;
          angle = this.angle - Math.PI * 0.25;
        } else if (
          (this.arrowKeysDown & ARROW_KEYS.UP_LEFT) ===
          ARROW_KEYS.UP_LEFT
        ) {
          diagonal = true;
          angle = this.angle + Math.PI * 0.25;
        } else if (
          (this.arrowKeysDown & ARROW_KEYS.DOWN_RIGHT) ===
          ARROW_KEYS.DOWN_RIGHT
        ) {
          diagonal = true;
          angle = this.angle - Math.PI * 0.75;
        } else if (
          (this.arrowKeysDown & ARROW_KEYS.DOWN_LEFT) ===
          ARROW_KEYS.DOWN_LEFT
        ) {
          diagonal = true;
          angle = this.angle + Math.PI * 0.75;
        }
        if (diagonal) {
          const angle2 = Math.atan2(
            this.last_velocity[2],
            this.last_velocity[0],
          );
          if (Math.abs(angle2 - angle) > 0.1) {
            DataNode.setVelocity(mesh, [
              -Math.sin(angle) * horizontalSpeed,
              velocity[1],
              -Math.cos(angle) * horizontalSpeed,
            ]);
          }
        } else if ((this.arrowKeysDown & ARROW_KEYS.UP) === ARROW_KEYS.UP) {
          DataNode.setVelocity(mesh, [
            -direction2[0] * horizontalSpeed,
            velocity[1],
            -direction2[1] * horizontalSpeed,
          ]);
        } else if ((this.arrowKeysDown & ARROW_KEYS.DOWN) === ARROW_KEYS.DOWN) {
          DataNode.setVelocity(mesh, [
            direction2[0] * horizontalSpeed,
            velocity[1],
            direction2[1] * horizontalSpeed,
          ]);
        } else if ((this.arrowKeysDown & ARROW_KEYS.LEFT) === ARROW_KEYS.LEFT) {
          DataNode.setVelocity(mesh, [
            -direction2[1] * horizontalSpeed,
            velocity[1],
            direction2[0] * horizontalSpeed,
          ]);
        } else if (
          (this.arrowKeysDown & ARROW_KEYS.RIGHT) ===
          ARROW_KEYS.RIGHT
        ) {
          DataNode.setVelocity(mesh, [
            direction2[1] * horizontalSpeed,
            velocity[1],
            -direction2[0] * horizontalSpeed,
          ]);
        }
      }
    }
  };
  directionUpdate = false;
  override onCollideCharacter(_started: boolean) {
    if (!this.haveControl) {
      return;
    }
    const speedSquared = this.getSpeedSquaredFromId();
    if (speedSquared < maxSpeedSquared) {
      const impulse = this.impulse;
      const direction2 = [Math.sin(this.angle), Math.cos(this.angle)] as [
        number,
        number,
      ];

      if ((this.arrowKeysDown & ARROW_KEYS.UP_RIGHT) === ARROW_KEYS.UP_RIGHT) {
        const angle = this.angle - Math.PI * 0.25;

        impulse[0] = -Math.sin(angle) * maxAcceleration;
        impulse[2] = -Math.cos(angle) * maxAcceleration;
      } else if (
        (this.arrowKeysDown & ARROW_KEYS.UP_LEFT) ===
        ARROW_KEYS.UP_LEFT
      ) {
        const angle = this.angle + Math.PI * 0.25;
        impulse[0] = -Math.sin(angle) * maxAcceleration;
        impulse[2] = -Math.cos(angle) * maxAcceleration;
      } else if (
        (this.arrowKeysDown & ARROW_KEYS.DOWN_RIGHT) ===
        ARROW_KEYS.DOWN_RIGHT
      ) {
        const angle = this.angle - Math.PI * 0.75;

        impulse[0] = -Math.sin(angle) * maxAcceleration;
        impulse[2] = -Math.cos(angle) * maxAcceleration;
      } else if (
        (this.arrowKeysDown & ARROW_KEYS.DOWN_LEFT) ===
        ARROW_KEYS.DOWN_LEFT
      ) {
        const angle = this.angle + Math.PI * 0.75;
        impulse[0] = -Math.sin(angle) * maxAcceleration;
        impulse[2] = -Math.cos(angle) * maxAcceleration;
      } else if ((this.arrowKeysDown & ARROW_KEYS.UP) === ARROW_KEYS.UP) {
        impulse[0] = -direction2[0] * maxAcceleration;
        impulse[2] = -direction2[1] * maxAcceleration;
      } else if ((this.arrowKeysDown & ARROW_KEYS.DOWN) === ARROW_KEYS.DOWN) {
        impulse[0] = direction2[0] * maxAcceleration;
        impulse[2] = direction2[1] * maxAcceleration;
      } else if ((this.arrowKeysDown & ARROW_KEYS.LEFT) === ARROW_KEYS.LEFT) {
        impulse[0] = direction2[1] * -1 * maxAcceleration;
        impulse[2] = direction2[0] * maxAcceleration;
      } else if ((this.arrowKeysDown & ARROW_KEYS.RIGHT) === ARROW_KEYS.RIGHT) {
        impulse[0] = direction2[1] * maxAcceleration;
        impulse[2] = direction2[0] * -1 * maxAcceleration;
      }
    }
  }
  override checkCollide(
    dt: number,
    velocityPerDelta: readonly [number, number, number],
  ) {
    this.grip = this.arrowKeysDown ? 0 : 1;
    this.colliding_character = engine.rust.move_character(
      this.id,
      dt,
      velocityPerDelta[0],
      velocityPerDelta[1],
      velocityPerDelta[2],
    );
  }
}

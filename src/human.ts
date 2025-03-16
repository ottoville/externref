import { MeshCamera } from './controllers/MeshCamera.js';
import type { Engine } from './engine.js';
import type { Scene } from './Scene.js';
import { ARROW_KEYS } from './controllers/CameraController.js';
import { create_rust_label } from './utils.js';
import { Externref } from './externref.js';
import { IndexedSingleColoredMesh } from './GPU/AbstractMeshes/IndexedSingleColoredMesh.js';
import { DataNode } from './nodes/DataNode.js';
declare const engine: Engine;
const maxAcceleration = 10;
const closeDistance = 0.0022;
const maxSpeedSquared = 1.4 * 1.4;
export class Human extends IndexedSingleColoredMesh {
  inputManager: MeshCamera;
  collisionRadius = 2;
  readonly colliderSphere = engine.rust.create_collider_sphere(2);
  readonly closeDistanceVector = closeDistance / this.collisionRadius;

  constructor({
    scenes,
    inputEnabled,
  }: {
    scenes: Scene[];
    inputEnabled: boolean;
  }) {
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
    //this.velocity=[0,-5,0];
    this.update_scale(1, 1, 1);
    // engine.inputManager?.destroy();

    this.inputManager = new MeshCamera(engine.gpu!.mainCamera);
    if (inputEnabled) {
      engine.gpu!.mainCamera.attachControllerForCamera(this.inputManager);
    }
  }
  override onPhysicTick = (_delta: number, mesh: rust_pointer<'mesh'>) => {
    if (
      this.colliding_character &&
      DataNode.getSpeedSquared(mesh) > maxSpeedSquared
    ) {
      const direction = this.inputManager.camera.direction;
      if (this.inputManager.arrowKeysDown) {
        const velocity = DataNode.getVelocity(mesh);
        const horizontalSpeed = Math.hypot(velocity[0], velocity[2]);
        let diagonal = false;
        let angle = 0;
        if (
          (this.inputManager.arrowKeysDown & ARROW_KEYS.UP_RIGHT) ===
          ARROW_KEYS.UP_RIGHT
        ) {
          diagonal = true;
          angle = Math.atan2(-direction[2], -direction[0]) + Math.PI * 0.25;
        } else if (
          (this.inputManager.arrowKeysDown & ARROW_KEYS.UP_LEFT) ===
          ARROW_KEYS.UP_LEFT
        ) {
          diagonal = true;
          angle = Math.atan2(-direction[2], -direction[0]) - Math.PI * 0.25;
        } else if (
          (this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN_RIGHT) ===
          ARROW_KEYS.DOWN_RIGHT
        ) {
          diagonal = true;
          angle = Math.atan2(-direction[2], -direction[0]) + Math.PI * 0.75;
        } else if (
          (this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN_LEFT) ===
          ARROW_KEYS.DOWN_LEFT
        ) {
          diagonal = true;
          angle = Math.atan2(-direction[2], -direction[0]) - Math.PI * 0.75;
        }
        if (diagonal) {
          const angle2 = Math.atan2(
            this.last_velocity[2],
            this.last_velocity[0],
          );
          if (Math.abs(angle2 - angle) > 0.1) {
            DataNode.setVelocity(mesh, [
              Math.cos(angle) * horizontalSpeed,
              velocity[1],
              Math.sin(angle) * horizontalSpeed,
            ]);
          }
        } else if (
          (this.inputManager.arrowKeysDown & ARROW_KEYS.UP) ===
          ARROW_KEYS.UP
        ) {
          DataNode.setVelocity(mesh, [
            -direction[0] * horizontalSpeed,
            velocity[1],
            -direction[2] * horizontalSpeed,
          ]);
        } else if (
          (this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN) ===
          ARROW_KEYS.DOWN
        ) {
          DataNode.setVelocity(mesh, [
            direction[0] * horizontalSpeed,
            velocity[1],
            direction[2] * horizontalSpeed,
          ]);
        } else if (
          (this.inputManager.arrowKeysDown & ARROW_KEYS.LEFT) ===
          ARROW_KEYS.LEFT
        ) {
          DataNode.setVelocity(mesh, [
            -direction[2] * horizontalSpeed,
            velocity[1],
            direction[0] * horizontalSpeed,
          ]);
        } else if (
          (this.inputManager.arrowKeysDown & ARROW_KEYS.RIGHT) ===
          ARROW_KEYS.RIGHT
        ) {
          DataNode.setVelocity(mesh, [
            direction[2] * horizontalSpeed,
            velocity[1],
            -direction[0] * horizontalSpeed,
          ]);
        }
      }
    }
    const translation = DataNode.getTranslation(mesh);
    this.inputManager.cameraControl?.updatePosition(
      translation[0],
      translation[1],
      translation[2],
    );
  };
  directionUpdate = false;
  override onCollideCharacter(_started: boolean) {
    const speedSquared = this.getSpeedSquaredFromId();

    if (speedSquared < maxSpeedSquared) {
      const impulse = this.impulse;
      const direction = this.inputManager.camera.direction;

      if (
        (this.inputManager.arrowKeysDown & ARROW_KEYS.UP_RIGHT) ===
        ARROW_KEYS.UP_RIGHT
      ) {
        const angle = Math.atan2(-direction[2], -direction[0]) + Math.PI * 0.25;
        impulse[0] = Math.cos(angle) * maxAcceleration;
        impulse[2] = Math.sin(angle) * maxAcceleration;
      } else if (
        (this.inputManager.arrowKeysDown & ARROW_KEYS.UP_LEFT) ===
        ARROW_KEYS.UP_LEFT
      ) {
        const angle = Math.atan2(-direction[2], -direction[0]) - Math.PI * 0.25;
        impulse[0] = Math.cos(angle) * maxAcceleration;
        impulse[2] = Math.sin(angle) * maxAcceleration;
      } else if (
        (this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN_RIGHT) ===
        ARROW_KEYS.DOWN_RIGHT
      ) {
        const angle = Math.atan2(-direction[2], -direction[0]) + Math.PI * 0.75;
        impulse[0] = Math.cos(angle) * maxAcceleration;
        impulse[2] = Math.sin(angle) * maxAcceleration;
      } else if (
        (this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN_LEFT) ===
        ARROW_KEYS.DOWN_LEFT
      ) {
        const angle = Math.atan2(-direction[2], -direction[0]) - Math.PI * 0.75;
        impulse[0] = Math.cos(angle) * maxAcceleration;
        impulse[2] = Math.sin(angle) * maxAcceleration;
      } else if (
        (this.inputManager.arrowKeysDown & ARROW_KEYS.UP) ===
        ARROW_KEYS.UP
      ) {
        impulse[0] = -direction[0] * maxAcceleration;
        impulse[2] = -direction[2] * maxAcceleration;
      } else if (
        (this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN) ===
        ARROW_KEYS.DOWN
      ) {
        impulse[0] = direction[0] * maxAcceleration;
        impulse[2] = direction[2] * maxAcceleration;
      } else if (
        (this.inputManager.arrowKeysDown & ARROW_KEYS.LEFT) ===
        ARROW_KEYS.LEFT
      ) {
        impulse[0] = direction[2] * -1 * maxAcceleration;
        impulse[2] = direction[0] * maxAcceleration;
      } else if (
        (this.inputManager.arrowKeysDown & ARROW_KEYS.RIGHT) ===
        ARROW_KEYS.RIGHT
      ) {
        impulse[0] = direction[2] * maxAcceleration;
        impulse[2] = direction[0] * -1 * maxAcceleration;
      }
    }
  }
  override checkCollide(
    _dt: number,
    velocityPerDelta: readonly [number, number, number],
  ) {
    this.grip = this.inputManager.arrowKeysDown ? 0 : 1;
    const translation = this.getTranslationFromId();
    const scaledPosition = engine.collider.scaledPosition;
    scaledPosition[0] = translation[0] / this.collisionRadius;
    scaledPosition[1] = translation[1] / this.collisionRadius;
    scaledPosition[2] = translation[2] / this.collisionRadius;
    const scaledVelocity = engine.collider.scaledVelocity;
    scaledVelocity[0] = velocityPerDelta[0] / this.collisionRadius;
    scaledVelocity[1] = velocityPerDelta[1] / this.collisionRadius;
    scaledVelocity[2] = velocityPerDelta[2] / this.collisionRadius;
    //TODO: remove this line and rest of legacy collider check from character
    engine.collideWithWorld(
      this,
      scaledPosition,
      scaledVelocity,
      translation,
      velocityPerDelta,
    );
    /*this.colliding_character = engine.rust.move_character(
      this.id,
      dt,
      velocityPerDelta[0],
      velocityPerDelta[1],
      velocityPerDelta[2],
    );*/

    if (!engine.collider.collision_resolved) {
      //console.log('cant solve collision', this.label)
    }
    this.setTranslation([
      engine.collider.finalPosition[0],
      engine.collider.finalPosition[1],
      engine.collider.finalPosition[2],
    ]);
  }
}

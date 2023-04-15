//@ts-ignore
import { TerraMatrix } from "./Math.js";
import { MeshCamera } from "./controllers/MeshCamera.js";
import type { Engine } from "./engine.js";
import { Box } from "./GPU/Meshes/Box.js";
import type { Scene } from "./Scene.js";
import { ARROW_KEYS } from "./controllers/CameraController.js";
declare const engine: Engine;
const maxAcceleration = 10;
export const closeDistance = 0.0022
const maxSpeedSquared = 1.4 * 1.4
export class Human extends Box {
    inputManager: MeshCamera;
    radius: { 0: number; 1: number; 2: number; };
    readonly #radius: [x: number, y: number, z: number] = [0.5, 1.8, 0.3]
    readonly collisionsScalingMatrix: TerraMatrix = new TerraMatrix([
        1.0 / this.#radius[0], 0.0, 0.0, 0.0,
        0.0, 1.0 / this.#radius[1], 0.0, 0.0,
        0.0, 0.0, 1.0 / this.#radius[2], 0.0,
        0.0, 0.0, 0.0, 1.0
    ]);
    readonly closeDistanceVector: [number, number, number] = [closeDistance / this.#radius[0], closeDistance / this.#radius[1], closeDistance / this.#radius[2]];

    constructor(properties: { scenes: Scene[], inputEnabled: boolean }) {
        super({ ...properties, point_light: 400, can_collide: false, label: 'human', color: [0, 0, 1, 0] });
        engine.physics.tickables.push(this);
        this.hasGravity = true;
        //this.velocity=[0,-5,0];
        this.update_scale(1, 1, 1);
        // engine.inputManager?.destroy();

        this.inputManager = new MeshCamera(engine.mainCamera);
        if (properties.inputEnabled) {
            engine.mainCamera.attachControllerForCamera(this.inputManager)
        }
        engine.physics.onPhysicTick.add(() => {
            //  console.log('human translation', this.translation)
        })

        const radius = this.#radius
        const collisionsScalingMatrix = this.collisionsScalingMatrix;
        const myCloseDistance = this.closeDistanceVector;
        this.radius = {
            get 0() {
                return radius[0]
            },
            get 1() {
                return radius[1]
            },
            get 2() {
                return radius[2]
            },
            set 0(v: number) {
                radius[0] = v;
                collisionsScalingMatrix[0] = 1.0 / v;
                myCloseDistance[0] = closeDistance / v

            },
            set 1(v: number) {
                radius[1] = v;
                collisionsScalingMatrix[5] = 1.0 / v;
                myCloseDistance[1] = closeDistance / v
            },
            set 2(v: number) {
                radius[2] = v;
                collisionsScalingMatrix[10] = 1.0 / v;
                myCloseDistance[2] = closeDistance / v
            }
        }
    }
    override onPhysicTick = () => {
        let updateCameraDirection = false;
        if (this.inputManager.pointerMovement.x || this.inputManager.pointerMovement.y) {
            if (this.inputManager.pointerMovement.x) {
                this.inputManager.angle += Math.PI * this.inputManager.pointerMovement.x / engine.canvas!.width
                this.inputManager.pointerMovement.x = 0;
            }
            if (this.inputManager.pointerMovement.y) {
                this.inputManager.verticalAngle -= Math.PI * this.inputManager.pointerMovement.y / engine.canvas!.width
                this.inputManager.pointerMovement.y = 0;
            }
            updateCameraDirection = true;

        }
        if (updateCameraDirection) {
            if (this.inputManager.angle < 0) {
                this.inputManager.angle = Math.PI * 2 + this.inputManager.angle
            }
            if (this.inputManager.angle < 0) {
                throw new Error('negative angle');
            }
            this.inputManager.angle = this.inputManager.angle % (Math.PI * 2);
            this.inputManager.verticalAngle = this.inputManager.verticalAngle % (Math.PI * 2);
            const ang = this.inputManager.angle - Math.PI;
            const vang = this.inputManager.verticalAngle;

            this.inputManager.cameraControl?.updateDirection(direction => {
                direction[0] = Math.cos(ang) * Math.sin(vang)
                direction[1] = Math.cos(vang)
                direction[2] = Math.sin(ang) * Math.sin(vang)
            });
        }
        if (this.colliding_character && this.speedSquared > maxSpeedSquared) {
            const direction = this.inputManager.camera.direction;
            if(this.inputManager.arrowKeysDown) {
                const horizontalSpeed = Math.hypot(this.velocity[0], this.velocity[2]);
                let diagonal = false;
                let angle = 0;
                if ((this.inputManager.arrowKeysDown & ARROW_KEYS.UP_RIGHT) === ARROW_KEYS.UP_RIGHT) {
                    diagonal = true;
                    angle = Math.atan2(-direction[2], -direction[0]) + Math.PI * 0.25;
                }
                else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.UP_LEFT) === ARROW_KEYS.UP_LEFT) {
                    diagonal = true;
                    angle = Math.atan2(-direction[2], -direction[0]) - Math.PI * 0.25;
                }
                else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN_RIGHT) === ARROW_KEYS.DOWN_RIGHT) {
                    diagonal = true;
                    angle = Math.atan2(-direction[2], -direction[0]) + Math.PI * 0.75;
                }
                else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN_LEFT) === ARROW_KEYS.DOWN_LEFT) {
                    diagonal = true;
                    angle = Math.atan2(-direction[2], -direction[0]) - Math.PI * 0.75;
                }
                if(diagonal) {
                    const angle2 = Math.atan2(this.last_velocity[2], this.last_velocity[0]);
                    if (Math.abs(angle2 - angle) > 0.1) {
                        this.velocity = [Math.cos(angle) * horizontalSpeed, this.velocity[1], Math.sin(angle) * horizontalSpeed];
                    }
                }
                else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.UP) === ARROW_KEYS.UP) {
                    this.velocity = [-direction[0] * horizontalSpeed, this.velocity[1], -direction[2] * horizontalSpeed]
                }
                else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN) === ARROW_KEYS.DOWN) {
                    this.velocity = [direction[0] * horizontalSpeed, this.velocity[1], direction[2] * horizontalSpeed]
                }
                else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.LEFT) === ARROW_KEYS.LEFT) {
                    this.velocity = [-direction[2] * horizontalSpeed, this.velocity[1], direction[0] * horizontalSpeed]
                }
                else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.RIGHT) === ARROW_KEYS.RIGHT) {
                    this.velocity = [direction[2] * horizontalSpeed, this.velocity[1], -direction[0] * horizontalSpeed]
                }
            }
        }
        this.inputManager.cameraControl?.updatePosition(position => position.set(this.translation))
    }
    directionUpdate = false;
    override onCollideCharacter() {
        const speedSquared = this.speedSquared;
        if (speedSquared < maxSpeedSquared) {

            const impulse = [0, 0, 0] as [number, number, number];
            const direction = this.inputManager.camera.direction;

            if ((this.inputManager.arrowKeysDown & ARROW_KEYS.UP_RIGHT) === ARROW_KEYS.UP_RIGHT) {
                const angle = Math.atan2(-direction[2], -direction[0]) + Math.PI * 0.25;
                impulse[0] = Math.cos(angle) * maxAcceleration
                impulse[2] = Math.sin(angle) * maxAcceleration
            }
            else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.UP_LEFT) === ARROW_KEYS.UP_LEFT) {
                const angle = Math.atan2(-direction[2], -direction[0]) - Math.PI * 0.25;
                impulse[0] = Math.cos(angle) * maxAcceleration
                impulse[2] = Math.sin(angle) * maxAcceleration
            }
            else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN_RIGHT) === ARROW_KEYS.DOWN_RIGHT) {
                const angle = Math.atan2(-direction[2], -direction[0]) + Math.PI * 0.75;
                impulse[0] = Math.cos(angle) * maxAcceleration
                impulse[2] = Math.sin(angle) * maxAcceleration
            }
            else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN_LEFT) === ARROW_KEYS.DOWN_LEFT) {
                const angle = Math.atan2(-direction[2], -direction[0]) - Math.PI * 0.75;
                impulse[0] = Math.cos(angle) * maxAcceleration
                impulse[2] = Math.sin(angle) * maxAcceleration
            }
            else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.UP) === ARROW_KEYS.UP) {
                impulse[0] = (-direction[0] * maxAcceleration)
                impulse[2] = (-direction[2] * maxAcceleration)
            }
            else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.DOWN) === ARROW_KEYS.DOWN) {
                impulse[0] = (direction[0] * maxAcceleration)
                impulse[2] = (direction[2] * maxAcceleration)
            }
            else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.LEFT) === ARROW_KEYS.LEFT) {
                impulse[0] -= (direction[2] * maxAcceleration)
                impulse[2] -= (direction[0] * -1 * maxAcceleration)
            }
            else if ((this.inputManager.arrowKeysDown & ARROW_KEYS.RIGHT) === ARROW_KEYS.RIGHT) {
                impulse[0] -= (direction[2] * -1 * maxAcceleration)
                impulse[2] -= (direction[0] * maxAcceleration)
            }
            this.impulse[0] = impulse[0];
            this.impulse[1] = impulse[1];
            this.impulse[2] = impulse[2];
        }

    }
    override checkCollide(velocityPerDelta: readonly [number, number, number]) {
        this.grip = this.inputManager.arrowKeysDown ? 0 : 1;
        const translation = this.translation;
        const scaledPosition = engine.collider.scaledPosition;
        scaledPosition[0] = translation[0] / this.radius[0];
        scaledPosition[1] = translation[1] / this.radius[1];
        scaledPosition[2] = translation[2] / this.radius[2];
        const scaledVelocity = engine.collider.scaledVelocity;
        scaledVelocity[0] = velocityPerDelta[0] / this.radius[0];
        scaledVelocity[1] = velocityPerDelta[1] / this.radius[1];
        scaledVelocity[2] = velocityPerDelta[2] / this.radius[2];
        engine.collider.collidedMesh = undefined;
        engine.collider._retry = 0;
        engine.collideWithWorld(this, scaledPosition, scaledVelocity);
        if (!engine.collider.collision_resolved) {
            //console.log('cant solve collision', this.label)
        }
        return engine.collider.finalPosition;
    }
}
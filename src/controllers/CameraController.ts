import type { CameraControl } from "../TerraCamera.js";
import { closeDistance, Ellipsoid } from "../DataNode.js";
import { TerraMatrix } from "../Math.js";

export abstract class CameraController implements Ellipsoid {
    radius: { 0: number; 1: number; 2: number; }
    private readonly collisionRadius: [number, number, number] = [2, 2, 2];
    readonly collisionsScalingMatrix = new TerraMatrix([
        1.0 / this.collisionRadius[0],   0.0,                   0.0,                    0.0,
        0.0,                     1.0 / this.collisionRadius[1], 0.0,                    0.0,
        0.0,                     0.0,                   1.0 / this.collisionRadius[2],  0.0,
        0.0, 0.0, 0.0, 1.0]);
    readonly closeDistanceVector:[number,number,number] = [closeDistance / this.collisionRadius[0], closeDistance / this.collisionRadius[1], closeDistance / this.collisionRadius[2]];
    cameraControl?: CameraControl;
    constructor(protected element: HTMLElement | undefined) {
        const collisionRadius=this.collisionRadius;
        const collisionsScalingMatrix = this.collisionsScalingMatrix;
        const myCloseDistance = this.closeDistanceVector;
        this.radius = {
            get 0() {
                return collisionRadius[0]
            },
            get 1() {
                return collisionRadius[1]
            },
            get 2() {
                return collisionRadius[2]
            },
            set 0(v: number) {
                collisionRadius[0] = v;
                collisionsScalingMatrix[0] = 1.0 / v;
                myCloseDistance[0] = closeDistance / v
            },
            set 1(v: number) {
                collisionRadius[1] = v;
                collisionsScalingMatrix[5] = 1.0 / v;
                myCloseDistance[1] = closeDistance / v
            },
            set 2(v: number) {
                collisionRadius[2] = v;
                collisionsScalingMatrix[10] = 1.0 / v;
                myCloseDistance[2] = closeDistance / v
            }
        }
    }
    abstract readonly name: string;
    abstract serialize(): void;


    abstract attachCameraController() : void;
    abstract deAttachCameraController() : void;
    abstract checkInputs() : boolean
    abstract calculateCameraPositionAndTarget(): void

}
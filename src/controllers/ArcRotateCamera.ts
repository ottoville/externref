import type { Engine } from "../engine.js";
import { TerraMatrix, TerraVector3 } from "../Math.js";
import type { TerraCamera } from "../TerraCamera.js";
import { CameraController } from "./CameraController.js";
let pointerDownButton = 0;
const panningSensibility = 20;
const angularSensibilityX = 3000;
const angularSensibilityY = 3000;
declare const engine: Engine;


const Epsilon = 0.001;


interface serialized {
    alpha: number,
    beta: number,
    radius: number,
    target: { 0: number, 1: number, 2: number } & Float32Array,
    position: { 0: number, 1: number, 2: number } & Float32Array
}
export class ArcRotateCamera extends CameraController {
    name='ArcRotateCamera'
    #serializeRequested = false;
    serialize(): void {
        if (this.#serializeRequested || !engine.DB)
            return;
        this.#serializeRequested = true;
        const request = engine.DB.transaction("save", "readwrite").objectStore("save").put({
            type: 'camera',
            name: 'ArchRotateCamera',
            data: {
                alpha: this.#alpha,
                beta: this.#beta,
                radius: this.#radius,
                target: this.#target,
                position: new Float32Array(engine.mainCamera.position as unknown as number[]) as { 0: number, 1: number, 2: number } & Float32Array
            } as serialized
        });
        request.onsuccess = () => {
            this.#serializeRequested = false;
        };
        request.onerror = (e) => {
            this.#serializeRequested = false;
            console.error(e);
        };
    }

    #computationVector = new TerraVector3();

    #cameraTransformMatrix = new TerraMatrix();

    // #globalCurrentTarget = new Float32Array(3);


    #inertia = 0.9;
    #speed = 2.0;

    #transformedDirection = new TerraVector3();
    /**
    * Defines the value of the inertia used during panning.
    * 0 would mean stop inertia and one would mean no decelleration at all.
    */
    #panningInertia = 0.9;

    #inertialPanning = new TerraVector3();
    /*
    * Current inertia value on the longitudinal axis.
    * The bigger this number the longer it will take for the camera to stop.
    */
    #inertialAlphaOffset = 0;
    /**
    * Current inertia value on the latitudinal axis.
    * The bigger this number the longer it will take for the camera to stop.
    */
    #inertialBetaOffset = 0;
    #collisionTriggered = false;
    #target = new TerraVector3([100, 0, 1000]);
    #alpha = 0;
    #beta = 0;
    #radius = 10;
    constructor(private camera: TerraCamera, initial = false) {
        super();
        if (initial && engine.DB) {
            engine.DB.transaction("save").objectStore("save").get(["camera", "ArchRotateCamera"]).onsuccess = evt => {
                if ((evt.target as IDBRequest).result) {
                    const restored = (evt.target as IDBRequest).result.data as serialized | undefined;
                    if (restored) {
                        this.#alpha = restored.alpha;
                        this.#beta = restored.beta;
                        this.#radius = restored.radius;
                        this.#target.set(restored.target);
                        this.cameraControl?.updatePosition(position => {
                            position.set(restored.position)
                        })
                        this.#calculateDirection();
                    }
                }
            }
        } else {
            this.#target.set([
                this.camera.position[0] - this.camera.direction[0] * 100,
                this.camera.position[1] - this.camera.direction[1] * 100,
                this.camera.position[2] - this.camera.direction[2] * 100,
            ]);
            this.#rebuildAnglesAndRadius();
        }
    }
    #cameraMove = (e: PointerEvent) => {
        e.preventDefault();
        if (pointerDownButton == 2) {
            this.#inertialPanning[0] += -e.movementX / panningSensibility;
            this.#inertialPanning[2] += e.movementY / panningSensibility;
        } else {
            this.#inertialAlphaOffset += e.movementX / angularSensibilityX;
            this.#inertialBetaOffset -= e.movementY / angularSensibilityY;
        }
    }
    #cameraWheel = (e: WheelEvent) => {
        e.preventDefault();
        let delta = -e.deltaY / (3 * 40);
        if (e.ctrlKey)
            delta *= 10;
        if (delta) {
            this.inertialRadiusOffset += delta;
        }
    }
    #cameraPointerDown = (e: PointerEvent) => {
        pointerDownButton = e.button;
        if (pointerDownButton !== 2) {
            engine.gpu?.renderPassScreen.pickPosition().then(position => {
                if(position) {
                    this.#targetMovingfrom = new TerraVector3([this.#target[0], this.#target[1], this.#target[2]]);
                    this.#targetMovingTo = position.position;
                    this.#targetLerpPosition = 0;
                }
            }).catch(err => engine.showError(err))
        }
        engine.addInputListener('pointermove', this, this.#cameraMove);
        const onceUp = () => {
            engine.removeInputListener('pointermove', this, this.#cameraMove)
            engine.removeInputListener('pointerleave', this, onceLeace)
        }
        const onceLeace = () => {
            engine.removeInputListener('pointermove', this, this.#cameraMove);
            engine.removeInputListener('pointerup', this, onceUp);
        }
        engine.addInputListenerOnce('pointerleave', this, onceLeace);
        engine.addInputListenerOnce('pointerup',this, onceUp)
    
    }
    deAttachCameraController() {
        engine.clearInputListeners(this);
        this.serialize();
    }
    attachCameraController() {
        engine.addInputListener('wheel', this, this.#cameraWheel);
        engine.addInputListener('pointerdown', this, this.#cameraPointerDown);
    }
    #calculatePosition() {
        let sinb = Math.sin(this.#beta);
        if (sinb === 0) {
            sinb = 0.0001;
        }
        //this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);
        this.#computationVector[0] = this.#target[0] + this.#radius * Math.cos(this.#alpha) * sinb;
        this.#computationVector[1] = this.#target[1] + this.#radius * Math.cos(this.#beta);
        this.#computationVector[2] = this.#target[2] + this.#radius * Math.sin(this.#alpha) * sinb;
        return this.#computationVector
    }
    calculateCameraPositionAndTarget() {
        if(!this.cameraControl) {
            throw new Error('no cameracontrol')
        }
        this.#collisionTriggered = true;


        // coordinator.getNewPosition(this._position, this._collisionVelocity, this._collider, 3, null, this._onCollisionPositionChange, this.uniqueId);

        // this._position.divideToRef(Vector3.FromArray(terraEngine.collider._radius), coordinator._scaledPosition);
        const scaledPosition = engine.collider.scaledPosition;
        scaledPosition[0] = this.camera.position[0] / this.radius[0];
        scaledPosition[1] = this.camera.position[1] / this.radius[1];
        scaledPosition[2] = this.camera.position[2] / this.radius[2];
        //this._newPosition.subtractToRef(this._position, this._collisionVelocity);
        // this._collisionVelocity.divideToRef(Vector3.FromArray(terraEngine.collider._radius), coordinator._scaledVelocity);
        const scaledVelocity = engine.collider.scaledVelocity;
        const newPosition = this.#calculatePosition()
        scaledVelocity[0] = (newPosition[0] - this.camera.position[0]) / this.radius[0];
        scaledVelocity[1] = (newPosition[1] - this.camera.position[1]) / this.radius[1];
        scaledVelocity[2] = (newPosition[2] - this.camera.position[2]) / this.radius[2];

        engine.collider.collidedMesh = undefined;
        engine.collider._retry = 0;

        // terraEngine.collider._initialVelocity = coordinator._scaledVelocity;

        //  terraEngine.collider._initialPosition = coordinator._scaledPosition;
        //let starttime=performance.now();
        engine.collideWithWorld(this, scaledPosition, scaledVelocity);

        //run the callback
        // if (!this.engine.collider.collidedMesh) {
        if (engine.collider.didCollide) {
            //this._position.copyFrom(position);
            if (this.camera.position[0] != engine.collider.finalPosition[0] || this.camera.position[1] != engine.collider.finalPosition[1] || this.camera.position[2] != engine.collider.finalPosition[2]) {
                this.cameraControl?.updatePosition(position => position.set(engine.collider.finalPosition))
            }
            this.#rebuildAnglesAndRadius();
        }
        this.#collisionTriggered = false;
        // Recompute because of constraints
        this.cameraControl?.updatePosition(position => position.set(this.#calculatePosition()))

        this.#calculateDirection();
        

    }
    #calculateDirection() {
        this.cameraControl?.updateDirection((direction) => {
            direction[0] = this.camera.position[0] - this.#target[0];
            direction[1] = this.camera.position[1] - this.#target[1];
            direction[2] = this.camera.position[2] - this.#target[2];
            //Normalize direction
            const zLength = Math.hypot(direction[0], direction[1], direction[2]);
            if (!(zLength === 0 || zLength === 1)) {
                //zAxis.normalizeFromLength(xLength);
                const scale = 1.0 / zLength;
                direction[0] *= scale;
                direction[1] *= scale;
                direction[2] *= scale;
            }
        });

    }
    #targetMovingfrom: TerraVector3 | null = null;
    #targetMovingTo: TerraVector3 | null = null;
    #targetLerpPosition = 0;
    checkInputs = () => {
        if (this.#collisionTriggered) {
            return false;
        }
        let updateView = false;
        //if (async) collision inspection was triggered, don't update the camera's position - until the collision callback was called.

        //inputs.checkInputs();
        // Inertia
        if (this.#inertialAlphaOffset !== 0 || this.#inertialBetaOffset !== 0 || this.inertialRadiusOffset !== 0) {
            if (this.#targetMovingfrom != null && this.#targetMovingTo != null) {
                const newTarget = new TerraVector3();
                this.#targetMovingfrom.LerpToRef(this.#targetMovingTo, this.#targetLerpPosition, newTarget);
                this.#target = newTarget;
                this.#targetLerpPosition += 0.01;
                if (this.#targetLerpPosition > 1) {
                    this.#targetMovingfrom = null;
                    this.#targetMovingTo = null;
                    this.#targetLerpPosition = 0;
                }
            }

            let inertialAlphaOffset = this.#inertialAlphaOffset;
            if (this.#beta <= 0) {
                inertialAlphaOffset *= -1;
            }
            this.#alpha += inertialAlphaOffset;

            this.#beta += this.#inertialBetaOffset;
            //useRightHandedSystem
            inertialAlphaOffset *= -1;
            this.#radius -= this.inertialRadiusOffset;
            this.#inertialAlphaOffset *= this.#inertia;
            this.#inertialBetaOffset *= this.#inertia;
            this.inertialRadiusOffset *= this.#inertia;
            if (Math.abs(this.#inertialAlphaOffset) < Epsilon) {
                this.#inertialAlphaOffset = 0;
            }
            if (Math.abs(this.#inertialBetaOffset) < Epsilon) {
                this.#inertialBetaOffset = 0;
            }
            if (Math.abs(this.inertialRadiusOffset) < this.#speed * Epsilon) {
                this.inertialRadiusOffset = 0;
            }
            updateView = true;
        }

        // Panning inertia
        if (this.#inertialPanning[0] !== 0 || this.#inertialPanning[2] !== 0) {
            this.#targetMovingfrom = null;
            this.#targetMovingTo = null;


            this.camera.viewArr.invertToRef(this.#cameraTransformMatrix);
            this.#transformedDirection.set([this.#cameraTransformMatrix[0], this.#cameraTransformMatrix[1], this.#cameraTransformMatrix[2]]);

            const scaleX = this.#inertialPanning[0];
            const scaleZ = this.#inertialPanning[2]
            // panning on X Axis
            this.#transformedDirection[0] *= scaleX;
            this.#transformedDirection[1] *= scaleX;
            this.#transformedDirection[2] *= scaleX;

            // panning on Y axis
            // this.#transformedDirection[1] += panningAxis[1] * this.#inertialPanningY;

            // panning on Z axis
            this.#transformedDirection[0] -= Math.cos(this.#alpha) * scaleZ;
            this.#transformedDirection[2] -= Math.sin(this.#alpha) * scaleZ;
            //this._target.addInPlace(this._transformedDirection);
            this.#target[0] += this.#transformedDirection[0]
            this.#target[1] += this.#transformedDirection[1]
            this.#target[2] += this.#transformedDirection[2]
            //Camera direction
            //for LHW this is target - position
            this.#calculateDirection();
            updateView = true;
            this.#inertialPanning[0] *= this.#panningInertia;
            this.#inertialPanning[2] *= this.#panningInertia;

            if (Math.abs(this.#inertialPanning[0]) < this.#speed * Epsilon) {
                this.#inertialPanning[0] = 0;
            }
            if (Math.abs(this.#inertialPanning[2]) < this.#speed * Epsilon) {
                this.#inertialPanning[2] = 0;
            }
        }

        // Limits
        this.checkLimits();

        return updateView;
    }
    // Rebuilds angles (alpha, beta) and radius from the give position and target
    #rebuildAnglesAndRadius(): void {
        // this._position.subtractToRef(this._getTargetPosition(), this._computationVector);
        this.#computationVector[0] = this.camera.position[0] - this.#target[0];
        this.#computationVector[1] = this.camera.position[1] - this.#target[1];
        this.#computationVector[2] = this.camera.position[2] - this.#target[2];

        // this.radius = this._computationVector.length();
        this.#radius = Math.sqrt(this.#computationVector[0] * this.#computationVector[0] + this.#computationVector[1] * this.#computationVector[1] + this.#computationVector[2] * this.#computationVector[2])

        if (this.#radius === 0) {
            this.#radius = 0.0001; // Just to avoid division by zero
        }

        // Alpha
        if (this.#computationVector[0] === 0 && this.#computationVector[2] === 0) {
            this.#alpha = Math.PI / 2; // avoid division by zero when looking along up axis, and set to acos(0)
        } else {
            this.#alpha = Math.acos(this.#computationVector[0] / Math.sqrt(Math.pow(this.#computationVector[0], 2) + Math.pow(this.#computationVector[2], 2)));
        }
        if (this.#computationVector[2] < 0) {
            this.#alpha = 2 * Math.PI - this.#alpha;
        }

        // Beta
        this.#beta = Math.acos(this.#computationVector[1] / this.#radius);
        this.checkLimits();
    }

    // Minimum allowed angle on the latitudinal axis.
    // This can help limiting how the Camera is able to move in the scene.

    lowerBetaLimit = 0.01;

    // Maximum allowed angle on the latitudinal axis.
    // This can help limiting how the Camera is able to move in the scene.

    upperBetaLimit = Math.PI - 0.01;

    // Minimum allowed angle on the longitudinal axis.
    // This can help limiting how the Camera is able to move in the scene.

    lowerAlphaLimit: number | null = null;
    // Maximum allowed angle on the longitudinal axis.
    // This can help limiting how the Camera is able to move in the scene.
    upperAlphaLimit: number | null = null;
    //Minimum allowed distance of the camera to the target(The camera can not get closer).
    // This can help limiting how the Camera is able to move in the scene.
    lowerRadiusLimit: number | null = null;

    // Current inertia value on the radius axis.
    // The bigger this number the longer it will take for the camera to stop.
    inertialRadiusOffset = 0;
    // Maximum allowed distance of the camera to the target (The camera can not get further).
    // This can help limiting how the Camera is able to move in the scene.
    upperRadiusLimit: number | null = null;
    private checkLimits() {
        if (!(this.lowerBetaLimit === null || this.lowerBetaLimit === undefined)) {
            if (this.#beta < this.lowerBetaLimit) {
                this.#beta = this.lowerBetaLimit;
            }
        }

        if (!(this.upperBetaLimit === null || this.upperBetaLimit === undefined)) {
            if (this.#beta > this.upperBetaLimit) {
                this.#beta = this.upperBetaLimit;
            }
        }

        if (this.lowerAlphaLimit !== null && this.#alpha < this.lowerAlphaLimit) {
            this.#alpha = this.lowerAlphaLimit;
        }
        if (this.upperAlphaLimit !== null && this.#alpha > this.upperAlphaLimit) {
            this.#alpha = this.upperAlphaLimit;
        }

        if (this.lowerRadiusLimit !== null && this.#radius < this.lowerRadiusLimit) {
            this.#radius = this.lowerRadiusLimit;
            this.inertialRadiusOffset = 0;
        }
        if (this.upperRadiusLimit !== null && this.#radius > this.upperRadiusLimit) {
            this.#radius = this.upperRadiusLimit;
            this.inertialRadiusOffset = 0;
        }
    }
}
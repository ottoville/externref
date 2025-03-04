import { closeDistance } from '../nodes/DataNode.js';
import type { Engine, ListenerObj } from '../engine.js';
import {
  MutableTerraVector3,
  ReadOnlyTerraVector3,
  TerraMatrix,
} from '../Math.js';
import type { TerraCamera } from '../TerraCamera.js';
import { CameraController } from './CameraController.js';
let pointerDownButton = 0;
const panningSensibility = 20;
const angularSensibilityX = 3000;
const angularSensibilityY = 3000;
declare const engine: Engine;

const Epsilon = 0.001;

interface serialized {
  alpha: number;
  beta: number;
  radius: number;
  target: { 0: number; 1: number; 2: number } & Float32Array;
  position: { 0: number; 1: number; 2: number } & Float32Array;
}
export class ArcRotateCamera extends CameraController {
  name = 'ArcRotateCamera';
  #serializeRequested = false;
  serialize(): void {
    if (this.#serializeRequested || !engine.DB) return;
    this.#serializeRequested = true;
    const request = engine.DB.transaction('save', 'readwrite')
      .objectStore('save')
      .put({
        data: {
          alpha: this.#alpha,
          beta: this.#beta,
          position: new Float32Array(
            engine.gpu!.mainCamera.position as unknown as number[],
          ) as { 0: number; 1: number; 2: number } & Float32Array,
          radius: this.#radius,
          target: this.#target,
        } as serialized,
        name: 'ArchRotateCamera',
        type: 'camera',
      });
    request.onsuccess = () => {
      this.#serializeRequested = false;
    };
    request.onerror = (e) => {
      this.#serializeRequested = false;
      console.error(e);
    };
  }

  #computationVector: [number, number, number] = [0, 0, 0];

  #cameraTransformMatrix = new TerraMatrix();

  // #globalCurrentTarget = new Float32Array(3);

  #inertia = 0.9;
  #speed = 2.0;

  #transformedDirection = new MutableTerraVector3();
  /**
   * Defines the value of the inertia used during panning.
   * 0 would mean stop inertia and one would mean no decelleration at all.
   */
  #panningInertia = 0.9;

  #inertialPanning = new MutableTerraVector3();
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

  #target = new MutableTerraVector3([100, 0, 1000]);
  #alpha = 0;
  #beta = 0;
  #radius = 10;
  radius: { 0: number; 1: number; 2: number };
  private readonly collisionRadius: [number, number, number] = [2, 2, 2];
  readonly collisionsScalingMatrix = new TerraMatrix([
    1.0 / this.collisionRadius[0],
    0.0,
    0.0,
    0.0,
    0.0,
    1.0 / this.collisionRadius[1],
    0.0,
    0.0,
    0.0,
    0.0,
    1.0 / this.collisionRadius[2],
    0.0,
    0.0,
    0.0,
    0.0,
    1.0,
  ]);
  readonly closeDistanceVector: [number, number, number] = [
    closeDistance / this.collisionRadius[0],
    closeDistance / this.collisionRadius[1],
    closeDistance / this.collisionRadius[2],
  ];
  constructor(
    private camera: TerraCamera,
    initial = false,
  ) {
    super();
    const collisionRadius = this.collisionRadius;
    const collisionsScalingMatrix = this.collisionsScalingMatrix;
    const myCloseDistance = this.closeDistanceVector;
    this.radius = {
      get 0() {
        return collisionRadius[0];
      },
      set 0(v: number) {
        collisionRadius[0] = v;
        collisionsScalingMatrix[0] = 1.0 / v;
        myCloseDistance[0] = closeDistance / v;
      },
      get 1() {
        return collisionRadius[1];
      },
      set 1(v: number) {
        collisionRadius[1] = v;
        collisionsScalingMatrix[5] = 1.0 / v;
        myCloseDistance[1] = closeDistance / v;
      },
      get 2() {
        return collisionRadius[2];
      },
      set 2(v: number) {
        collisionRadius[2] = v;
        collisionsScalingMatrix[10] = 1.0 / v;
        myCloseDistance[2] = closeDistance / v;
      },
    };
    if (initial && engine.DB) {
      engine.DB.transaction('save')
        .objectStore('save')
        .get(['camera', 'ArchRotateCamera']).onsuccess = (evt) => {
        const result = (
          evt.target as IDBRequest<{
            data: serialized;
            name: string;
            type: string;
          }>
        ).result;
        if (result) {
          this.#alpha = result.data.alpha;
          this.#beta = result.data.beta;
          this.#radius = result.data.radius;
          this.#target.set(result.data.target);
          this.cameraControl?.updatePosition(
            result.data.position[0],
            result.data.position[1],
            result.data.position[2],
          );
          this.#calculateDirection();
        } else {
          // Use these default values for camera when there are no existing save
          this.#alpha = 0.4614110368395256;
          this.#beta = 1.4816457152012938;
          this.#radius = 457.55058783756886;
          this.cameraControl?.updatePosition(952.791, 299.464, 587.233);
          this.#target.set([544.716, 258.727, 384.335]);
        }
      };
    } else {
      this.#target.set([
        this.camera.position[0] - this.camera.direction[0] * 100,
        this.camera.position[1] - this.camera.direction[1] * 100,
        this.camera.position[2] - this.camera.direction[2] * 100,
      ]);
      this.#rebuildAnglesAndRadius();
    }
  }
  #cameraMove: ListenerObj<'pointermove'> = {
    cb: (e) => {
      e.preventDefault();
      if (pointerDownButton == 2) {
        this.#inertialPanning[0] += -e.movementX / panningSensibility;
        this.#inertialPanning[2] += e.movementY / panningSensibility;
      } else {
        this.#inertialAlphaOffset += e.movementX / angularSensibilityX;
        this.#inertialBetaOffset -= e.movementY / angularSensibilityY;
      }
    },
    object: this,
    type: 'pointermove',
  };
  #cameraWheel: ListenerObj<'wheel'> = {
    cb: (e) => {
      e.preventDefault();
      let delta = -e.deltaY / (3 * 40);
      if (e.ctrlKey) delta *= 10;
      if (delta) {
        this.inertialRadiusOffset += delta;
      }
    },
    object: this,
    type: 'wheel',
  };
  MoveToPlace = () => {
    if (this.#targetMovingfrom && this.#targetMovingTo) {
      this.#targetMovingfrom.LerpToRef(
        this.#targetMovingTo,
        this.#targetLerpPosition,
        this.#target,
      );
      this.#targetLerpPosition += 0.01;
      if (this.#targetLerpPosition > 1) {
        this.#targetMovingfrom = null;
        this.#targetMovingTo = null;
        this.#targetLerpPosition = 0;
        return true;
      }
    }
    return false;
  };
  moveto(destination: readonly [number, number, number]) {
    this.#targetMovingfrom = new ReadOnlyTerraVector3([
      this.#target[0],
      this.#target[1],
      this.#target[2],
    ]);
    // Clone destination to survive Wasm memory grow.
    this.#targetMovingTo = [...destination];
    this.#targetLerpPosition = 0;
    const moveWithTimeout = () => {
      if (!this.MoveToPlace()) {
        setTimeout(moveWithTimeout, 16);
      }
      this.calculateCameraPositionAndTarget();
    };

    setTimeout(moveWithTimeout, 16);
  }
  pointerDown = false;
  #cameraPointerDown: ListenerObj<'pointerdown'> = {
    cb: (e: PointerEvent) => {
      this.pointerDown = true;
      pointerDownButton = e.button;
      if (pointerDownButton !== 2) {
        engine.gpu?.renderPassScreen
          .pickPosition()
          .then((position) => {
            if (position) {
              this.#targetMovingfrom = new MutableTerraVector3([
                this.#target[0],
                this.#target[1],
                this.#target[2],
              ]);
              this.#targetMovingTo = position.position;
              this.#targetLerpPosition = 0;
            }
          })
          .catch((err) => engine.showError(err));
      }
      engine.addInputListener(this.#cameraMove);
      const onceUp: ListenerObj<'pointerup'> = {
        cb: () => {
          engine.removeInputListener(this.#cameraMove);
          engine.removeInputListener(onceLeave);
          this.pointerDown = false;
        },
        object: this,
        options: {
          once: true,
        },
        type: 'pointerup',
      };
      const onceLeave: ListenerObj<'pointerleave'> = {
        cb: () => {
          engine.removeInputListener(this.#cameraMove);
          engine.removeInputListener(onceUp);
          this.pointerDown = false;
        },
        object: this,
        options: {
          once: true,
        },
        type: 'pointerleave',
      };
      engine.addInputListener(onceLeave);
      engine.addInputListener(onceUp);
    },
    object: this,
    type: 'pointerdown',
  };
  deAttachCameraController() {
    engine.clearInputListeners(this);
    this.serialize();
  }
  attachCameraController() {
    engine.addInputListener(this.#cameraWheel);
    engine.addInputListener(this.#cameraPointerDown);
    engine.addInputListener({
      cb: (e) => {
        if (this.camera.gpu) {
          const gpu = this.camera.gpu;
          Atomics.store(gpu.mousePosition, 0, e.clientX * gpu.scale.x);
          Atomics.store(gpu.mousePosition, 1, e.clientY * gpu.scale.y);
          Atomics.notify(new Int32Array(gpu.mousePositionBuffer), 0);
        }
      },
      object: this,
      options: {
        force: true,
      },
      type: 'pointermove',
    } as ListenerObj<'pointermove'>);
  }
  #calculatePosition() {
    let sinb = Math.sin(this.#beta);
    if (sinb === 0) {
      sinb = 0.0001;
    }
    //this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);
    this.#computationVector[0] =
      this.#target[0] + this.#radius * Math.cos(this.#alpha) * sinb;
    this.#computationVector[1] =
      this.#target[1] + this.#radius * Math.cos(this.#beta);
    this.#computationVector[2] =
      this.#target[2] + this.#radius * Math.sin(this.#alpha) * sinb;
    return this.#computationVector;
  }
  calculateCameraPositionAndTarget() {
    if (!this.cameraControl) {
      throw new Error('no cameracontrol');
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
    const newPosition = this.#calculatePosition();
    scaledVelocity[0] =
      (newPosition[0] - this.camera.position[0]) / this.radius[0];
    scaledVelocity[1] =
      (newPosition[1] - this.camera.position[1]) / this.radius[1];
    scaledVelocity[2] =
      (newPosition[2] - this.camera.position[2]) / this.radius[2];

    // terraEngine.collider._initialVelocity = coordinator._scaledVelocity;

    //  terraEngine.collider._initialPosition = coordinator._scaledPosition;
    //let starttime=performance.now();
    engine.collideWithWorld(this, scaledPosition, scaledVelocity, newPosition, [
      newPosition[0] - this.camera.position[0],
      newPosition[1] - this.camera.position[1],
      newPosition[2] - this.camera.position[2],
    ]);

    //run the callback
    // if (!this.engine.collider.collidedMesh) {
    if (engine.collider.didCollide) {
      //this._position.copyFrom(position);
      if (
        this.camera.position[0] != engine.collider.finalPosition[0] ||
        this.camera.position[1] != engine.collider.finalPosition[1] ||
        this.camera.position[2] != engine.collider.finalPosition[2]
      ) {
        this.cameraControl?.updatePosition(
          engine.collider.finalPosition[0],
          engine.collider.finalPosition[1],
          engine.collider.finalPosition[2],
        );
      }
      this.#rebuildAnglesAndRadius();
    }
    this.#collisionTriggered = false;
    // Recompute because of constraints
    const calculatedPosition = this.#calculatePosition();
    this.cameraControl?.updatePosition(
      calculatedPosition[0],
      calculatedPosition[1],
      calculatedPosition[2],
    );

    this.#calculateDirection();
  }
  #calculateDirection() {
    const direction = [
      this.camera.position[0] - this.#target[0],
      this.camera.position[1] - this.#target[1],
      this.camera.position[2] - this.#target[2],
    ] as [number, number, number];
    //Normalize direction
    const zLength = Math.hypot(direction[0], direction[1], direction[2]);
    if (!(zLength === 0 || zLength === 1)) {
      //zAxis.normalizeFromLength(xLength);
      const scale = 1.0 / zLength;
      direction[0] *= scale;
      direction[1] *= scale;
      direction[2] *= scale;
    }
    this.cameraControl?.updateDirection(...direction);
  }
  #targetMovingfrom: ReadOnlyTerraVector3 | null = null;
  #targetMovingTo: readonly [number, number, number] | null = null;
  #targetLerpPosition = 0;
  checkInputs = (force_recalculate = false) => {
    if (this.#collisionTriggered) {
      return;
    }
    let updateView = force_recalculate;
    // Inertia
    if (
      this.#inertialAlphaOffset !== 0 ||
      this.#inertialBetaOffset !== 0 ||
      this.inertialRadiusOffset !== 0
    ) {
      this.MoveToPlace();

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
      this.#transformedDirection.set([
        this.#cameraTransformMatrix[0],
        this.#cameraTransformMatrix[1],
        this.#cameraTransformMatrix[2],
      ]);

      const scaleX = this.#inertialPanning[0];
      const scaleZ = this.#inertialPanning[2];
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
      this.#target[0] += this.#transformedDirection[0];
      this.#target[1] += this.#transformedDirection[1];
      this.#target[2] += this.#transformedDirection[2];
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

    if (updateView) {
      this.calculateCameraPositionAndTarget();
    }
  };
  // Rebuilds angles (alpha, beta) and radius from the give position and target
  #rebuildAnglesAndRadius(): void {
    // this._position.subtractToRef(this._getTargetPosition(), this._computationVector);
    this.#computationVector[0] = this.camera.position[0] - this.#target[0];
    this.#computationVector[1] = this.camera.position[1] - this.#target[1];
    this.#computationVector[2] = this.camera.position[2] - this.#target[2];

    // this.radius = this._computationVector.length();
    this.#radius = Math.sqrt(
      this.#computationVector[0] * this.#computationVector[0] +
        this.#computationVector[1] * this.#computationVector[1] +
        this.#computationVector[2] * this.#computationVector[2],
    );

    if (this.#radius === 0) {
      this.#radius = 0.0001; // Just to avoid division by zero
    }

    // Alpha
    if (this.#computationVector[0] === 0 && this.#computationVector[2] === 0) {
      this.#alpha = Math.PI / 2; // avoid division by zero when looking along up axis, and set to acos(0)
    } else {
      this.#alpha = Math.acos(
        this.#computationVector[0] /
          Math.sqrt(
            Math.pow(this.#computationVector[0], 2) +
              Math.pow(this.#computationVector[2], 2),
          ),
      );
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

    if (
      this.lowerRadiusLimit !== null &&
      this.#radius < this.lowerRadiusLimit
    ) {
      this.#radius = this.lowerRadiusLimit;
      this.inertialRadiusOffset = 0;
    }
    if (
      this.upperRadiusLimit !== null &&
      this.#radius > this.upperRadiusLimit
    ) {
      this.#radius = this.upperRadiusLimit;
      this.inertialRadiusOffset = 0;
    }
  }
}

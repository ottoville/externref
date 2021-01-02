import { Engine } from "./engine";
import { TerraCamera } from "./TerraCamera";
let pointerDownButton: number = 0;
const panningSensibility: number = 20;
const angularSensibilityX = 3000;
const angularSensibilityY = 3000;

const panningAxis = new Vector3(1, 0, 1)

export class ArcRotateCamera {

    #computationVector = new Float32Array(3);
    #previousPosition = new Float32Array(3);
    //position = new Float32Array(3);
    #newPosition = new Float32Array(3);
    #globalPosition = new Float32Array(3);

   #cameraTransformMatrix = Matrix.Zero()

   // #globalCurrentTarget = new Float32Array(3);

    #collisionVelocity = new Float32Array(3);
    #collisionRadius: [number, number, number] = [0.5, 0.5, 0.5];
    collisionTriggered = false;
    collisionVelocity = new Float32Array(3);

    inertia = 0.9;
    speed = 2.0;

    #transformedDirection = Vector3.Zero();
    /**
    * Defines the value of the inertia used during panning.
    * 0 would mean stop inertia and one would mean no decelleration at all.
    */
    #panningInertia = 0.9;

    inertialPanningX = 0;
    inertialPanningY = 0;
    /*
    * Current inertia value on the longitudinal axis.
    * The bigger this number the longer it will take for the camera to stop.
    */
    inertialAlphaOffset = 0;
    /**
    * Current inertia value on the latitudinal axis.
    * The bigger this number the longer it will take for the camera to stop.
    */
    inertialBetaOffset = 0;
    /**
    * Define the current direction the camera is moving to
    */
    #cameraDirection = new Vector3(0, 0, 0);
    /**
    * Define the current rotation the camera is rotating to
    */
    #cameraRotation = new Vector2(0, 0);
    /**
     * Define the current rotation of the camera
     */
    #rotation = new Vector3(0, 0, 0);
    /**
     * Define the current rotation of the camera as a quaternion to prevent Gimbal lock
     */
    #rotationQuaternion: Quaternion = Quaternion.Zero();
    constructor(public alpha: number, public beta: number, public radius:number, private engine: Engine, private camera:TerraCamera) {
        engine.canvas.addEventListener('pointerup', () => engine.canvas.removeEventListener('pointermove', this.#cameraMove));
        engine.canvas.addEventListener('pointerleave', () => engine.canvas.removeEventListener('pointermove', this.#cameraMove));
    }
    #cameraMove = (e: PointerEvent) => {
        e.preventDefault();
        if (panningSensibility !== 0 && pointerDownButton == 2) {
            this.inertialPanningX += -e.movementX / panningSensibility;
            this.inertialPanningY += e.movementY / panningSensibility;
        } else {
            this.inertialAlphaOffset -= e.movementX / angularSensibilityX;
            this.inertialBetaOffset -= e.movementY / angularSensibilityY;
        }
    }
   #cameraWheel= (e: WheelEvent) => {
        const delta = -e.deltaY / (3 * 40);
        if (delta) {
            this.inertialRadiusOffset += delta;
        }
    }
    #cameraPointerDown = (e: PointerEvent) => {
        pointerDownButton = e.button;
        this.engine.canvas.addEventListener('pointermove', this.#cameraMove);

    }

    attachControl(): void {
        this.engine.canvas.addEventListener('wheel', this.#cameraWheel);
        this.engine.canvas.addEventListener('pointerdown', this.#cameraPointerDown);
    }
    detachControl() {
        this.engine.canvas.removeEventListener('pointerdown', this.#cameraPointerDown);
        this.engine.canvas.removeEventListener('pointermove', this.#cameraMove);
        this.engine.canvas.removeEventListener('wheel', this.#cameraWheel);
    }
    calculateViewMatrix() {
        var cosa = Math.cos(this.alpha);
        var sina = Math.sin(this.alpha);
        var cosb = Math.cos(this.beta);
        var sinb = Math.sin(this.beta);
        if (sinb === 0) {
            sinb = 0.0001;
        }
        
        //this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);
        this.#computationVector[0] = this.radius * cosa * sinb;
        this.#computationVector[1] = this.radius * cosb;
        this.#computationVector[2] = this.radius * sina * sinb;

       // target.addToRef(this._computationVector, this._newPosition);
        this.#newPosition[0] = this.camera.target[0] + this.#computationVector[0];
        this.#newPosition[1] = this.camera.target[1] + this.#computationVector[1];
        this.#newPosition[2] = this.camera.target[2] + this.#computationVector[2];

        this.engine.collider._radius = this.#collisionRadius;

        //this._newPosition.subtractToRef(this._position, this._collisionVelocity);
        this.#collisionVelocity[0] = this.#newPosition[0] - this.camera.cameraPosition[0];
        this.#collisionVelocity[1] = this.#newPosition[1] - this.camera.cameraPosition[1];
        this.#collisionVelocity[2] = this.#newPosition[2] - this.camera.cameraPosition[2];

        this.collisionTriggered = true;

        // coordinator.getNewPosition(this._position, this._collisionVelocity, this._collider, 3, null, this._onCollisionPositionChange, this.uniqueId);

        // this._position.divideToRef(Vector3.FromArray(terraEngine.collider._radius), coordinator._scaledPosition);
        this.engine.collisionCoordinator.scaledPosition[0] = this.camera.cameraPosition[0] / this.engine.collider._radius[0];
        this.engine.collisionCoordinator.scaledPosition[1] = this.camera.cameraPosition[1] / this.engine.collider._radius[1];
        this.engine.collisionCoordinator.scaledPosition[2] = this.camera.cameraPosition[2] / this.engine.collider._radius[2];

       // this._collisionVelocity.divideToRef(Vector3.FromArray(terraEngine.collider._radius), coordinator._scaledVelocity);
        this.engine.collisionCoordinator.scaledVelocity[0] = this.#collisionVelocity[0] / this.engine.collider._radius[0];
        this.engine.collisionCoordinator.scaledVelocity[1] = this.#collisionVelocity[1] / this.engine.collider._radius[1];
        this.engine.collisionCoordinator.scaledVelocity[2] = this.#collisionVelocity[2] / this.engine.collider._radius[2];

        this.engine.collider.collidedMesh = null;
        this.engine.collider._retry = 0;

        // terraEngine.collider._initialVelocity = coordinator._scaledVelocity;

        //  terraEngine.collider._initialPosition = coordinator._scaledPosition;

        this.engine.collideWithWorld(this.engine.collisionCoordinator.scaledPosition, this.engine.collisionCoordinator.scaledVelocity, 3, this.engine.collisionCoordinator.finalPosition);



        //coordinator._finalPosition.multiplyInPlace(Vector3.FromArray(terraEngine.collider._radius));
        this.engine.collisionCoordinator.finalPosition[0] *= this.engine.collider._radius[0]
        this.engine.collisionCoordinator.finalPosition[1] *= this.engine.collider._radius[1]
        this.engine.collisionCoordinator.finalPosition[2] *= this.engine.collider._radius[2]

        //run the callback

        if (!this.engine.collider.collidedMesh) {

            //this._previousPosition.copyFrom(this._position);
            this.camera.cameraPosition[0] = this.#previousPosition[0]
            this.camera.cameraPosition[1] = this.#previousPosition[1]
            this.camera.cameraPosition[2] = this.#previousPosition[2]

        } else {

           // this.setPosition(coordinator._finalPosition);
           // if (this._position.equals(position)) {
            //    return;
            //}
            //this._position.copyFrom(position);

            if (this.camera.cameraPosition[0] != this.engine.collisionCoordinator.finalPosition[0] || this.camera.cameraPosition[1] != this.engine.collisionCoordinator.finalPosition[1] || this.camera.cameraPosition[2] != this.engine.collisionCoordinator.finalPosition[2]) {
                this.camera.cameraPosition[0] = this.engine.collisionCoordinator.finalPosition[0];
                this.camera.cameraPosition[1] = this.engine.collisionCoordinator.finalPosition[1];
                this.camera.cameraPosition[2] = this.engine.collisionCoordinator.finalPosition[2];
            }

            this.rebuildAnglesAndRadius();
        }

        // Recompute because of constraints
        var cosa = Math.cos(this.alpha);
        var sina = Math.sin(this.alpha);
        var cosb = Math.cos(this.beta);
        var sinb = Math.sin(this.beta);

        if (sinb === 0) {
            sinb = 0.0001;
        }

      //  this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);
        this.#computationVector[0] = this.radius * cosa * sinb
        this.#computationVector[1] = this.radius * cosb
        this.#computationVector[2] = this.radius * sina * sinb


       // target.addToRef(this._computationVector, this._newPosition);
        this.#newPosition[0] = this.camera.target[0] + this.#computationVector[0]
        this.#newPosition[1] = this.camera.target[1] + this.#computationVector[1]
        this.#newPosition[2] = this.camera.target[2] + this.#computationVector[2]


       // this._position.copyFrom(this._newPosition);

        this.camera.cameraPosition[0] = this.#newPosition[0];
        this.camera.cameraPosition[1] = this.#newPosition[1];
        this.camera.cameraPosition[2] = this.#newPosition[2];


        //this._computeViewMatrix(this._position, target, up);

        //this._globalPosition.copyFrom(this._position);
        this.#globalPosition[0] = this.camera.cameraPosition[0];
        this.#globalPosition[1] = this.camera.cameraPosition[1];
        this.#globalPosition[2] = this.camera.cameraPosition[2];


        //this._globalCurrentTarget.copyFrom(target);
     /*   this.#globalCurrentTarget[0] = this.camera.target[0];
        this.#globalCurrentTarget[1] = this.camera.target[1];
        this.#globalCurrentTarget[2] = this.camera.target[2];*/

        this.collisionTriggered = false;
        // }
    }
    
    checkInputs=() => {
        //if (async) collision inspection was triggered, don't update the camera's position - until the collision callback was called.

        if (this.collisionTriggered) {
            return;
        }

        //inputs.checkInputs();
        // Inertia
        if (this.inertialAlphaOffset !== 0 || this.inertialBetaOffset !== 0 || this.inertialRadiusOffset !== 0) {
            let inertialAlphaOffset = this.inertialAlphaOffset;
            if (this.beta <= 0) { inertialAlphaOffset *= -1; }
            this.alpha += inertialAlphaOffset;

            this.beta += this.inertialBetaOffset;

            this.radius -= this.inertialRadiusOffset;
            this.inertialAlphaOffset *= this.inertia;
            this.inertialBetaOffset *= this.inertia;
            this.inertialRadiusOffset *= this.inertia;
            if (Math.abs(this.inertialAlphaOffset) < Epsilon) {
                this.inertialAlphaOffset = 0;
            }
            if (Math.abs(this.inertialBetaOffset) < Epsilon) {
                this.inertialBetaOffset = 0;
            }
            if (Math.abs(this.inertialRadiusOffset) < this.speed * Epsilon) {
                this.inertialRadiusOffset = 0;
            }
        }

        // Panning inertia
        if (this.inertialPanningX !== 0 || this.inertialPanningY !== 0) {
            Matrix.FromArray(this.camera.viewArr).invertToRef(this.#cameraTransformMatrix);
            this.#transformedDirection.set(this.#cameraTransformMatrix.m[0], this.#cameraTransformMatrix.m[1], this.#cameraTransformMatrix.m[2]);
            // panning on X Axis
            this.#transformedDirection.x *= panningAxis.x * this.inertialPanningX;
            this.#transformedDirection.y *= panningAxis.x * this.inertialPanningX;
            this.#transformedDirection.z *= panningAxis.x * this.inertialPanningX;

            // panning on Y axis
            this.#transformedDirection.y += panningAxis.y * this.inertialPanningY;

            // panning on Z axis
            this.#transformedDirection.x -= Math.cos(this.alpha) * panningAxis.z * this.inertialPanningY;
            this.#transformedDirection.z -= Math.sin(this.alpha) *  panningAxis.z * this.inertialPanningY;


            //this._target.addInPlace(this._transformedDirection);

            this.camera.target[0] += this.#transformedDirection.x;
            this.camera.target[1] += this.#transformedDirection.y;
            this.camera.target[2] += this.#transformedDirection.z;

            this.inertialPanningX *= this.#panningInertia;
            this.inertialPanningY *= this.#panningInertia;

            if (Math.abs(this.inertialPanningX) < this.speed * Epsilon) {
                this.inertialPanningX = 0;
            }
            if (Math.abs(this.inertialPanningY) < this.speed * Epsilon) {
                this.inertialPanningY = 0;
            }
        }

        // Limits
        this.checkLimits();

       // const needToMove = this._decideIfNeedsToMove();
        const needToMove = Math.abs(this.#cameraDirection.x) > 0 || Math.abs(this.#cameraDirection.y) > 0 || Math.abs(this.#cameraDirection.z) > 0;
        const needToRotate = Math.abs(this.#cameraRotation.x) > 0 || Math.abs(this.#cameraRotation.y) > 0;

        // Move
        if (needToMove) {
          //  this.position.addInPlace(this.#cameraDirection);
            this.camera.cameraPosition[0] += this.#cameraDirection.x;
            this.camera.cameraPosition[1] += this.#cameraDirection.y;
            this.camera.cameraPosition[2] += this.#cameraDirection.z;
        }

        // Rotate
        if (needToRotate) {
            console.log('needToRotate');
            this.#rotation.x += this.#cameraRotation.x;
            this.#rotation.y += this.#cameraRotation.y;

            //rotate, if quaternion is set and rotation was used
            if (this.#rotationQuaternion) {
                var len = this.#rotation.lengthSquared();
                if (len) {
                    Quaternion.RotationYawPitchRollToRef(this.#rotation.y, this.#rotation.x, this.#rotation.z, this.#rotationQuaternion);
                }
            }
        }

        // Inertia
        if (needToMove) {
            console.log('needToMove');
            if (Math.abs(this.#cameraDirection.x) < this.speed * Epsilon) {
                this.#cameraDirection.x = 0;
            }

            if (Math.abs(this.#cameraDirection.y) < this.speed * Epsilon) {
                this.#cameraDirection.y = 0;
            }

            if (Math.abs(this.#cameraDirection.z) < this.speed * Epsilon) {
                this.#cameraDirection.z = 0;
            }

            this.#cameraDirection.scaleInPlace(this.inertia);
        }
        if (needToRotate) {
            if (Math.abs(this.#cameraRotation.x) < this.speed * Epsilon) {
                this.#cameraRotation.x = 0;
            }

            if (Math.abs(this.#cameraRotation.y) < this.speed * Epsilon) {
                this.#cameraRotation.y = 0;
            }
            this.#cameraRotation.scaleInPlace(this.inertia);
        }
    }
 // Rebuilds angles (alpha, beta) and radius from the give position and target
    public rebuildAnglesAndRadius(): void {
       // this._position.subtractToRef(this._getTargetPosition(), this._computationVector);
        this.#computationVector[0] = this.camera.cameraPosition[0] - this.camera.target[0];
        this.#computationVector[1] = this.camera.cameraPosition[1] - this.camera.target[1];
        this.#computationVector[2] = this.camera.cameraPosition[2] - this.camera.target[2];

       // this.radius = this._computationVector.length();
        this.radius=Math.sqrt(this.#computationVector[0] * this.#computationVector[0] + this.#computationVector[1] * this.#computationVector[1] + this.#computationVector[2] * this.#computationVector[2])

        if (this.radius === 0) {
            this.radius = 0.0001; // Just to avoid division by zero
        }

        // Alpha
        if (this.#computationVector[0] === 0 && this.#computationVector[2] === 0) {
            this.alpha = Math.PI / 2; // avoid division by zero when looking along up axis, and set to acos(0)
        } else {
            this.alpha = Math.acos(this.#computationVector[0] / Math.sqrt(Math.pow(this.#computationVector[0], 2) + Math.pow(this.#computationVector[2], 2)));
        }

        if (this.#computationVector[2] < 0) {
            this.alpha = 2 * Math.PI - this.alpha;
        }

        // Beta
        this.beta = Math.acos(this.#computationVector[1] / this.radius);

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
            if (this.beta < this.lowerBetaLimit) {
                this.beta = this.lowerBetaLimit;
            }
        }

        if (!(this.upperBetaLimit === null || this.upperBetaLimit === undefined)) {
            if (this.beta > this.upperBetaLimit) {
                this.beta = this.upperBetaLimit;
            }
        }

        if (this.lowerAlphaLimit !== null && this.alpha < this.lowerAlphaLimit) {
            this.alpha = this.lowerAlphaLimit;
        }
        if (this.upperAlphaLimit !== null && this.alpha > this.upperAlphaLimit) {
            this.alpha = this.upperAlphaLimit;
        }

        if (this.lowerRadiusLimit !== null && this.radius < this.lowerRadiusLimit) {
            this.radius = this.lowerRadiusLimit;
            this.inertialRadiusOffset = 0;
        }
        if (this.upperRadiusLimit !== null && this.radius > this.upperRadiusLimit) {
            this.radius = this.upperRadiusLimit;
            this.inertialRadiusOffset = 0;
        }
    }
}
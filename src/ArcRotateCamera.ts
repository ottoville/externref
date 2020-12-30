/*import { Engine } from "./engine";

class ArcRotateCamera {

    #scaledPosition = new Float32Array(3);
    #scaledVelocity = new Float32Array(3);
    #finalPosition = new Float32Array(3);

    #computationVector = new Float32Array(3);
    #previousPosition = new Float32Array(3);
    #position = new Float32Array(3);
    #newPosition = new Float32Array(3);
    #globalPosition = new Float32Array(3);

    currentTarget = new Float32Array(3);
    #globalCurrentTarget = new Float32Array(3);

    #collisionVelocity = new Float32Array(3);
    #collisionRadius: [number, number, number] = [0.5, 0.5, 0.5];
    collisionTriggered = false;
    collisionVelocity = new Float32Array(3);
    constructor(private alpha: number, private beta: number, private radius:number, private target:Float32Array, private engine: Engine) {

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
        this.#newPosition[0] = this.target[0] + this.#computationVector[0];
        this.#newPosition[1] = this.target[1] + this.#computationVector[1];
        this.#newPosition[2] = this.target[2] + this.#computationVector[2];

        this.engine.collider._radius = this.#collisionRadius;

        //this._newPosition.subtractToRef(this._position, this._collisionVelocity);
        this.#collisionVelocity[0] = this.#newPosition[0] - this.#position[0];
        this.#collisionVelocity[1] = this.#newPosition[1] - this.#position[1];
        this.#collisionVelocity[2] = this.#newPosition[2] - this.#position[2];

        this.collisionTriggered = true;

        // coordinator.getNewPosition(this._position, this._collisionVelocity, this._collider, 3, null, this._onCollisionPositionChange, this.uniqueId);

       // this._position.divideToRef(Vector3.FromArray(terraEngine.collider._radius), coordinator._scaledPosition);
        this.#scaledPosition[0] = this.#position[0] / this.engine.collider._radius[0];
        this.#scaledPosition[1] = this.#position[1] / this.engine.collider._radius[1];
        this.#scaledPosition[2] = this.#position[2] / this.engine.collider._radius[2];

       // this._collisionVelocity.divideToRef(Vector3.FromArray(terraEngine.collider._radius), coordinator._scaledVelocity);
        this.#scaledVelocity[0] = this.#collisionVelocity[0] / this.engine.collider._radius[0];
        this.#scaledVelocity[1] = this.#collisionVelocity[1] / this.engine.collider._radius[1];
        this.#scaledVelocity[2] = this.#collisionVelocity[2] / this.engine.collider._radius[2];

        this.engine.collider.collidedMesh = null;
        this.engine.collider._retry = 0;

        // terraEngine.collider._initialVelocity = coordinator._scaledVelocity;

        //  terraEngine.collider._initialPosition = coordinator._scaledPosition;

        this.engine.collideWithWorld(this.#scaledPosition, this.#scaledVelocity, 3, this.#finalPosition);



        //coordinator._finalPosition.multiplyInPlace(Vector3.FromArray(terraEngine.collider._radius));
        this.#finalPosition[0] *= this.engine.collider._radius[0]
        this.#finalPosition[1] *= this.engine.collider._radius[1]
        this.#finalPosition[2] *= this.engine.collider._radius[2]

        //run the callback

        if (!this.engine.collider.collidedMesh) {

            //this._previousPosition.copyFrom(this._position);
            this.#position[0] = this.#previousPosition[0]
            this.#position[1] = this.#previousPosition[1]
            this.#position[2] = this.#previousPosition[2]

        } else {

           // this.setPosition(coordinator._finalPosition);
           // if (this._position.equals(position)) {
            //    return;
            //}
            //this._position.copyFrom(position);

            if (this.#position[0] != this.#finalPosition[0] || this.#position[1] != this.#finalPosition[1] || this.#position[2] != this.#finalPosition[2]) {
                this.#position[0] = this.#finalPosition[0];
                this.#position[1] = this.#finalPosition[1];
                this.#position[2] = this.#finalPosition[2];
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

        const target = this.target

      //  this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);
        this.#computationVector[0] = this.radius * cosa * sinb
        this.#computationVector[1] = this.radius * cosb
        this.#computationVector[2] = this.radius * sina * sinb


       // target.addToRef(this._computationVector, this._newPosition);
        this.#newPosition[0] = this.target[0] + this.#computationVector[0]
        this.#newPosition[1] = this.target[1] + this.#computationVector[1]
        this.#newPosition[2] = this.target[2] + this.#computationVector[2]


       // this._position.copyFrom(this._newPosition);

        this.#position[0] = this.#newPosition[0];
        this.#position[1] = this.#newPosition[1];
        this.#position[2] = this.#newPosition[2];


        //this._computeViewMatrix(this._position, target, up);

        //this._globalPosition.copyFrom(this._position);
        this.#globalPosition[0] = this.#position[0];
        this.#globalPosition[1] = this.#position[1];
        this.#globalPosition[2] = this.#position[2];


        //this._globalCurrentTarget.copyFrom(target);
        this.#globalCurrentTarget[0] = this.target[0];
        this.#globalCurrentTarget[1] = this.target[1];
        this.#globalCurrentTarget[2] = this.target[2];

        this.collisionTriggered = false;
        // }

        this.currentTarget = target;
    }
 // Rebuilds angles (alpha, beta) and radius from the give position and target
    public rebuildAnglesAndRadius(): void {
       // this._position.subtractToRef(this._getTargetPosition(), this._computationVector);
        this.#computationVector[0] = this.#position[0] - this.target[0];
        this.#computationVector[1] = this.#position[1] - this.target[0];
        this.#computationVector[2] = this.#position[2] - this.target[0];

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
}*/
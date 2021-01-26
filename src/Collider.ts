// Implementation of the "Improved Collision detection and Response" algorithm proposed by Kasper Fauerby
// https://www.peroxide.dk/papers/collision/collision.pdf

import { TerraMatrix, TerraVector3, Triangle } from "./Math";
import type { Engine, Vector3 } from "./engine";


function Dot(left: [number, number, number] | Float32Array | Vector3, right: [number, number, number] | Float32Array | Vector3): number {
    return (left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);
}
function CrossToRef(left: [number, number, number], right: [number, number, number], result: [number, number, number]): void {
    result[0] = left[1] * right[2] - left[2] * right[1];
    result[1] = left[2] * right[0] - left[0] * right[2];
    result[2] = left[0] * right[1] - left[1] * right[0];
}
var intersectBoxAASphere = (boxMin: TerraVector3, boxMax: TerraVector3, sphereCenter: [number, number, number], sphereRadius: number): boolean => {
    if (boxMin[0] > sphereCenter[0] + sphereRadius) {
        return false;
    }

    if (sphereCenter[0] - sphereRadius > boxMax[0]) {
        return false;
    }

    if (boxMin[1] > sphereCenter[1] + sphereRadius) {
        return false;
    }

    if (sphereCenter[1] - sphereRadius > boxMax[1]) {
        return false;
    }

    if (boxMin[2] > sphereCenter[2] + sphereRadius) {
        return false;
    }

    if (sphereCenter[2] - sphereRadius > boxMax[2]) {
        return false;
    }
    return true;
};


export class Collider {
    //@ts-ignore
    #velocitySquaredLength!: number;
    getLowestRoot (a: number, b: number, c: number, maxR: number) {

        var determinant = b * b - 4.0 * a * c;
        if (determinant < 0) {
            return 0;
        }

        var sqrtD = Math.sqrt(determinant);
        var r1 = (-b - sqrtD) / (2.0 * a);
        var r2 = (-b + sqrtD) / (2.0 * a);

        if (r1 > r2) {
            var temp = r2;
            r2 = r1;
            r1 = temp;
        }

        if (r1 > 0 && r1 < maxR) {
            return r1;
        }

        if (r2 > 0 && r2 < maxR) {
            return r2;
        }

        return 0;
    };
    /** Define if a collision was found */
    public collisionFound: boolean = false;

    /**
     * Define last intersection point in local space
     */
    public intersectionPoint: [x: number, y: number, z: number] = [0, 0, 0];

    /**
     * Define last collided mesh
     */
    public collidedMesh: Nullable<any>;

    #collisionPoint: [x: number, y: number, z: number] = [0, 0, 0];
    #planeIntersectionPoint: [x: number, y: number, z: number] = [0, 0, 0];
    planeIntersectionPoint = this.engine.callocVector3();
    #tempVector: [x: number, y: number, z: number] = [0, 0, 0];
    #tempVector2: [x: number, y: number, z: number] = [0, 0, 0];
    #tempVector3: [x: number, y: number, z: number] = [0, 0, 0];
    #tempVector4: [x: number, y: number, z: number] = [0, 0, 0];
    private _edge: [x: number, y: number, z: number] = [0, 0, 0];
    private _baseToVertex: [x: number, y: number, z: number] = [0, 0, 0];
    private _destinationPoint: [x: number, y: number, z: number] = [0, 0, 0];
    private _slidePlaneNormal: [x: number, y: number, z: number] = [0, 0, 0];
    private _displacementVector: [x: number, y: number, z: number] = [0, 0, 0];
    radius: { 0: number; 1: number; 2: number; };

    collisionsScalingMatrix = new TerraMatrix([
        1.0 / this._radius[0],   0.0,                   0.0,                    0.0,
        0.0,                     1.0 / this._radius[1], 0.0,                    0.0,
        0.0,                     0.0,                   1.0 / this._radius[2],  0.0,
        0.0, 0.0, 0.0, 1.0]);
    pipeline = this.engine.gpu.createComputePipeline('collider.comp', this.engine.gpu.device.createPipelineLayout({
        bindGroupLayouts: [this.engine.gpu.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    type: "readonly-storage-buffer"
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    type: "storage-buffer"
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    type: "storage-buffer"
                }
            ]
        })]
    }));
    constructor(private engine:Engine, private _radius: [x: number, y: number, z: number] = [1, 1, 1]) {


        const me = this;
        this.radius = {
            get 0() {
                return _radius[0]
            },
            get 1() {
                return _radius[1]
            },
            get 2() {
                return _radius[2]
            },
            set 0(v: number) {
                _radius[0] = v;
                me.collisionsScalingMatrix[0] = 1.0 / v;
            },
            set 1(v: number) {
                _radius[1] = v;
                me.collisionsScalingMatrix[5] = 1.0 / v;
            },
            set 2(v: number) {
                _radius[2] = v;
                me.collisionsScalingMatrix[10] = 1.0 / v;

            }
        }
    }


    /** @hidden */
    public _retry = 0;
    #velocity!:Vector3;
    #basePoint = new TerraVector3();
    #epsilon: number = 0;
    /** @hidden */
    public _velocityWorldLength: number = 0;
    /** @hidden */
    public _basePointWorld: [number, number, number] = [0, 0, 0];
    #velocityWorld = new TerraVector3()
    #normalizedVelocity: [x: number, y: number, z: number] = [0, 0, 0];
    /** @hidden */
    // public _initialVelocity: [x: number, y: number, z: number] = [0, 0, 0];
    /** @hidden */
    // public _initialPosition: Vector3 = Vector3.Zero();

    #nearestDistanceSquared: number = 9999999;

    private _collisionMask = -1;

    public get collisionMask(): number {
        return this._collisionMask;
    }

    public set collisionMask(mask: number) {
        this._collisionMask = !isNaN(mask) ? mask : -1;
    }

    /**
     * Gets the plane normal used to compute the sliding response (in local space)
     */
    public get slidePlaneNormal(): [number, number, number] {
        return this._slidePlaneNormal;
    }
    // Methods
    /** @hidden */
    public _initialize(source: Vector3, dir: Vector3, e: number): void {
        this.#velocity = dir;
        this.#velocitySquaredLength = this.#velocity[0] * this.#velocity[0] + this.#velocity[1] * this.#velocity[1] + this.#velocity[2] * this.#velocity[2];
       /* this.#velocity[0] = dir[0];
        this.#velocity[1] = dir[1];
        this.#velocity[2] = dir[2];*/

        // Vector3.NormalizeToRef(dir, this._normalizedVelocity);

        var len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
        if (len === 0 || len === 1.0) {
            this.#normalizedVelocity[0] = dir[0];
            this.#normalizedVelocity[1] = dir[1];
            this.#normalizedVelocity[2] = dir[2];
        } else {
            const scale = 1.0 / len;
            this.#normalizedVelocity[0] = dir[0] * scale
            this.#normalizedVelocity[1] = dir[1] * scale
            this.#normalizedVelocity[2] = dir[2] * scale
        }

        this.#basePoint[0] = source[0];
        this.#basePoint[1] = source[1];
        this.#basePoint[2] = source[2];


        this._basePointWorld[0] = source[0] * this._radius[0];
        this._basePointWorld[1] = source[1] * this._radius[1];
        this._basePointWorld[2] = source[2] * this._radius[2];

        this.#velocityWorld[0] = dir[0] * this._radius[0];
        this.#velocityWorld[1] = dir[1] * this._radius[1];
        this.#velocityWorld[2] = dir[2] * this._radius[2];
        this._velocityWorldLength = Math.sqrt(this.#velocityWorld[0] * this.#velocityWorld[0] + this.#velocityWorld[1] * this.#velocityWorld[1] + this.#velocityWorld[2] * this.#velocityWorld[2]);

        this.#epsilon = e;
        this.collisionFound = false;
    }

    /** @hidden */
    public _checkPointInTriangle(point: [x: number, y: number, z: number], triangle: Triangle): boolean {

        //TODO: Use simd
        this.#tempVector[0] = triangle.vectors[2][0] - point[0]
        this.#tempVector[1] = triangle.vectors[2][1] - point[1]
        this.#tempVector[2] = triangle.vectors[2][2] - point[2]

        this.#tempVector2[0] = triangle.vectors[1][0] - point[0]
        this.#tempVector2[1] = triangle.vectors[1][1] - point[1]
        this.#tempVector2[2] = triangle.vectors[1][2] - point[2]


        // pa.subtractToRef(point, this._tempVector);
        // pb.subtractToRef(point, this._tempVector2);

        CrossToRef(this.#tempVector, this.#tempVector2, this.#tempVector4);
        var d = Dot(this.#tempVector4, triangle.planeCollider);
        if (d < 0) {
            return false;
        }

        this.#tempVector3[0] = triangle.vectors[0][0] - point[0]
        this.#tempVector3[1] = triangle.vectors[0][1] - point[1]
        this.#tempVector3[2] = triangle.vectors[0][2] - point[2]

        //pc.subtractToRef(point, this._tempVector3);
        CrossToRef(this.#tempVector2, this.#tempVector3, this.#tempVector4);
        d = Dot(this.#tempVector4, triangle.planeCollider);
        if (d < 0) {
            return false;
        }

        CrossToRef(this.#tempVector3, this.#tempVector, this.#tempVector4);
        d = Dot(this.#tempVector4, triangle.planeCollider);
        return d >= 0;
    }

    /** @hidden */
    public _canDoCollision(/*sphereCenter: Vector3, sphereRadius: number, */vecMin: TerraVector3, vecMax: TerraVector3): boolean {
        //  var distance = Vector3.Distance(Vector3.FromArray(this._basePointWorld), sphereCenter);

        var max = Math.max(this._radius[0], this._radius[1], this._radius[2]);

        /*   if (distance > this._velocityWorldLength + max + sphereRadius) {
               return false;
           }*/

        if (!intersectBoxAASphere(vecMin, vecMax, this._basePointWorld, this._velocityWorldLength + max)) {
            return false;
        }

        return true;
    }
    //#points: [TerraVector3, TerraVector3, TerraVector3] = [new TerraVector3(), new TerraVector3(), new TerraVector3()];
    /** @hidden */
    public _testTriangle(triangle: Triangle): void {
        var dot = Dot(triangle.planeCollider, this.#normalizedVelocity);
        if (dot > 0) {
            return
        }

        var signedDistToTrianglePlane = Dot(this.#basePoint, triangle.planeCollider) + triangle.planeCollider[3]; //trianglePlane.signedDistanceTo(this._basePoint);
        var normalDotVelocity = Dot(triangle.planeCollider, this.#velocity);

       // let t0=0;
        // this._collisionPoint.copyFromFloats(0, 0, 0);
        this.#collisionPoint[0] = 0;
        this.#collisionPoint[1] = 0;
        this.#collisionPoint[2] = 0;
        var found = false;
        var t = 1.0;
        if (normalDotVelocity == 0) {
            if (Math.abs(signedDistToTrianglePlane) >= 1.0) {
                return;
            }
        }
        else {
            let t0 = (-1.0 - signedDistToTrianglePlane) / normalDotVelocity;
            var t1 = (1.0 - signedDistToTrianglePlane) / normalDotVelocity;

            if (t0 > t1) {
                var temp = t1;
                t1 = t0;
                t0 = temp;
            }

            if (t0 > 1.0 || t1 < 0.0) {
                return;
            }

            if (t0 < 0) {
                t0 = 0;
            }
            //TODO: Use simd
            this.#planeIntersectionPoint[0] = this.#basePoint[0] - triangle.planeCollider[0] + this.#velocity[0] * t0;
            this.#planeIntersectionPoint[1] = this.#basePoint[1] - triangle.planeCollider[1] + this.#velocity[1] * t0;
            this.#planeIntersectionPoint[2] = this.#basePoint[2] - triangle.planeCollider[2] + this.#velocity[2] * t0;

            //this._basePoint.subtractToRef(trianglePlane.normal, this._planeIntersectionPoint);
            // this._velocity.scaleToRef(t0, this._tempVector);
            //this._planeIntersectionPoint.addInPlace(this._tempVector);
            if (this._checkPointInTriangle(this.#planeIntersectionPoint, triangle)) {
                found = true;
                t = t0;
                this.#collisionPoint[0] = this.#planeIntersectionPoint[0];
                this.#collisionPoint[1] = this.#planeIntersectionPoint[1];
                this.#collisionPoint[2] = this.#planeIntersectionPoint[2];
                // this._collisionPoint.copyFrom(this._planeIntersectionPoint);
            }
        }

        if (!found) {
            // var velocitySquaredLength = this._velocity.lengthSquared();
           // var velocitySquaredLength = this.#velocity[0] * this.#velocity[0] + this.#velocity[1] * this.#velocity[1] + this.#velocity[2] * this.#velocity[2];

            //var a = this.#velocitySquaredLength;
            

            let lowestRoot: number;
            let b: number;
            let c: number;

            /* this.#points[0] = p2a;
             this.#points[1] = p3a;
             this.#points[2] = p1a;*/
            let i = 0;
            while (i < 3) {
                // for (let i = 0; i < 3; i++) {
                const p = triangle.vectors[i];
                this.#tempVector[0] = this.#basePoint[0] - p[0];
                this.#tempVector[1] = this.#basePoint[1] - p[1];
                this.#tempVector[2] = this.#basePoint[2] - p[2];
                b = 2.0 * (Dot(this.#velocity, this.#tempVector));
                c = (this.#tempVector[0] * this.#tempVector[0] + this.#tempVector[1] * this.#tempVector[1] + this.#tempVector[2] * this.#tempVector[2]) - 1.0;
                lowestRoot = this.getLowestRoot(this.#velocitySquaredLength, b, c, t);
                if (lowestRoot) {
                    t = lowestRoot;
                    found = true;
                    this.#collisionPoint[0] = p[0]
                    this.#collisionPoint[1] = p[1]
                    this.#collisionPoint[2] = p[2]
                }
                i++;
            }
            if (found)
                debugger
            var a = this.#velocitySquaredLength;
            i = 2;
            while (i > 0) {
                const p = triangle.vectors[i]
                const p2 = triangle.vectors[i - 1] || triangle.vectors[2];
                this._edge[0] = p2[0] - p[0];
                this._edge[1] = p2[1] - p[1];
                this._edge[2] = p2[2] - p[2];

                this._baseToVertex[0] = p[0] - this.#basePoint[0];
                this._baseToVertex[1] = p[1] - this.#basePoint[1];
                this._baseToVertex[2] = p[2] - this.#basePoint[2];

                //var edgeSquaredLength = this._edge.lengthSquared();
                var edgeSquaredLength = this._edge[0] * this._edge[0] + this._edge[1] * this._edge[1] + this._edge[2] * this._edge[2]
                var edgeDotVelocity = Dot(this._edge, this.#velocity);
                var edgeDotBaseToVertex = Dot(this._edge, this._baseToVertex);

                a = edgeSquaredLength * (-this.#velocitySquaredLength) + edgeDotVelocity * edgeDotVelocity;
                b = edgeSquaredLength * (2.0 * Dot(this.#velocity, this._baseToVertex)) - 2.0 * edgeDotVelocity * edgeDotBaseToVertex;
                c = edgeSquaredLength * (1.0 - (this._baseToVertex[0] * this._baseToVertex[0] + this._baseToVertex[1] * this._baseToVertex[1] + this._baseToVertex[2] * this._baseToVertex[2])) + edgeDotBaseToVertex * edgeDotBaseToVertex;

                lowestRoot = this.getLowestRoot(a, b, c, t);
                if (lowestRoot) {
                    var f = (edgeDotVelocity * lowestRoot - edgeDotBaseToVertex) / edgeSquaredLength;
                    if (f >= 0.0 && f <= 1.0) {
                        t = lowestRoot;
                        found = true;
                        // this._edge.scaleInPlace(f);
                        this._edge[0] *= f;
                        this._edge[1] *= f;
                        this._edge[2] *= f;
                        this.#collisionPoint[0] = p[0] + this._edge[0];
                        this.#collisionPoint[1] = p[1] + this._edge[1];
                        this.#collisionPoint[2] = p[2] + this._edge[2];
                    }
                }
                i--;
            }
        }

        if (found) {
            var distToCollisionSquared = t * this.#velocitySquaredLength;
            //var distToCollisionSquared = t * (this.#velocity[0] * this.#velocity[0] + this.#velocity[1] * this.#velocity[1] + this.#velocity[2] * this.#velocity[2]);

            if (!this.collisionFound || distToCollisionSquared < this.#nearestDistanceSquared) {

                this.intersectionPoint[0] = this.#collisionPoint[0];
                this.intersectionPoint[1] = this.#collisionPoint[1];
                this.intersectionPoint[2] = this.#collisionPoint[2];

                this.#nearestDistanceSquared = distToCollisionSquared;
                this.collisionFound = true;
                this.collidedMesh = "hostMesh";
            }
        }
    }

    /** @hidden */
    public _getResponse(pos: Vector3, vel: Vector3): void {
        this._destinationPoint[0] = pos[0] + vel[0];
        this._destinationPoint[1] = pos[1] + vel[1];
        this._destinationPoint[2] = pos[2] + vel[2];
        let scale = this.#nearestDistanceSquared / (vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
        vel[0] *= scale;
        vel[1] *= scale;
        vel[2] *= scale;

        pos[0] = this.#basePoint[0] + vel[0];
        pos[1] = this.#basePoint[1] + vel[1];
        pos[2] = this.#basePoint[2] + vel[2];

        this._slidePlaneNormal[0] = pos[0] - this.intersectionPoint[0];
        this._slidePlaneNormal[1] = pos[1] - this.intersectionPoint[1];
        this._slidePlaneNormal[2] = pos[2] - this.intersectionPoint[2];

        const length = Math.sqrt(this._slidePlaneNormal[0] * this._slidePlaneNormal[0] + this._slidePlaneNormal[1] * this._slidePlaneNormal[1] + this._slidePlaneNormal[2] * this._slidePlaneNormal[2]);
        if (!(length === 0 || length === 1.0)) {
            const norm = 1 / length;
            this._slidePlaneNormal[0] *= norm;
            this._slidePlaneNormal[1] *= norm;
            this._slidePlaneNormal[2] *= norm;
        }

        // this._slidePlaneNormal.normalize();

        // this._slidePlaneNormal.scaleToRef(this._epsilon, this._displacementVector);
        this._displacementVector[0] = this._slidePlaneNormal[0] * this.#epsilon;
        this._displacementVector[1] = this._slidePlaneNormal[1] * this.#epsilon;
        this._displacementVector[2] = this._slidePlaneNormal[2] * this.#epsilon;

        // pos.addInPlace(this._displacementVector);
        pos[0] += this._displacementVector[0];
        pos[1] += this._displacementVector[1];
        pos[2] += this._displacementVector[2];
        //this.intersectionPoint.addInPlace(this._displacementVector);
        this.intersectionPoint[0] += this._displacementVector[0];
        this.intersectionPoint[1] += this._displacementVector[1];
        this.intersectionPoint[2] += this._displacementVector[2];

        var d = -(this._slidePlaneNormal[0] * this.intersectionPoint[0] + this._slidePlaneNormal[1] * this.intersectionPoint[1] + this._slidePlaneNormal[2] * this.intersectionPoint[2]);
        scale = Dot(this._destinationPoint, this._slidePlaneNormal) + d;



        this._slidePlaneNormal[0] *= scale;
        this._slidePlaneNormal[1] *= scale;
        this._slidePlaneNormal[2] *= scale;

        //this._destinationPoint.subtractInPlace(this._slidePlaneNormal);
        this._destinationPoint[0] -= this._slidePlaneNormal[0];
        this._destinationPoint[1] -= this._slidePlaneNormal[1];
        this._destinationPoint[2] -= this._slidePlaneNormal[2];
        //this._destinationPoint.subtractToRef(this.intersectionPoint, vel);
        vel[0] = this._destinationPoint[0] - this.intersectionPoint[0];
        vel[1] = this._destinationPoint[1] - this.intersectionPoint[1];
        vel[2] = this._destinationPoint[2] - this.intersectionPoint[2];
    }
}

import { Nullable, IndicesArray } from "../types";
import { Vector3 } from "../Maths/math.vector";
import { AbstractMesh } from "../Meshes/abstractMesh";
import { Plane } from '../Maths/math.plane';

    // Implementation of the "Improved Collision detection and Response" algorithm proposed by Kasper Fauerby
    // https://www.peroxide.dk/papers/collision/collision.pdf


function Dot(left: [number, number, number], right: [number, number, number]): number {
    return (left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);
  }
function CrossToRef(left: [number, number, number], right: [number, number, number], result: [number, number, number]): void {
    result[0]= left[1] * right[2] - left[2] * right[1];
    result[1] = left[2] * right[0] - left[0] * right[2];
    result[2] = left[0] * right[1] - left[1] * right[0];
}
var intersectBoxAASphere = (boxMin: Vector3, boxMax: Vector3, sphereCenter: Vector3, sphereRadius: number): boolean => {
    if (boxMin.x > sphereCenter.x + sphereRadius) {
        return false;
    }

    if (sphereCenter.x - sphereRadius > boxMax.x) {
        return false;
    }

    if (boxMin.y > sphereCenter.y + sphereRadius) {
        return false;
    }

    if (sphereCenter.y - sphereRadius > boxMax.y) {
        return false;
    }

    if (boxMin.z > sphereCenter.z + sphereRadius) {
        return false;
    }

    if (sphereCenter.z - sphereRadius > boxMax.z) {
        return false;
    }

    return true;
};

var getLowestRoot: (a: number, b: number, c: number, maxR: number) => { root: number, found: boolean } =
    (function() {
        var result = { root: 0, found: false };
        return function(a: number, b: number, c: number, maxR: number) {
            result.root = 0; result.found = false;
            var determinant = b * b - 4.0 * a * c;
            if (determinant < 0) {
                return result;
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
                result.root = r1;
                result.found = true;
                return result;
            }

            if (r2 > 0 && r2 < maxR) {
                result.root = r2;
                result.found = true;
                return result;
            }

            return result;
        };
    }
    )();

/** @hidden */
export class Collider {
    /** Define if a collision was found */
    public collisionFound: boolean;

    /**
     * Define last intersection point in local space
     */
    public intersectionPoint: Vector3;

    /**
     * Define last collided mesh
     */
    public collidedMesh: Nullable<any>;

    private _collisionPoint = Vector3.Zero();
    private _planeIntersectionPoint: [x:number,y:number,z:number] = [0,0,0];
    private _tempVector: [x: number, y: number, z: number] = [0, 0, 0];
    private _tempVector2: [x: number, y: number, z: number] = [0, 0, 0];
    private _tempVector3: [x: number, y: number, z: number] = [0, 0, 0];
    private _tempVector4: [x: number, y: number, z: number] = [0, 0, 0];
    private _edge = Vector3.Zero();
    private _baseToVertex = Vector3.Zero();
    private _destinationPoint = Vector3.Zero();
    private _slidePlaneNormal = Vector3.Zero();
    private _displacementVector = Vector3.Zero();

    /** @hidden */
    public _radius = Vector3.One();
    /** @hidden */
    public _retry = 0;
    private _velocity: Vector3;
    private _basePoint: Vector3;
    private _epsilon: number;
    /** @hidden */
    public _velocityWorldLength: number;
    /** @hidden */
    public _basePointWorld = Vector3.Zero();
    private _velocityWorld = Vector3.Zero();
    private _normalizedVelocity = Vector3.Zero();
    /** @hidden */
    public _initialVelocity: Vector3;
    /** @hidden */
    public _initialPosition: Vector3;
    private _nearestDistance: number;

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
    public get slidePlaneNormal(): Vector3 {
        return this._slidePlaneNormal;
    }

    // Methods
    /** @hidden */
    public _initialize(source: Vector3, dir: Vector3, e: number): void {
        this._velocity = dir;
        Vector3.NormalizeToRef(dir, this._normalizedVelocity);
        this._basePoint = source;

        source.multiplyToRef(this._radius, this._basePointWorld);
        dir.multiplyToRef(this._radius, this._velocityWorld);

        this._velocityWorldLength = this._velocityWorld.length();

        this._epsilon = e;
        this.collisionFound = false;
    }

    /** @hidden */
    public _checkPointInTriangle(point: [x: number, y: number, z: number], pa: Float32Array, pb: Float32Array, pc: Float32Array, n: [x: number, y: number, z: number]): boolean {
        //TODO: Use simd
        this._tempVector[0] = pa[0] - point[0]
        this._tempVector[1] = pa[1] - point[1]
        this._tempVector[2] = pa[2] - point[2]

        this._tempVector2[0] = pb[0] - point[0]
        this._tempVector2[1] = pb[1] - point[1]
        this._tempVector2[2] = pb[2] - point[2]


       // pa.subtractToRef(point, this._tempVector);
       // pb.subtractToRef(point, this._tempVector2);

        CrossToRef(this._tempVector, this._tempVector2, this._tempVector4);
        var d = Dot(this._tempVector4, n);
        if (d < 0) {
            return false;
        }

        this._tempVector3[0] = pc[0] - point[0]
        this._tempVector3[1] = pc[1] - point[1]
        this._tempVector3[2] = pc[2] - point[2]

        //pc.subtractToRef(point, this._tempVector3);
        CrossToRef(this._tempVector2, this._tempVector3, this._tempVector4);
        d = Dot(this._tempVector4, n);
        if (d < 0) {
            return false;
        }

        CrossToRef(this._tempVector3, this._tempVector, this._tempVector4);
        d = Dot(this._tempVector4, n);
        return d >= 0;
    }

    /** @hidden */
    public _canDoCollision(sphereCenter: Vector3, sphereRadius: number, vecMin: Vector3, vecMax: Vector3): boolean {
        var distance = Vector3.Distance(this._basePointWorld, sphereCenter);

        var max = Math.max(this._radius.x, this._radius.y, this._radius.z);

        if (distance > this._velocityWorldLength + max + sphereRadius) {
            return false;
        }

        if (!intersectBoxAASphere(vecMin, vecMax, this._basePointWorld, this._velocityWorldLength + max)) {
            return false;
        }

        return true;
    }

    /** @hidden */
    public _testTriangle(faceIndex: number, trianglePlaneArray: {normal:[x:number,y:number,z:number],d:number}[], p1a: Float32Array, p2a: Float32Array, p3a: Float32Array, hasMaterial: boolean): void {
        let t0:number;
        var embeddedInPlane = false;

        //defensive programming, actually not needed.
        if (!trianglePlaneArray) {
            trianglePlaneArray = [];
        }

        if (!trianglePlaneArray[faceIndex]) {
            //trianglePlaneArray[faceIndex] = new Plane(0, 0, 0, 0);
            //trianglePlaneArray[faceIndex].copyFromPoints(Vector3.FromArray(p1a), Vector3.FromArray(p2a), Vector3.FromArray(p3a));

            var x1 = p2a[0] - p1a[0];
            var y1 = p2a[1] - p1a[1];
            var z1 = p2a[2] - p1a[2];
            var x2 = p3a[0] - p1a[0];
            var y2 = p3a[1] - p1a[1];
            var z2 = p3a[2] - p1a[2];
            var yz = (y1 * z2) - (z1 * y2);
            var xz = (z1 * x2) - (x1 * z2);
            var xy = (x1 * y2) - (y1 * x2);
           // var pyth = (Math.sqrt((yz * yz) + (xz * xz) + (xy * xy)));
            var pyth = Math.hypot(yz, xz, xy)
            var invPyth;

            if (pyth !== 0) {
                invPyth = 1.0 / pyth;
            }
            else {
                invPyth = 0.0;
            }
            const normal:[number,number,number] = [yz * invPyth, xz * invPyth, xy * invPyth];
            trianglePlaneArray[faceIndex] = {
                normal,
                d: -((normal[0] * p1a[0]) + (normal[1] * p1a[1]) + (normal[2] * p1a[2]))
            }
        }


        var trianglePlane = trianglePlaneArray[faceIndex];

        var dot = Vector3.Dot(Vector3.FromArray(trianglePlane.normal), this._normalizedVelocity);
        if (dot > 0)
            return

       /* if ((!hasMaterial) && !trianglePlane.isFrontFacingTo(this._normalizedVelocity, 0)) {
            return;
        }*/

        var signedDistToTrianglePlane = Vector3.Dot(this._basePoint, Vector3.FromArray(trianglePlane.normal)) + trianglePlane.d; //trianglePlane.signedDistanceTo(this._basePoint);
        var normalDotVelocity = Vector3.Dot(Vector3.FromArray(trianglePlane.normal), this._velocity);

        if (normalDotVelocity == 0) {
            if (Math.abs(signedDistToTrianglePlane) >= 1.0) {
                return;
            }
            embeddedInPlane = true;
            t0 = 0;
        }
        else {
            t0 = (-1.0 - signedDistToTrianglePlane) / normalDotVelocity;
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
            if (t0 > 1.0) {
                t0 = 1.0;
            }
        }

        this._collisionPoint.copyFromFloats(0, 0, 0);

        var found = false;
        var t = 1.0;

        if (!embeddedInPlane) {
            //TODO: Use simd
            this._planeIntersectionPoint[0] = this._basePoint.x - trianglePlane.normal[0];
            this._planeIntersectionPoint[1] = this._basePoint.y - trianglePlane.normal[1];
            this._planeIntersectionPoint[2] = this._basePoint.z - trianglePlane.normal[2];
            //this._basePoint.subtractToRef(trianglePlane.normal, this._planeIntersectionPoint);
           // this._velocity.scaleToRef(t0, this._tempVector);
            this._tempVector[0] = this._velocity.x * t0
            this._tempVector[1] = this._velocity.y * t0
            this._tempVector[2] = this._velocity.z * t0
            this._planeIntersectionPoint[0] += this._tempVector[0];
            this._planeIntersectionPoint[1] += this._tempVector[1];
            this._planeIntersectionPoint[2] += this._tempVector[2];
            //this._planeIntersectionPoint.addInPlace(this._tempVector);

            if (this._checkPointInTriangle(this._planeIntersectionPoint, p1a, p2a, p3a, trianglePlane.normal)) {
                found = true;
                t = t0;
                this._collisionPoint.x = this._planeIntersectionPoint[0];
                this._collisionPoint.y = this._planeIntersectionPoint[1];
                this._collisionPoint.z = this._planeIntersectionPoint[2];
               // this._collisionPoint.copyFrom(this._planeIntersectionPoint);
            }
        }

        if (!found) {
            var velocitySquaredLength = this._velocity.lengthSquared();

            var a = velocitySquaredLength;

            let lowestRoot: { root: number, found: boolean };
            let b: number;
            let c: number;
            [p1a, p2a, p3a].forEach(p => {
                this._tempVector[0] = this._basePoint.x - p[0];
                this._tempVector[1] = this._basePoint.y - p[1];
                this._tempVector[2] = this._basePoint.z - p[2];
               // b = 2.0 * (Dot(this._velocity.asArray(), this._tempVector));
                //Dot product
                b = 2.0 * (this._velocity.x * this._tempVector[0] + this._velocity.y * this._tempVector[1] + this._velocity.z * this._tempVector[2])


               // c = this._tempVector.lengthSquared() - 1.0;
                c = (this._tempVector[0] * this._tempVector[0] + this._tempVector[1] * this._tempVector[1] + this._tempVector[2] * this._tempVector[2]) - 1.0;
                lowestRoot = getLowestRoot(a, b, c, t);
                if (lowestRoot.found) {
                    t = lowestRoot.root;
                    found = true;
                    this._collisionPoint.x = p[0]
                    this._collisionPoint.y = p[1]
                    this._collisionPoint.z = p[2]
                }
            });
            const points = [p1a, p2a, p3a, p1a];
            for (let i = 0; i < 3; i++) {
                const p = points[i]
                this._edge.x = points[i+1][0] - p[0];
                this._edge.y = points[i + 1][1] - p[1];
                this._edge.z = points[i + 1][2] - p[2];

                this._baseToVertex.x = p[0] - this._basePoint.x;
                this._baseToVertex.y = p[1] - this._basePoint.y;
                this._baseToVertex.z = p[2] - this._basePoint.z;

                var edgeSquaredLength = this._edge.lengthSquared();
                var edgeDotVelocity = Vector3.Dot(this._edge, this._velocity);
                var edgeDotBaseToVertex = Vector3.Dot(this._edge, this._baseToVertex);

                a = edgeSquaredLength * (-velocitySquaredLength) + edgeDotVelocity * edgeDotVelocity;
                b = edgeSquaredLength * (2.0 * Vector3.Dot(this._velocity, this._baseToVertex)) - 2.0 * edgeDotVelocity * edgeDotBaseToVertex;
                c = edgeSquaredLength * (1.0 - this._baseToVertex.lengthSquared()) + edgeDotBaseToVertex * edgeDotBaseToVertex;

                lowestRoot = getLowestRoot(a, b, c, t);
                if (lowestRoot.found) {
                    var f = (edgeDotVelocity * lowestRoot.root - edgeDotBaseToVertex) / edgeSquaredLength;
                    if (f >= 0.0 && f <= 1.0) {
                        t = lowestRoot.root;
                        found = true;
                        this._edge.scaleInPlace(f);
                        this._collisionPoint.x = p[0] + this._edge.x;
                        this._collisionPoint.y = p[1] + this._edge.y;
                        this._collisionPoint.z = p[2] + this._edge.z;
                    }
                }
            }
        }

        if (found) {
            var distToCollision = t * this._velocity.length();

            if (!this.collisionFound || distToCollision < this._nearestDistance) {
                if (!this.intersectionPoint) {
                    this.intersectionPoint = this._collisionPoint.clone();
                } else {
                    this.intersectionPoint.copyFrom(this._collisionPoint);
                }
                this._nearestDistance = distToCollision;
                this.collisionFound = true;
                console.log('collision found')
                this.collidedMesh = "hostMesh";
            }
        }
    }

    /** @hidden */
    public _collide(trianglePlaneArray: Array<Plane>, pts: Vector3[], indices: IndicesArray, indexStart: number, indexEnd: number, decal: number, hasMaterial: boolean, hostMesh: AbstractMesh): void {
        if (!indices || indices.length === 0) {
            for (let i = 0; i < pts.length; i += 3) {
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const p3 = pts[i + 2];

                //this._testTriangle(i, trianglePlaneArray, p3, p2, p1, hasMaterial);
            }
        } else {
            for (let i = indexStart; i < indexEnd; i += 3) {
                const p1 = pts[indices[i] - decal];
                const p2 = pts[indices[i + 1] - decal];
                const p3 = pts[indices[i + 2] - decal];

                //this._testTriangle(i, trianglePlaneArray, p3, p2, p1, hasMaterial);
            }
        }
    }

    /** @hidden */
    public _getResponse(pos: Vector3, vel: Vector3): void {
        pos.addToRef(vel, this._destinationPoint);
        vel.scaleInPlace((this._nearestDistance / vel.length()));

        this._basePoint.addToRef(vel, pos);
        pos.subtractToRef(this.intersectionPoint, this._slidePlaneNormal);
        this._slidePlaneNormal.normalize();
        this._slidePlaneNormal.scaleToRef(this._epsilon, this._displacementVector);

        pos.addInPlace(this._displacementVector);
        this.intersectionPoint.addInPlace(this._displacementVector);

        this._slidePlaneNormal.scaleInPlace(Plane.SignedDistanceToPlaneFromPositionAndNormal(this.intersectionPoint, this._slidePlaneNormal, this._destinationPoint));
        this._destinationPoint.subtractInPlace(this._slidePlaneNormal);

        this._destinationPoint.subtractToRef(this.intersectionPoint, vel);
    }
}

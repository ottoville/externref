// Implementation of the "Improved Collision detection and Response" algorithm proposed by Kasper Fauerby
// https://www.peroxide.dk/papers/collision/collision.pdf

import type { Ellipsoid } from "./nodes/DataNode.js";
import type { Engine, rustWasm, rust_pointer } from "./engine.js";
import { TerraVector3, TerraVector4, Triangle } from "./Math.js";
declare const engine:Engine;

// TODO: change to readonlyTerraVector
function Dot(left: readonly [number, number, number] | Float32Array | TerraVector3, right: readonly [number, number, number] | Float32Array | TerraVector3): number {
    return (left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);
}
function CrossToRef(left: readonly [number, number, number], right: readonly [number, number, number], result: [number, number, number]): void {
    result[0] = left[1] * right[2] - left[2] * right[1];
    result[1] = left[2] * right[0] - left[0] * right[2];
    result[2] = left[0] * right[1] - left[1] * right[0];
}
export class ColliderJS {
    #velocitySquaredLength!: number;
    finalPosition: TerraVector3;
    collider_ptr: rust_pointer<"legacy_collider">;
    didCollide = false;
    getLowestRoot (a: number, b: number, c: number, maxR: number) {
        //TODO: This will give false negative if determinant is zero
        var determinant = b * b - 4.0 * a * c;
        if (determinant < 0) {
            return 0;
        }
        var sqrtD = Math.sqrt(determinant);
        const doubledA=2.0 * a;
        var r1 = (-b - sqrtD) / doubledA;
        var r2 = (-b + sqrtD) / doubledA;

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
    }
    /** Define if a collision was found */
    //public collisionFound = false;

    /**
     * Define last intersection point in local space
     */
   // public intersectionPoint = this.engine.callocVector3()//[0, 0, 0]

    /**
     * Define last collided mesh
     */
    public collidedMesh: string | undefined;

    #collisionPoint: [x: number, y: number, z: number] = [0, 0, 0];
    #planeIntersectionPoint: [x: number, y: number, z: number] = [0, 0, 0];

    #tempVector: [x: number, y: number, z: number] = [0, 0, 0];
    #tempVector2: [x: number, y: number, z: number] = [0, 0, 0];
    #tempVector3: [x: number, y: number, z: number] = [0, 0, 0];
    #tempVector4: [x: number, y: number, z: number] = [0, 0, 0];
    private _edge: [x: number, y: number, z: number] = [0, 0, 0];
    private _baseToVertex: [x: number, y: number, z: number] = [0, 0, 0];
    _destinationPoint: [x: number, y: number, z: number] = [0, 0, 0];
    _slidePlaneNormal: [x: number, y: number, z: number] = [0, 0, 0];
    _displacementVector: [x: number, y: number, z: number] = [0, 0, 0];

    get scaledPosition() {
        return new Float32Array(engine.memory.buffer, engine.rust.scaled_position_pointer(this.collider_ptr), 4) as TerraVector3;
    }
    get scaledVelocity() {
        return new Float32Array(engine.memory.buffer, engine.rust.scaled_velocity_pointer(this.collider_ptr), 4) as TerraVector3;
    }
    get intersectionPointWasm() {
        return new Float32Array(engine.memory.buffer, engine.rust.intersection_point_pointer(this.collider_ptr), 4) as TerraVector3;
    }
    get collided_point_in_triangle() {
        const trianglePtr=new Uint32Array(engine.memory.buffer, engine.rust.collided_point_in_triangle_pointer(this.collider_ptr),1)[0];
        if(trianglePtr===0)
            return undefined
        return new Float32Array(engine.memory.buffer, trianglePtr, 4) as TerraVector4;
    }
    set collided_point_in_triangle(val:TerraVector4|undefined) {
        if(!val)
            new Uint32Array(engine.memory.buffer, engine.rust.collided_point_in_triangle_pointer(this.collider_ptr),1)[0]=0;
        else
            new Uint32Array(engine.memory.buffer, engine.rust.collided_point_in_triangle_pointer(this.collider_ptr),1)[0]=val.byteOffset;
    }
    set nearest_distance_squared(val:number) {
        engine.rust.set_nearest_distance_squared(this.collider_ptr, val);
    }
    get nearest_distance_squared() {
        return engine.rust.get_nearest_distance_squared(this.collider_ptr);
    }
    set collision_resolved(val:number) {
        new Float32Array(engine.memory.buffer, engine.rust.collision_resolved_pointer(this.collider_ptr), 1).set([val]);
    }
    get collision_resolved() {
        return new Float32Array(engine.memory.buffer, engine.rust.collision_resolved_pointer(this.collider_ptr), 1)[0]!
    }
    constructor(rustExports:rustWasm) {
        this.collider_ptr = rustExports.collider();
        this.finalPosition= new TerraVector3();
    }


    /** @hidden */
    public _retry = 0;
    //#velocity!:Vector3;
   // basePoint!: Vector3;
    epsilon = 0;
    /** @hidden */
    /** @hidden */
    #velocityWorld = new TerraVector3()
    #normalizedVelocity: [x: number, y: number, z: number] = [0, 0, 0];
    /** @hidden */
    // public _initialVelocity: [x: number, y: number, z: number] = [0, 0, 0];
    /** @hidden */
    // public _initialPosition: Vector3 = Vector3.Zero();

   // #nearestDistanceSquared = 9999999;

    // Methods
    /** @hidden */
    public _initialize(source: TerraVector3, dir: TerraVector3,e: number, sphere: Ellipsoid): void {
        this.collided_point_in_triangle=undefined;
        this.nearest_distance_squared=9999999;
        //this.#velocity = dir;
        const scaledVelocity=this.scaledVelocity;
        this.#velocitySquaredLength = scaledVelocity[0] * scaledVelocity[0] + scaledVelocity[1] * scaledVelocity[1] + scaledVelocity[2] * scaledVelocity[2];
     //   engine.rust.set_speed_squared(this.collider_ptr, scaledVelocity[0] * scaledVelocity[0] + scaledVelocity[1] * scaledVelocity[1] + scaledVelocity[2] * scaledVelocity[2])
       
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
       // this.basePoint = source
        /*this.#basePoint[0] = source[0];
        this.#basePoint[1] = source[1];
        this.#basePoint[2] = source[2];*/

        new Float32Array(engine.rust.memory.buffer, engine.rust.basepoint_world_pointer(this.collider_ptr),3).set([
            source[0] * sphere.radius[0],
            source[1] * sphere.radius[1],
            source[2] * sphere.radius[2]
        ])

        this.#velocityWorld[0] = dir[0] * sphere.radius[0];
        this.#velocityWorld[1] = dir[1] * sphere.radius[1];
        this.#velocityWorld[2] = dir[2] * sphere.radius[2];
        engine.rust.set_speed(this.collider_ptr, Math.hypot(this.#velocityWorld[0], this.#velocityWorld[1],  this.#velocityWorld[2]))
        this.epsilon = e;
       // this.collisionFound = false;
       this.collision_resolved=1;
        //console.log('set collisionNotFound true')


    }

    /** @hidden */
    public _checkPointInTriangle(point: [x: number, y: number, z: number], triangle: Triangle): boolean {
        const vectors = triangle.vectors;
        const v1=vectors[1];
        const v2=vectors[2];
        //TODO: Use simd
        this.#tempVector[0] = v2[0] - point[0]
        this.#tempVector[1] = v2[1] - point[1]
        this.#tempVector[2] = v2[2] - point[2]

        this.#tempVector2[0] = v1[0] - point[0]
        this.#tempVector2[1] = v1[1] - point[1]
        this.#tempVector2[2] = v1[2] - point[2]


        // pa.subtractToRef(point, this._tempVector);
        // pb.subtractToRef(point, this._tempVector2);

        CrossToRef(this.#tempVector, this.#tempVector2, this.#tempVector4);
        var d = Dot(this.#tempVector4, triangle.planeCollider);
        if (d < 0) {
            return false;
        }
        const v0=vectors[0];

        this.#tempVector3[0] = v0[0] - point[0]
        this.#tempVector3[1] = v0[1] - point[1]
        this.#tempVector3[2] = v0[2] - point[2]

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

    //#points: [TerraVector3, TerraVector3, TerraVector3] = [new TerraVector3(), new TerraVector3(), new TerraVector3()];
    /** @hidden */
    public _testTriangle(triangle: Triangle, scaledPosition:TerraVector3, scaledVelocity:TerraVector3): void {
        var dot = Dot(triangle.planeCollider, this.#normalizedVelocity);
        
        if (dot > 0) {
            return
        }

        const signedDistToTrianglePlane = Dot(scaledPosition, triangle.planeCollider) + triangle.planeCollider[3]; //trianglePlane.signedDistanceTo(this._basePoint);
        const normalDotVelocity = Dot(triangle.planeCollider, scaledVelocity);

       // let t0=0;
        this.#collisionPoint[0] = 0;
        this.#collisionPoint[1] = 0;
        this.#collisionPoint[2] = 0;
        let found = false;
        let t = 1.0;
        let collidedPointInTriangle = false;

        // Check if movement is at 90 degree angle with plane
        if (Math.abs(normalDotVelocity) < 0.0009) {
            if (Math.abs(signedDistToTrianglePlane) >= 1.0) {
                return;
            }
            var t0 = 0;
        }
        else {
            var t0 = (-1.0 - signedDistToTrianglePlane) / normalDotVelocity;

            let t1 = (1.0 - signedDistToTrianglePlane) / normalDotVelocity;

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
            this.#planeIntersectionPoint[0] = scaledPosition[0] - triangle.planeCollider[0] + scaledVelocity[0] * t0;
            this.#planeIntersectionPoint[1] = scaledPosition[1] - triangle.planeCollider[1] + scaledVelocity[1] * t0;
            this.#planeIntersectionPoint[2] = scaledPosition[2] - triangle.planeCollider[2] + scaledVelocity[2] * t0;
            //this._basePoint.subtractToRef(trianglePlane.normal, this._planeIntersectionPoint);
            // this._velocity.scaleToRef(t0, this._tempVector);
            //this._planeIntersectionPoint.addInPlace(this._tempVector);
            collidedPointInTriangle=this._checkPointInTriangle(this.#planeIntersectionPoint, triangle);
            if (collidedPointInTriangle) {
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
            const vectors = triangle.vectors;
            while (i < 3) {
                // for (let i = 0; i < 3; i++) {
                const p = vectors[i];
                if (!p) {
                    throw(new Error('no vector found '+p))
                }

                this.#tempVector[0] = scaledPosition[0] - p[0];
                this.#tempVector[1] = scaledPosition[1] - p[1];
                this.#tempVector[2] = scaledPosition[2] - p[2];
                b = 2.0 * (Dot(scaledVelocity, this.#tempVector));
                c = (this.#tempVector[0] * this.#tempVector[0] + this.#tempVector[1] * this.#tempVector[1] + this.#tempVector[2] * this.#tempVector[2]) - 1.0;
                lowestRoot = this.getLowestRoot(this.#velocitySquaredLength, b, c, t);
                //lowestRoot = engine.wasm.getLowestRoot(this.#velocitySquaredLength, b, c, t)
                if (lowestRoot) {
                    t = lowestRoot;
                    found = true;
                    this.#collisionPoint[0] = p[0]
                    this.#collisionPoint[1] = p[1]
                    this.#collisionPoint[2] = p[2]                    
                }
                i++;
            }
            

            let a; // = this.#velocitySquaredLength;
            i = 2;
            while (i > 0) {
                const p = vectors[i]
                if (!p)
                    continue;
                const p2 = vectors[i - 1] || vectors[2];
                this._edge[0] = p2[0] - p[0];
                this._edge[1] = p2[1] - p[1];
                this._edge[2] = p2[2] - p[2];

                this._baseToVertex[0] = p[0] - scaledPosition[0];
                this._baseToVertex[1] = p[1] - scaledPosition[1];
                this._baseToVertex[2] = p[2] - scaledPosition[2];

                //var edgeSquaredLength = this._edge.lengthSquared();
                var edgeSquaredLength = this._edge[0] * this._edge[0] + this._edge[1] * this._edge[1] + this._edge[2] * this._edge[2]
                var edgeDotVelocity = Dot(this._edge, scaledVelocity);
                var edgeDotBaseToVertex = Dot(this._edge, this._baseToVertex);

                //a = edgeSquaredLength * (-this.#velocitySquaredLength) + edgeDotVelocity * edgeDotVelocity;
                a = edgeDotVelocity * edgeDotVelocity - edgeSquaredLength * this.#velocitySquaredLength;
              //  b = edgeSquaredLength * (2.0 * Dot(this.#velocity, this._baseToVertex)) - 2.0 * edgeDotVelocity * edgeDotBaseToVertex;
                //b = 2 * edgeSquaredLength * Dot(this.#velocity, this._baseToVertex) - 2 * edgeDotVelocity * edgeDotBaseToVertex
                b = 2*(edgeSquaredLength * Dot(scaledVelocity, this._baseToVertex) - edgeDotVelocity * edgeDotBaseToVertex)
                c = edgeSquaredLength * (1.0 - (this._baseToVertex[0] * this._baseToVertex[0] + this._baseToVertex[1] * this._baseToVertex[1] + this._baseToVertex[2] * this._baseToVertex[2])) + edgeDotBaseToVertex * edgeDotBaseToVertex;

                lowestRoot = this.getLowestRoot(a, b, c, t);
                //lowestRoot = engine.wasm.getLowestRoot(a, b, c, t)
                if (lowestRoot) {
                    var f = (edgeDotVelocity * lowestRoot - edgeDotBaseToVertex) / edgeSquaredLength;
                    if (f >= 0.0 && f <= 1.0) {
                        t = lowestRoot;
                        found = true;
                        // this._edge.scaleInPlace(f);
                /*        this._edge[0] *= f;
                        this._edge[1] *= f;
                        this._edge[2] *= f;*/
                        this.#collisionPoint[0] = p[0] + this._edge[0] * f;
                        this.#collisionPoint[1] = p[1] + this._edge[1] * f;
                        this.#collisionPoint[2] = p[2] + this._edge[2] * f;
                    }
                }
                i--;
            }
        }
        if (found) {
         //   engine.rust.collision_found(this.collider_ptr, t * this.#velocitySquaredLength, this.#collisionPoint[0], this.#collisionPoint[1], this.#collisionPoint[2]);
        //  engine.wasm.collision_found_debug(t, this.#velocitySquaredLength, this.#collisionPoint[0], this.#collisionPoint[1], this.#collisionPoint[2], 0) 
          var distToCollisionSquared = t * t * this.#velocitySquaredLength;
            //var distToCollisionSquared = t * (this.#velocity[0] * this.#velocity[0] + this.#velocity[1] * this.#velocity[1] + this.#velocity[2] * this.#velocity[2]);
          //  console.log(this.collisionFound);
          
            if (this.collision_resolved === 1 || distToCollisionSquared < this.nearest_distance_squared) {
               
               
               
                //Dir = (B - A) x (C - A)
                //Norm = Dir / len(Dir)
               /* const vectors=triangle.vectors;

                const BminusA:[number,number,number] = [
                    vectors[2][0]-vectors[0][0],
                    vectors[2][1]-vectors[0][1],
                    vectors[2][2]-vectors[0][2]
                ];
                const CminusA:[number,number,number] = [
                    vectors[1][0]-vectors[0][0],
                    vectors[1][1]-vectors[0][1],
                    vectors[1][2]-vectors[0][2]
                ];
                const ref:[number,number,number]=[0,0,0];
                CrossToRef(BminusA,CminusA,ref);
                const len=Math.hypot(...ref)
                const norm=[ref[0] / len,ref[1] / len,ref[2] / len]

                console.log('plane normal',norm)*/

               
               
                this.intersectionPointWasm.set(this.#collisionPoint);
                this.nearest_distance_squared=distToCollisionSquared;

              //  console.log('nearestDistanceSquared',this.#nearestDistanceSquared)
                //this.collisionFound = true;
                this.collision_resolved=0;
                //console.log('set collisionNotFound 0', this.collisionNotFound.getUint32(0,true))
                this.collidedMesh = "hostMesh";
                this.collided_point_in_triangle=collidedPointInTriangle?triangle.planeCollider:undefined;
            }
        }
    }
}

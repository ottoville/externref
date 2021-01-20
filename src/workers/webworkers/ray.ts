/*import { DeepImmutable, Nullable, float } from "../types";
import { ArrayTools } from "../Misc/arrayTools";
import { Matrix, Vector3, TmpVectors } from "../Maths/math.vector";
import { AbstractMesh } from "../Meshes/abstractMesh";
import { PickingInfo } from "../Collisions/pickingInfo";
import { IntersectionInfo } from "../Collisions/intersectionInfo";
import { BoundingBox } from "./boundingBox";
import { BoundingSphere } from "./boundingSphere";
import { Scene } from '../scene';
import { Camera } from '../Cameras/camera';
import { Plane } from '../Maths/math.plane';*/


class PickingInfo {
    /** @hidden */
    public _pickingUnavailable = false;

    /**
     * If the pick collided with an object
     */
    public hit = false;
    /**
     * Distance away where the pick collided
     */
    public distance = 0;
    /**
     * The location of pick collision
     */
    public pickedPoint: Nullable<Vector3> = null;
    /**
     * The mesh corresponding the the pick collision
     */
    //public pickedMesh: Nullable<AbstractMesh> = null;
    /** (See getTextureCoordinates) The barycentric U coordinate that is used when calculating the texture coordinates of the collision.*/
    public bu = 0;
    /** (See getTextureCoordinates) The barycentric V coordinate that is used when calculating the texture coordinates of the collision.*/
    public bv = 0;
    /** The index of the face on the mesh that was picked, or the index of the Line if the picked Mesh is a LinesMesh */
    public faceId = -1;
    /** Id of the the submesh that was picked */
    public subMeshId = 0;
    /** If a sprite was picked, this will be the sprite the pick collided with */
    //public pickedSprite: Nullable<Sprite> = null;
    /**
     * If a mesh was used to do the picking (eg. 6dof controller) this will be populated.
     */
    //public originMesh: Nullable<AbstractMesh> = null;
    /**
     * The ray that was used to perform the picking.
     */
    public ray: Nullable<Ray> = null;

    /**
     * Gets the normal correspodning to the face the pick collided with
     * @param useWorldCoordinates If the resulting normal should be relative to the world (default: false)
     * @param useVerticesNormals If the vertices normals should be used to calculate the normal instead of the normal map
     * @returns The normal correspodning to the face the pick collided with
     */
   /* public getNormal(useWorldCoordinates = false, useVerticesNormals = true): Nullable<Vector3> {
        if (!this.pickedMesh || !this.pickedMesh.isVerticesDataPresent(VertexBuffer.NormalKind)) {
            return null;
        }

        var indices = this.pickedMesh.getIndices();

        if (!indices) {
            return null;
        }

        var result: Vector3;

        if (useVerticesNormals) {
            var normals = (<FloatArray>this.pickedMesh.getVerticesData(VertexBuffer.NormalKind));

            var normal0 = Vector3.FromArray(normals, indices[this.faceId * 3] * 3);
            var normal1 = Vector3.FromArray(normals, indices[this.faceId * 3 + 1] * 3);
            var normal2 = Vector3.FromArray(normals, indices[this.faceId * 3 + 2] * 3);

            normal0 = normal0.scale(this.bu);
            normal1 = normal1.scale(this.bv);
            normal2 = normal2.scale(1.0 - this.bu - this.bv);

            result = new Vector3(normal0.x + normal1.x + normal2.x, normal0.y + normal1.y + normal2.y, normal0.z + normal1.z + normal2.z);
        } else {
            var positions = (<FloatArray>this.pickedMesh.getVerticesData(VertexBuffer.PositionKind));

            var vertex1 = Vector3.FromArray(positions, indices[this.faceId * 3] * 3);
            var vertex2 = Vector3.FromArray(positions, indices[this.faceId * 3 + 1] * 3);
            var vertex3 = Vector3.FromArray(positions, indices[this.faceId * 3 + 2] * 3);

            var p1p2 = vertex1.subtract(vertex2);
            var p3p2 = vertex3.subtract(vertex2);

            result = Vector3.Cross(p1p2, p3p2);
        }

        if (useWorldCoordinates) {
            let wm = this.pickedMesh.getWorldMatrix();

            if (this.pickedMesh.nonUniformScaling) {
                TmpVectors.Matrix[0].copyFrom(wm);
                wm = TmpVectors.Matrix[0];
                wm.setTranslationFromFloats(0, 0, 0);
                wm.invert();
                wm.transposeToRef(TmpVectors.Matrix[1]);

                wm = TmpVectors.Matrix[1];
            }

            result = Vector3.TransformNormal(result, wm);
        }

        result.normalize();

        return result;
    }*/

    /**
     * Gets the texture coordinates of where the pick occured
     * @returns the vector containing the coordnates of the texture
     */
   /* public getTextureCoordinates(): Nullable<Vector2> {
        if (!this.pickedMesh || !this.pickedMesh.isVerticesDataPresent(VertexBuffer.UVKind)) {
            return null;
        }

        var indices = this.pickedMesh.getIndices();
        if (!indices) {
            return null;
        }

        var uvs = this.pickedMesh.getVerticesData(VertexBuffer.UVKind);
        if (!uvs) {
            return null;
        }

        var uv0 = Vector2.FromArray(uvs, indices[this.faceId * 3] * 2);
        var uv1 = Vector2.FromArray(uvs, indices[this.faceId * 3 + 1] * 2);
        var uv2 = Vector2.FromArray(uvs, indices[this.faceId * 3 + 2] * 2);

        uv0 = uv0.scale(this.bu);
        uv1 = uv1.scale(this.bv);
        uv2 = uv2.scale(1.0 - this.bu - this.bv);

        return new Vector2(uv0.x + uv1.x + uv2.x, uv0.y + uv1.y + uv2.y);
    }*/
}
class IntersectionInfo {
    public faceId = 0;
    public subMeshId = 0;

    constructor(
        public bu: Nullable<number>,
        public bv: Nullable<number>,
        public distance: number) {
    }
}

/**
 * Class representing a ray with position and direction
 */
class Ray {

    /**
     * Creates a new ray
     * @param origin origin point
     * @param direction direction
     * @param length length of the ray
     */
    constructor(
        /** origin point */
        public origin: Vector3,
        /** direction */
        public direction: Vector3,
        /** length of the ray */
        public length: number = Number.MAX_VALUE) {
    }

    // Methods
    /**
     * Checks if the ray intersects a box
     * @param minimum bound of the box
     * @param maximum bound of the box
     * @param intersectionTreshold extra extend to be added to the box in all direction
     * @returns if the box was hit
     */
    public intersectsBoxMinMax(minimum: { x: number, y: number, z: number }, maximum: { x: number, y: number, z: number }, intersectionTreshold: number = 0): boolean {
        //@ts-ignore
        const newMinimum = Ray.TmpVector3[0].copyFromFloats(minimum.x - intersectionTreshold, minimum.y - intersectionTreshold, minimum.z - intersectionTreshold);
        //@ts-ignore
        const newMaximum = Ray.TmpVector3[1].copyFromFloats(maximum.x + intersectionTreshold, maximum.y + intersectionTreshold, maximum.z + intersectionTreshold);
        var d = 0.0;
        var maxValue = Number.MAX_VALUE;
        var inv: number;
        var min: number;
        var max: number;
        var temp: number;
        if (Math.abs(this.direction.x) < 0.0000001) {
            if (this.origin.x < newMinimum.x || this.origin.x > newMaximum.x) {
                return false;
            }
        }
        else {
            inv = 1.0 / this.direction.x;
            min = (newMinimum.x - this.origin.x) * inv;
            max = (newMaximum.x - this.origin.x) * inv;
            if (max === -Infinity) {
                max = Infinity;
            }

            if (min > max) {
                temp = min;
                min = max;
                max = temp;
            }

            d = Math.max(min, d);
            maxValue = Math.min(max, maxValue);

            if (d > maxValue) {
                return false;
            }
        }

        if (Math.abs(this.direction.y) < 0.0000001) {
            if (this.origin.y < newMinimum.y || this.origin.y > newMaximum.y) {
                return false;
            }
        }
        else {
            inv = 1.0 / this.direction.y;
            min = (newMinimum.y - this.origin.y) * inv;
            max = (newMaximum.y - this.origin.y) * inv;

            if (max === -Infinity) {
                max = Infinity;
            }

            if (min > max) {
                temp = min;
                min = max;
                max = temp;
            }

            d = Math.max(min, d);
            maxValue = Math.min(max, maxValue);

            if (d > maxValue) {
                return false;
            }
        }

        if (Math.abs(this.direction.z) < 0.0000001) {
            if (this.origin.z < newMinimum.z || this.origin.z > newMaximum.z) {
                return false;
            }
        }
        else {
            inv = 1.0 / this.direction.z;
            min = (newMinimum.z - this.origin.z) * inv;
            max = (newMaximum.z - this.origin.z) * inv;

            if (max === -Infinity) {
                max = Infinity;
            }

            if (min > max) {
                temp = min;
                min = max;
                max = temp;
            }

            d = Math.max(min, d);
            maxValue = Math.min(max, maxValue);

            if (d > maxValue) {
                return false;
            }
        }
        return true;
    }

    /**
     * Checks if the ray intersects a box
     * @param box the bounding box to check
     * @param intersectionTreshold extra extend to be added to the BoundingBox in all direction
     * @returns if the box was hit
     */
    public intersectsBox(box: { min: { x: number, y: number, z: number }, max: { x: number, y: number, z: number }}, intersectionTreshold: number = 0): boolean {
        return this.intersectsBoxMinMax(box.min, box.max, intersectionTreshold);
    }


    /**
     * If the ray hits a triange
     * @param vertex0 triangle vertex
     * @param vertex1 triangle vertex
     * @param vertex2 triangle vertex
     * @returns intersection information if hit
     */
    public intersectsTriangle(vertex0: DeepImmutable<Vector3>, vertex1: DeepImmutable<Vector3>, vertex2: DeepImmutable<Vector3>): Nullable<IntersectionInfo> {
        //@ts-ignore
        const edge1 = Ray.TmpVector3[0];
        //@ts-ignore
        const edge2 = Ray.TmpVector3[1];
        //@ts-ignore
        const pvec = Ray.TmpVector3[2];
        //@ts-ignore
        const tvec = Ray.TmpVector3[3];
        //@ts-ignore
        const qvec = Ray.TmpVector3[4];

        vertex1.subtractToRef(vertex0, edge1);
        vertex2.subtractToRef(vertex0, edge2);
        Vector3.CrossToRef(this.direction, edge2, pvec);
        var det = Vector3.Dot(edge1, pvec);

        if (det === 0) {
            return null;
        }

        var invdet = 1 / det;

        this.origin.subtractToRef(vertex0, tvec);

        var bv = Vector3.Dot(tvec, pvec) * invdet;

        if (bv < 0 || bv > 1.0) {
            return null;
        }

        Vector3.CrossToRef(tvec, edge1, qvec);

        var bw = Vector3.Dot(this.direction, qvec) * invdet;

        if (bw < 0 || bv + bw > 1.0) {
            return null;
        }

        //check if the distance is longer than the predefined length.
        var distance = Vector3.Dot(edge2, qvec) * invdet;
        if (distance > this.length) {
            return null;
        }

        return new IntersectionInfo(1 - bv - bw, bv, distance);
    }

    /**
     * Checks if ray intersects a plane
     * @param plane the plane to check
     * @returns the distance away it was hit
     */
    public intersectsPlane(plane: DeepImmutable<Plane>): Nullable<number> {
        var distance: number;
        var result1 = Vector3.Dot(plane.normal, this.direction);
        if (Math.abs(result1) < 9.99999997475243E-07) {
            return null;
        }
        else {
            var result2 = Vector3.Dot(plane.normal, this.origin);
            distance = (-plane.d - result2) / result1;
            if (distance < 0.0) {
                if (distance < -9.99999997475243E-07) {
                    return null;
                } else {
                    return 0;
                }
            }

            return distance;
        }
    }
    /**
     * Calculate the intercept of a ray on a given axis
     * @param axis to check 'x' | 'y' | 'z'
     * @param offset from axis interception (i.e. an offset of 1y is intercepted above ground)
     * @returns a vector containing the coordinates where 'axis' is equal to zero (else offset), or null if there is no intercept.
     */
    public intersectsAxis(axis: string, offset: number = 0): Nullable<Vector3> {
        switch (axis) {
            case 'y':
                var t = (this.origin.y - offset) / this.direction.y;
                if (t > 0) {
                    return null;
                }
                return new Vector3(this.origin.x + (this.direction.x * -t), offset, this.origin.z + (this.direction.z * -t));
            case 'x':
                var t = (this.origin.x - offset) / this.direction.x;
                if (t > 0) {
                    return null;
                }
                return new Vector3(offset, this.origin.y + (this.direction.y * -t), this.origin.z + (this.direction.z * -t));
            case 'z':
                var t = (this.origin.z - offset) / this.direction.z;
                if (t > 0) {
                    return null;
                }
                return new Vector3(this.origin.x + (this.direction.x * -t), this.origin.y + (this.direction.y * -t), offset);
            default:
                return null;
        }
    }

    /**
     * Checks if ray intersects a mesh
     * @param mesh the mesh to check
     * @param fastCheck if only the bounding box should checked
     * @returns picking info of the intersecton
     */
    /*
    public intersectsMesh(mesh: DeepImmutable<AbstractMesh>, fastCheck?: boolean): PickingInfo {

        var tm = TmpVectors.Matrix[0];

        mesh.getWorldMatrix().invertToRef(tm);

        if (this._tmpRay) {
            Ray.TransformToRef(this, tm, this._tmpRay);
        } else {
            this._tmpRay = Ray.Transform(this, tm);
        }

        return mesh.intersects(this._tmpRay, fastCheck);

    }*/

    /**
     * Checks if ray intersects a mesh
     * @param meshes the meshes to check
     * @param fastCheck if only the bounding box should checked
     * @param results array to store result in
     * @returns Array of picking infos
     */
    /*
    public intersectsMeshes(meshes: Array<DeepImmutable<AbstractMesh>>, fastCheck?: boolean, results?: Array<PickingInfo>): Array<PickingInfo> {

        if (results) {
            results.length = 0;
        } else {
            results = [];
        }

        for (var i = 0; i < meshes.length; i++) {
            var pickInfo = this.intersectsMesh(meshes[i], fastCheck);

            if (pickInfo.hit) {
                results.push(pickInfo);
            }
        }

        results.sort(this._comparePickingInfo);

        return results;

    }
    */
    private _comparePickingInfo(pickingInfoA: DeepImmutable<PickingInfo>, pickingInfoB: DeepImmutable<PickingInfo>): number {

        if (pickingInfoA.distance < pickingInfoB.distance) {
            return -1;
        } else if (pickingInfoA.distance > pickingInfoB.distance) {
            return 1;
        } else {
            return 0;
        }

    }

    /**
     * Intersection test between the ray and a given segment whithin a given tolerance (threshold)
     * @param sega the first point of the segment to test the intersection against
     * @param segb the second point of the segment to test the intersection against
     * @param threshold the tolerance margin, if the ray doesn't intersect the segment but is close to the given threshold, the intersection is successful
     * @return the distance from the ray origin to the intersection point if there's intersection, or -1 if there's no intersection
     */
    /*
    intersectionSegment(sega: DeepImmutable<Vector3>, segb: DeepImmutable<Vector3>, threshold: number): number {
        const o = this.origin;
        const u = TmpVectors.Vector3[0];
        const rsegb = TmpVectors.Vector3[1];
        const v = TmpVectors.Vector3[2];
        const w = TmpVectors.Vector3[3];

        segb.subtractToRef(sega, u);

        this.direction.scaleToRef(Ray.rayl, v);
        o.addToRef(v, rsegb);

        sega.subtractToRef(o, w);

        var a = Vector3.Dot(u, u);                  // always >= 0
        var b = Vector3.Dot(u, v);
        var c = Vector3.Dot(v, v);                  // always >= 0
        var d = Vector3.Dot(u, w);
        var e = Vector3.Dot(v, w);
        var D = a * c - b * b;                      // always >= 0
        var sc: number, sN: number, sD = D;         // sc = sN / sD, default sD = D >= 0
        var tc: number, tN: number, tD = D;         // tc = tN / tD, default tD = D >= 0

        // compute the line parameters of the two closest points
        if (D < Ray.smallnum) {                     // the lines are almost parallel
            sN = 0.0;                               // force using point P0 on segment S1
            sD = 1.0;                               // to prevent possible division by 0.0 later
            tN = e;
            tD = c;
        }
        else {                                      // get the closest points on the infinite lines
            sN = (b * e - c * d);
            tN = (a * e - b * d);
            if (sN < 0.0) {                         // sc < 0 => the s=0 edge is visible
                sN = 0.0;
                tN = e;
                tD = c;
            } else if (sN > sD) {                   // sc > 1 => the s=1 edge is visible
                sN = sD;
                tN = e + b;
                tD = c;
            }
        }

        if (tN < 0.0) {                             // tc < 0 => the t=0 edge is visible
            tN = 0.0;
            // recompute sc for this edge
            if (-d < 0.0) {
                sN = 0.0;
            } else if (-d > a) {
                sN = sD;
            }
            else {
                sN = -d;
                sD = a;
            }
        } else if (tN > tD) {                       // tc > 1 => the t=1 edge is visible
            tN = tD;
            // recompute sc for this edge
            if ((-d + b) < 0.0) {
                sN = 0;
            } else if ((-d + b) > a) {
                sN = sD;
            } else {
                sN = (-d + b);
                sD = a;
            }
        }
        // finally do the division to get sc and tc
        sc = (Math.abs(sN) < Ray.smallnum ? 0.0 : sN / sD);
        tc = (Math.abs(tN) < Ray.smallnum ? 0.0 : tN / tD);

        // get the difference of the two closest points
        const qtc = TmpVectors.Vector3[4];
        v.scaleToRef(tc, qtc);
        const qsc = TmpVectors.Vector3[5];
        u.scaleToRef(sc, qsc);
        qsc.addInPlace(w);
        const dP = TmpVectors.Vector3[6];
        qsc.subtractToRef(qtc, dP); // = S1(sc) - S2(tc)

        var isIntersected = (tc > 0) && (tc <= this.length) && (dP.lengthSquared() < (threshold * threshold));   // return intersection result

        if (isIntersected) {
            return qsc.length();
        }
        return -1;
    }
    */
    /**
     * Update the ray from viewport position
     * @param x position
     * @param y y position
     * @param viewportWidth viewport width
     * @param viewportHeight viewport height
     * @param world world matrix
     * @param view view matrix
     * @param projection projection matrix
     * @returns this ray updated
     */
    /*
    public update(x: number, y: number, viewportWidth: number, viewportHeight: number, world: DeepImmutable<Matrix>, view: DeepImmutable<Matrix>, projection: DeepImmutable<Matrix>): Ray {
        this.unprojectRayToRef(x, y, viewportWidth, viewportHeight, world, view, projection);
        return this;
    }*/
    
    // Statics
    /**
     * Creates a ray with origin and direction of 0,0,0
     * @returns the new ray
     */
    public static Zero(): Ray {
        return new Ray(Vector3.Zero(), Vector3.Zero());
    }

    /**
     * Creates a new ray from screen space and viewport
     * @param x position
     * @param y y position
     * @param viewportWidth viewport width
     * @param viewportHeight viewport height
     * @param world world matrix
     * @param view view matrix
     * @param projection projection matrix
     * @returns new ray
     */
    /*
    public static CreateNew(x: number, y: number, viewportWidth: number, viewportHeight: number, world: DeepImmutable<Matrix>, view: DeepImmutable<Matrix>, projection: DeepImmutable<Matrix>): Ray {
        let result = Ray.Zero();

        return result.update(x, y, viewportWidth, viewportHeight, world, view, projection);
    }
    */
    /**
    * Function will create a new transformed ray starting from origin and ending at the end point. Ray's length will be set, and ray will be
    * transformed to the given world matrix.
    * @param origin The origin point
    * @param end The end point
    * @param world a matrix to transform the ray to. Default is the identity matrix.
    * @returns the new ray
    */
    /*
    public static CreateNewFromTo(origin: DeepImmutable<Vector3>, end: DeepImmutable<Vector3>, world: DeepImmutable<Matrix> = Matrix.IdentityReadOnly): Ray {
        var direction = end.subtract(origin);
        var length = Math.sqrt((direction.x * direction.x) + (direction.y * direction.y) + (direction.z * direction.z));
        direction.normalize();

        return Ray.Transform(new Ray(origin, direction, length), world);
    }
    */
    /**
     * Transforms a ray by a matrix
     * @param ray ray to transform
     * @param matrix matrix to apply
     * @returns the resulting new ray
     */
    public static Transform(ray: DeepImmutable<Ray>, matrix: DeepImmutable<Matrix>): Ray {
        var result = new Ray(new Vector3(0, 0, 0), new Vector3(0, 0, 0));
        Ray.TransformToRef(ray, matrix, result);

        return result;
    }

    /**
     * Transforms a ray by a matrix
     * @param ray ray to transform
     * @param matrix matrix to apply
     * @param result ray to store result in
     */
    public static TransformToRef(ray: DeepImmutable<Ray>, matrix: DeepImmutable<Matrix>, result: Ray): void {
        Vector3.TransformCoordinatesToRef(ray.origin, matrix, result.origin);
        Vector3.TransformNormalToRef(ray.direction, matrix, result.direction);
        result.length = ray.length;

        var dir = result.direction;
        var len = dir.length();

        if (!(len === 0 || len === 1)) {
            var num = 1.0 / len;
            dir.x *= num;
            dir.y *= num;
            dir.z *= num;
            result.length *= len;
        }
    }

    /**
      * Unproject a ray from screen space to object space
      * @param sourceX defines the screen space x coordinate to use
      * @param sourceY defines the screen space y coordinate to use
      * @param viewportWidth defines the current width of the viewport
      * @param viewportHeight defines the current height of the viewport
      * @param world defines the world matrix to use (can be set to Identity to go to world space)
      * @param view defines the view matrix to use
      * @param projection defines the projection matrix to use
      */
    public unprojectRayToRef(sourceX: float, sourceY: float, viewportWidth: number, viewportHeight: number, view: DeepImmutable<Matrix>, projection: DeepImmutable<Matrix>): void {
        view.multiplyToRef(projection, <Matrix>view);
        view.invert();
        var nearScreenSource = new Vector3();
        nearScreenSource.x = sourceX / viewportWidth * 2 - 1;
        nearScreenSource.y = -(sourceY / viewportHeight * 2 - 1);
        nearScreenSource.z = -1.0;
        var farScreenSource = new Vector3().copyFromFloats(nearScreenSource.x, nearScreenSource.y, 1.0);
        const nearVec3 = new Vector3();
        const farVec3 = new Vector3();
        Vector3._UnprojectFromInvertedMatrixToRef(nearScreenSource, view, nearVec3);
        Vector3._UnprojectFromInvertedMatrixToRef(farScreenSource, view, farVec3);

        this.origin.copyFrom(nearVec3);
        farVec3.subtractToRef(nearVec3, this.direction);
        this.direction.normalize();
    }
    
}

// Picking
/**
 * Type used to define predicate used to select faces when a mesh intersection is detected
 */
type TrianglePickingPredicate = (p0: Vector3, p1: Vector3, p2: Vector3, ray: Ray) => boolean;

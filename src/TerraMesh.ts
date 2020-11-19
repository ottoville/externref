import { ObjectWorkerThread, WorkerReturn } from "./WorkerThread.js";
import { Mesh } from "./lib/babylon/Meshes/mesh.js";
import { VertexData } from "./lib/babylon/Meshes/mesh.vertexData.js";
import type { Collider } from "./lib/babylon/Collisions/collider.js";
import type { AbstractMesh } from "./lib/babylon/Meshes/abstractMesh.js";
import { Vector3 } from "./lib/babylon/Maths/math.vector.js";
import { Matrix } from "./lib/babylon/Maths/math.js";
import type { Ray, TrianglePickingPredicate } from "./lib/babylon/Culling/ray.js";
import type { PickingInfo } from "./lib/babylon/Collisions/pickingInfo.js";
import { Material } from "./lib/babylon/Materials/material.js";
import { Geometry } from "./lib/babylon/Meshes/geometry.js";


var getLowestRoot: (a: number, b: number, c: number, maxR: number) => { root: number, found: boolean } =
    (function () {
        var result = { root: 0, found: false };
        return function (a: number, b: number, c: number, maxR: number) {
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
export class TerraMesh extends Mesh {
    public positionsBuffer: SharedArrayBuffer;
    public positionsView: DataView;
    public positions: Float32Array;

    public lastColliderWorldVertices: SharedArrayBuffer | null = null;
    public lastColliderTransformMatrix: Matrix = Matrix.Zero();

    public indices: Uint32Array | null = null;
    public indicesBuffer: SharedArrayBuffer | null = null;

    public normalsBuffer: SharedArrayBuffer | null = null;
    public normals: Float32Array | null = null;
    public normalsView: DataView | null = null;

    public uvs: SharedArrayBuffer | null = null;

    //static worker = new ObjectWorkerThread('/webworkers/mesh.js');
    constructor(name: string, positions: Float32Array, indices?: Uint32Array, normals?: Float32Array, uvs?: Float32Array) {
        super(name);
        const vertexData = new VertexData();
        if (typeof (indices) != 'undefined') {
            this.indicesBuffer = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * indices.length);
            this.indices = new Uint32Array(this.indicesBuffer);
            this.indices.set(indices);
            vertexData.indices = this.indices;
        } else
            this.isUnIndexed = true;
        if (typeof (normals) != 'undefined') {
            this.normalsBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * normals.length)
            this.normals = new Float32Array(this.normalsBuffer)
            this.normals.set(normals);
            this.normalsView = new DataView(this.normalsBuffer);
        }
        if (typeof (uvs) !== 'undefined') {
            this.uvs = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * uvs.length)
            let uvsview = new Float32Array(this.uvs);
            uvsview.set(uvs);
        }

        this.positionsBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * positions.length);
        this.positions = new Float32Array(this.positionsBuffer);
        this.positions.set(positions);
        this.positionsView = new DataView(this.positionsBuffer);

      //  TerraMesh.worker.message(this.uniqueId, 'init', [this.indicesBuffer, this.positionsBuffer, this.normalsBuffer]);
        
        
        vertexData.positions = this.positions;
        if (this.uvs)
            vertexData.uvs = new Float32Array(this.uvs)
        if (this.normals && this.normalsBuffer)
            vertexData.normals = new Float32Array(this.normalsBuffer)
      //  vertexData.applyToMesh(this, true);
        new Geometry(Geometry.RandomId(), this.getScene(), vertexData, false, this);
    }
    public _testTriangle(collider: {
        _normalizedVelocity: Vector3,
        _basePoint: Vector3,
        _velocity: Vector3,
        _collisionPoint: Vector3,
        _planeIntersectionPoint: Vector3,
        _tempVector: Vector3,
        BabylonCollider: Collider,
        _edge: Vector3,
        _baseToVertex: Vector3,
        _nearestDistance: number,
    }, faceIndex: number, trianglePlaneArray: Plane[], p1: Vector3, p2: Vector3, p3: Vector3, hasMaterial: boolean, hostMesh: AbstractMesh): void {
        var t0;
        var embeddedInPlane = false;

        //defensive programming, actually not needed.
        if (!trianglePlaneArray) {
            trianglePlaneArray = [];
        }

        if (!trianglePlaneArray[faceIndex]) {
            trianglePlaneArray[faceIndex] = new Plane(0, 0, 0, 0);
            //@ts-ignore
            trianglePlaneArray[faceIndex].copyFromPoints(p1, p2, p3);
        }

        var trianglePlane = trianglePlaneArray[faceIndex];
        //@ts-ignore
        if ((!hasMaterial) && !trianglePlane.isFrontFacingTo(collider._normalizedVelocity, 0)) {
            return;
        }
        //@ts-ignore
        var signedDistToTrianglePlane = trianglePlane.signedDistanceTo(collider._basePoint);
        //@ts-ignore
        var normalDotVelocity = Vector3.Dot(trianglePlane.normal, collider._velocity);

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

        collider._collisionPoint.copyFromFloats(0, 0, 0);

        var found = false;
        var t = 1.0;

        if (!embeddedInPlane) {
            //@ts-ignore
            collider._basePoint.subtractToRef(trianglePlane.normal, collider._planeIntersectionPoint);
            collider._velocity.scaleToRef(t0, collider._tempVector);
            collider._planeIntersectionPoint.addInPlace(collider._tempVector);
            //@ts-ignore
            if (collider.BabylonCollider._checkPointInTriangle(collider._planeIntersectionPoint, p1, p2, p3, trianglePlane.normal)) {
                found = true;
                t = t0;
                collider._collisionPoint.copyFrom(collider._planeIntersectionPoint);
            }
        }

        if (!found) {
            var velocitySquaredLength = collider._velocity.lengthSquared();

            var a = velocitySquaredLength;

            collider._basePoint.subtractToRef(p1, collider._tempVector);
            var b = 2.0 * (Vector3.Dot(collider._velocity, collider._tempVector));
            var c = collider._tempVector.lengthSquared() - 1.0;

            var lowestRoot = getLowestRoot(a, b, c, t);
            if (lowestRoot.found) {
                t = lowestRoot.root;
                found = true;
                collider._collisionPoint.copyFrom(p1);
            }

            collider._basePoint.subtractToRef(p2, collider._tempVector);
            b = 2.0 * (Vector3.Dot(collider._velocity, collider._tempVector));
            c = collider._tempVector.lengthSquared() - 1.0;

            lowestRoot = getLowestRoot(a, b, c, t);
            if (lowestRoot.found) {
                t = lowestRoot.root;
                found = true;
                collider._collisionPoint.copyFrom(p2);
            }

            collider._basePoint.subtractToRef(p3, collider._tempVector);
            b = 2.0 * (Vector3.Dot(collider._velocity, collider._tempVector));
            c = collider._tempVector.lengthSquared() - 1.0;

            lowestRoot = getLowestRoot(a, b, c, t);
            if (lowestRoot.found) {
                t = lowestRoot.root;
                found = true;
                collider._collisionPoint.copyFrom(p3);
            }

            p2.subtractToRef(p1, collider._edge);
            p1.subtractToRef(collider._basePoint, collider._baseToVertex);
            var edgeSquaredLength = collider._edge.lengthSquared();
            var edgeDotVelocity = Vector3.Dot(collider._edge, collider._velocity);
            var edgeDotBaseToVertex = Vector3.Dot(collider._edge, collider._baseToVertex);

            a = edgeSquaredLength * (-velocitySquaredLength) + edgeDotVelocity * edgeDotVelocity;
            b = edgeSquaredLength * (2.0 * Vector3.Dot(collider._velocity, collider._baseToVertex)) - 2.0 * edgeDotVelocity * edgeDotBaseToVertex;
            c = edgeSquaredLength * (1.0 - collider._baseToVertex.lengthSquared()) + edgeDotBaseToVertex * edgeDotBaseToVertex;

            lowestRoot = getLowestRoot(a, b, c, t);
            if (lowestRoot.found) {
                var f = (edgeDotVelocity * lowestRoot.root - edgeDotBaseToVertex) / edgeSquaredLength;

                if (f >= 0.0 && f <= 1.0) {
                    t = lowestRoot.root;
                    found = true;
                    collider._edge.scaleInPlace(f);
                    p1.addToRef(collider._edge, collider._collisionPoint);
                }
            }

            p3.subtractToRef(p2, collider._edge);
            p2.subtractToRef(collider._basePoint, collider._baseToVertex);
            edgeSquaredLength = collider._edge.lengthSquared();
            edgeDotVelocity = Vector3.Dot(collider._edge, collider._velocity);
            edgeDotBaseToVertex = Vector3.Dot(collider._edge, collider._baseToVertex);

            a = edgeSquaredLength * (-velocitySquaredLength) + edgeDotVelocity * edgeDotVelocity;
            b = edgeSquaredLength * (2.0 * Vector3.Dot(collider._velocity, collider._baseToVertex)) - 2.0 * edgeDotVelocity * edgeDotBaseToVertex;
            c = edgeSquaredLength * (1.0 - collider._baseToVertex.lengthSquared()) + edgeDotBaseToVertex * edgeDotBaseToVertex;
            lowestRoot = getLowestRoot(a, b, c, t);
            if (lowestRoot.found) {
                f = (edgeDotVelocity * lowestRoot.root - edgeDotBaseToVertex) / edgeSquaredLength;

                if (f >= 0.0 && f <= 1.0) {
                    t = lowestRoot.root;
                    found = true;
                    collider._edge.scaleInPlace(f);
                    p2.addToRef(collider._edge, collider._collisionPoint);
                }
            }

            p1.subtractToRef(p3, collider._edge);
            p3.subtractToRef(collider._basePoint, collider._baseToVertex);
            edgeSquaredLength = collider._edge.lengthSquared();
            edgeDotVelocity = Vector3.Dot(collider._edge, collider._velocity);
            edgeDotBaseToVertex = Vector3.Dot(collider._edge, collider._baseToVertex);

            a = edgeSquaredLength * (-velocitySquaredLength) + edgeDotVelocity * edgeDotVelocity;
            b = edgeSquaredLength * (2.0 * Vector3.Dot(collider._velocity, collider._baseToVertex)) - 2.0 * edgeDotVelocity * edgeDotBaseToVertex;
            c = edgeSquaredLength * (1.0 - collider._baseToVertex.lengthSquared()) + edgeDotBaseToVertex * edgeDotBaseToVertex;

            lowestRoot = getLowestRoot(a, b, c, t);
            if (lowestRoot.found) {
                f = (edgeDotVelocity * lowestRoot.root - edgeDotBaseToVertex) / edgeSquaredLength;

                if (f >= 0.0 && f <= 1.0) {
                    t = lowestRoot.root;
                    found = true;
                    collider._edge.scaleInPlace(f);
                    p3.addToRef(collider._edge, collider._collisionPoint);
                }
            }
        }

        if (found) {
            var distToCollision = t * collider._velocity.length();

            if (!collider.BabylonCollider.collisionFound || distToCollision < collider._nearestDistance) {
                if (!collider.BabylonCollider.intersectionPoint) {
                    collider.BabylonCollider.intersectionPoint = collider._collisionPoint.clone();
                } else {
                    collider.BabylonCollider.intersectionPoint.copyFrom(collider._collisionPoint);
                }
                collider._nearestDistance = distToCollision;
                collider.BabylonCollider.collisionFound = true;
                collider.BabylonCollider.collidedMesh = hostMesh;
            }
        }
    }

    public _trianglePlanes = [];
    public lastColliderWorldVectors: Vector3[] = [];
    public _checkCollision(collider: Collider): AbstractMesh {
        debugger;
       // console.log('_checkCollision', this.name, this._boundingInfo);
        // Bounding box test
        if (!this._boundingInfo || !collider._canDoCollision(this._boundingInfo.boundingSphere.centerWorld, this._boundingInfo.boundingSphere.radiusWorld, this._boundingInfo.boundingBox.minimumWorld, this._boundingInfo.boundingBox.maximumWorld)) {
            return this;
        }
        // Transformation matrix
        const collisionsScalingMatrix = new Matrix();
        const collisionsTransformMatrix = new Matrix();
        Matrix.ScalingToRef(1.0 / collider._radius.x, 1.0 / collider._radius.y, 1.0 / collider._radius.z, collisionsScalingMatrix);
        this.worldMatrixFromCache.multiplyToRef(collisionsScalingMatrix, collisionsTransformMatrix);


        ///

        if (!this.lastColliderWorldVertices || !this.lastColliderTransformMatrix.equals(collisionsTransformMatrix)) {
            console.debug('recalculating collision vertices on ', this.name);
            

            this.lastColliderTransformMatrix = collisionsTransformMatrix.clone();
            this.lastColliderWorldVertices = new SharedArrayBuffer(this.positionsBuffer.byteLength);
            let lastColliderVertices = new Float32Array(this.lastColliderWorldVertices);
            this._trianglePlanes = [];
            this.lastColliderWorldVectors = [];
            this.subMeshes[0]._trianglePlanes = [];
            lastColliderVertices.set(window.Wasm.calculatelastcolliderworldvertices(this.positions, collisionsTransformMatrix.m as Float32Array));
            for (let i = 0; i < lastColliderVertices.length / 3; i++) {
                this.lastColliderWorldVectors.push(new Vector3(lastColliderVertices[i * 3], lastColliderVertices[i * 3 + 1], lastColliderVertices[i * 3 + 2]));
            }

        }
        //let lastColliderVertices = new Float32Array(this.lastColliderWorldVertices);
        let indices = this.indices;
        /*let pp1 = BABYLON.Vector3.Zero();
                let pp2 = BABYLON.Vector3.Zero();
                let pp3 = BABYLON.Vector3.Zero();*/
        //console.log('submesh material?', !!this.subMeshes[0].getMaterial());
        let lenn = indices!.length;
      //  let timer = new Date().getTime();
        for (var i = 0; i < lenn; i += 3) {
            /* pp1.x = lastColliderVertices[indices[i * 3 ]];
             pp1.y = lastColliderVertices[indices[i * 3 + 1 ]];
             pp1.z = lastColliderVertices[indices[i * 3 + 2] ];
 
             pp2.x = lastColliderVertices[indices[(i + 1) * 3 ]];
             pp2.y = lastColliderVertices[indices[(i + 1) * 3 + 1 ]];
             pp2.z = lastColliderVertices[indices[(i + 1) * 3 + 2 ]];
 
             pp3.x = lastColliderVertices[indices[(i + 2) * 3 ]];
             pp3.y = lastColliderVertices[indices[(i + 2) * 3 + 1]];
             pp3.z = lastColliderVertices[indices[(i + 2) * 3 + 2]];*/


            var pp1 = this.lastColliderWorldVectors[indices![i]];
            var pp2 = this.lastColliderWorldVectors[indices![i + 1]];
            var pp3 = this.lastColliderWorldVectors[indices![i + 2]];

            //@ts-ignore
            collider._testTriangle(i, this.subMeshes[0]._trianglePlanes, pp3, pp2, pp1, !!this.subMeshes[0].getMaterial(), this);
            /* this._testTriangle({
                 //@ts-ignore
                 _normalizedVelocity: collider._normalizedVelocity,
                 //@ts-ignore
                 _basePoint: collider._basePoint,
                 //@ts-ignore
                 _velocity: collider._velocity,
                 //@ts-ignore
                 _collisionPoint: collider._collisionPoint,
                 //@ts-ignore
                 _planeIntersectionPoint: collider._planeIntersectionPoint,
                 //@ts-ignore
                 _tempVector: collider._tempVector,
                 BabylonCollider: collider,
                 //@ts-ignore
                 _edge: collider._edge,
                 //@ts-ignore
                 _baseToVertex: collider._baseToVertex,
             }, i, this._trianglePlanes, pp3, pp2, pp1, !!this.subMeshes[0].getMaterial(), this)*/
        }
       // console.log('collider check one took ', new Date().getTime() - timer, 'length ', lenn, 'collides?', collider.collisionFound)
      
        return this;
    }
    /*public intersectsPromise(ray: Ray, fastCheck?: boolean, trianglePredicate?: TrianglePickingPredicate): Promise<PickingInfo> {
        //console.log('intersectsPromise ', this.name);
        let bounding = this.getBoundingInfo();
        debugger;
        return TerraMesh.worker.message(this.uniqueId, 'intersects', [bounding.boundingBox, bounding.boundingSphere, ray.origin, ray.direction, fastCheck, trianglePredicate]);
    }*/

    public render(subMesh: any, enableAlphaMode: boolean, effectiveMeshReplacement?: AbstractMesh): Mesh {
        if (this._internalAbstractMeshDataInfo._isActiveIntermediate) {
            this._internalAbstractMeshDataInfo._isActiveIntermediate = false;
        } else {
            this._internalAbstractMeshDataInfo._isActive = false;
        }

        if (this._checkOcclusionQuery()) {
            return this;
        }

        //  @ts-ignore Managing instances
        var batch = this._getInstancesRenderList(subMesh._id, !!effectiveMeshReplacement);

        if (batch.mustReturn) {
            return this;
        }

        // Checking geometry state
        if (!this._geometry || !this._geometry.getVertexBuffers() || (!this._unIndexed && !this._geometry.getIndexBuffer())) {
            return this;
        }

        //@ts-ignore
        if (this._internalMeshDataInfo._onBeforeRenderObservable) {
            //@ts-ignore
            this._internalMeshDataInfo._onBeforeRenderObservable.notifyObservers(this);
        }

        var engine = this._scene.getEngine();
        var hardwareInstancedRendering = batch.hardwareInstancedRendering[subMesh._id];
        let instanceDataStorage = this._instanceDataStorage;
        let material = subMesh.getMaterial();

        if (!material) {
            console.log('no material ', this.name);
            return this;
        }
        
        // @ts-ignore Material
        if (!instanceDataStorage.isFrozen || !this._effectiveMaterial || this._effectiveMaterial !== material) {
            if (material._storeEffectOnSubMeshes) {
                if (!material.isReadyForSubMesh(this, subMesh, hardwareInstancedRendering)) {
                    return this;
                }
            } else if (!material.isReady(this, hardwareInstancedRendering)) {
                return this;
            }
            //@ts-ignore
            this._effectiveMaterial = material;
        }
        
        // Alpha mode
        if (enableAlphaMode) {
            //@ts-ignore
            engine.setAlphaMode(this._effectiveMaterial.alphaMode);
        }

        for (let step of this._scene._beforeRenderingMeshStage) {
            step.action(this, subMesh, batch);
        }

        var effect: Nullable<any>;
        //@ts-ignore
        if (this._effectiveMaterial._storeEffectOnSubMeshes) {
            effect = subMesh.effect;
        } else {
            //@ts-ignore
            effect = this._effectiveMaterial.getEffect();
        }

        if (!effect) {
            return this;
        }
        const effectiveMesh = effectiveMeshReplacement || this._effectiveMesh;

        var sideOrientation: Nullable<number>;
        //@ts-ignore
        if (!instanceDataStorage.isFrozen && this._effectiveMaterial.backFaceCulling) {
            let mainDeterminant = effectiveMesh._getWorldMatrixDeterminant();
            sideOrientation = this.overrideMaterialSideOrientation;
            if (sideOrientation == null) {
                //@ts-ignore
                sideOrientation = this._effectiveMaterial.sideOrientation;
            }
            if (mainDeterminant < 0) {
                sideOrientation = (sideOrientation === Material.ClockWiseSideOrientation ? Material.CounterClockWiseSideOrientation : Material.ClockWiseSideOrientation);
            }
            instanceDataStorage.sideOrientation = sideOrientation!;
        } else {
            sideOrientation = instanceDataStorage.sideOrientation;
        }
        //@ts-ignore
        var reverse = this._effectiveMaterial._preBind(effect, sideOrientation);
        //@ts-ignore
        if (this._effectiveMaterial.forceDepthWrite) {
            engine.setDepthWrite(true);
        }
        
        // Bind
        //@ts-ignore
        var fillMode = scene.forcePointsCloud ? BABYLON.Material.PointFillMode : (scene.forceWireframe ? BABYLON.Material.WireFrameFillMode : this._effectiveMaterial.fillMode);
        //@ts-ignore
        if (this._internalMeshDataInfo._onBeforeBindObservable) {
            //@ts-ignore
            this._internalMeshDataInfo._onBeforeBindObservable.notifyObservers(this);
        }

        if (!hardwareInstancedRendering) { // Binding will be done later because we need to add more info to the VB
            this._bind(subMesh, effect, fillMode);
        }

        var world = effectiveMesh.getWorldMatrix();
        //@ts-ignore
        if (this._effectiveMaterial._storeEffectOnSubMeshes) {
            //@ts-ignore
            this._effectiveMaterial.bindForSubMesh(world, this, subMesh);
        } else {
            //@ts-ignore
            this._effectiveMaterial.bind(world, this);
        }
        //@ts-ignore
        if (!this._effectiveMaterial.backFaceCulling && this._effectiveMaterial.separateCullingPass) {
            //@ts-ignore
            engine.setState(true, this._effectiveMaterial.zOffset, false, !reverse);
            //@ts-ignore
            this._processRendering(subMesh, effect, fillMode, batch, hardwareInstancedRendering, this._onBeforeDraw, this._effectiveMaterial);
            //@ts-ignore
            engine.setState(true, this._effectiveMaterial.zOffset, false, reverse);
        }
            // Draw
            //@ts-ignore
         this._processRendering(subMesh, effect, fillMode, batch, hardwareInstancedRendering, this._onBeforeDraw, this._effectiveMaterial);
        

        // Unbind
        //@ts-ignore
        this._effectiveMaterial.unbind();
        for (let step of this._scene._afterRenderingMeshStage) {
            step.action(this, subMesh, batch);
        }
        //@ts-ignore
        if (this._internalMeshDataInfo._onAfterRenderObservable) {
            //@ts-ignore
            this._internalMeshDataInfo._onAfterRenderObservable.notifyObservers(this);
        }
        return this;
    }

}
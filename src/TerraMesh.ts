import { WorkerThread, WorkerReturn } from "./WorkerThread.js";

export class TerraMesh extends BABYLON.Mesh {
    public positionsBuffer: SharedArrayBuffer;
    public positionsView: DataView;
    public positions: Float32Array;

    public indices: Uint32Array;
    public indicesBuffer: SharedArrayBuffer;

    public normalsBuffer: SharedArrayBuffer | null;
    public normals: Float32Array | null;
    public normalsView: DataView | null;

    static worker = new WorkerThread('/webworkers/mesh.js');

    constructor(name: string, indices: Uint32Array, positions: Float32Array, protected wasm, normals?: Float32Array) {
        super(name);
        this.indicesBuffer = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * indices.length);
        this.indices = new Uint32Array(this.indicesBuffer);
        this.indices.set(indices);



        this.positionsBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * positions.length);
        this.positions = new Float32Array(this.positionsBuffer);
        this.positions.set(positions);
        this.positionsView = new DataView(this.positionsBuffer);


        if (typeof (normals) !== 'undefined') {
            this.normalsBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * normals.length)
            this.normals = new Float32Array(this.normalsBuffer)
            this.normals.set(normals);
            this.normalsView = new DataView(this.normalsBuffer);

            TerraMesh.worker.message(WorkerReturn.Promise, 'init',
                {
                    meshId: this.uniqueId,
                    positions: this.positionsBuffer,
                    indices: this.indicesBuffer,
                    normals: this.normalsBuffer,
                });
        } else {
            TerraMesh.worker.message(WorkerReturn.Promise, 'init',
                {
                    meshId: this.uniqueId,
                    positions: this.positionsBuffer,
                    indices: this.indicesBuffer,
                });
        }

    }
    public _checkCollision(collider: BABYLON.Collider): BABYLON.AbstractMesh {

        // Bounding box test
        if (!this._boundingInfo || !collider._canDoCollision(this._boundingInfo.boundingSphere.centerWorld, this._boundingInfo.boundingSphere.radiusWorld, this._boundingInfo.boundingBox.minimumWorld, this._boundingInfo.boundingBox.maximumWorld)) {
            return this;
        }

        // console.log('_checkCollision');
        // Transformation matrix
        const collisionsScalingMatrix = new BABYLON.Matrix();
        const collisionsTransformMatrix = new BABYLON.Matrix();
        BABYLON.Matrix.ScalingToRef(1.0 / collider._radius.x, 1.0 / collider._radius.y, 1.0 / collider._radius.z, collisionsScalingMatrix);
        this.worldMatrixFromCache.multiplyToRef(collisionsScalingMatrix, collisionsTransformMatrix);
        //this._processCollisionsForSubMeshes(collider, collisionsTransformMatrix);
        //_processCollisionsForSubMeshes(collider: Collider, transformMatrix: Matrix): AbstractMesh {
        const subMeshes = this._scene.getCollidingSubMeshCandidates(this, collider);
        const len = subMeshes.length;

        for (var index = 0; index < len; index++) {
            var subMesh = subMeshes.data[index];

            // Bounding test
            if (len > 1 && !subMesh._checkCollision(collider)) {
                continue;
            }
            //this._collideForSubMesh(subMesh, collisionsTransformMatrix, collider);
            //  public _collideForSubMesh(subMesh: SubMesh, transformMatrix: Matrix, collider: Collider): AbstractMesh {
            //this._generatePointsArray();


            // Transformation
            if (!subMesh._lastColliderWorldVertices || !subMesh._lastColliderTransformMatrix!.equals(collisionsTransformMatrix)) {
                console.log('recalculating collision vertices');
                subMesh._lastColliderTransformMatrix = collisionsTransformMatrix.clone();
                subMesh._lastColliderWorldVertices = [];
                subMesh._trianglePlanes = [];
                let transformed = this.wasm.calculatelastcolliderworldvertices(this.positions, collisionsTransformMatrix.m as Float32Array);
                for (let i = 0; i < transformed.length / 3; i++) {
                    subMesh._lastColliderWorldVertices.push(new BABYLON.Vector3(transformed[i * 3], transformed[i * 3 + 1], transformed[i * 3+2]));
                }
               /* for (let i = 0; i < this.positions.length / 3; i++) {
                    let transformed = this.wasm.transformcoordinatesfromfloats(this.positions[i * 3], this.positions[i * 3 + 1] + 20, this.positions[i * 3 + 2], collisionsTransformMatrix.m as Float32Array)
                    subMesh._lastColliderWorldVertices.push(new BABYLON.Vector3(transformed[0], transformed[1], transformed[2]));
                }*/
            }

            // Collide

            //collider._collide(subMesh._trianglePlanes, subMesh._lastColliderWorldVertices, (<IndicesArray>this.getIndices()), subMesh.indexStart, subMesh.indexStart + subMesh.indexCount, subMesh.verticesStart, !!subMesh.getMaterial(), this);
            //  public _collide(trianglePlaneArray: Array<Plane>, pts: Vector3[], indices: IndicesArray, indexStart: number, indexEnd: number, decal: number, hasMaterial: boolean, hostMesh: AbstractMesh): void {
            //let indices = (<IndicesArray>this.getIndices());
            let indices = this.indices;
            for (var i = subMesh.indexStart; i < subMesh.indexStart + subMesh.indexCount; i += 3) {
                var p1 = subMesh._lastColliderWorldVertices[indices[i] - subMesh.verticesStart];
                var p2 = subMesh._lastColliderWorldVertices[indices[i + 1] - subMesh.verticesStart];
                var p3 = subMesh._lastColliderWorldVertices[indices[i + 2] - subMesh.verticesStart];
                //@ts-ignore
                collider._testTriangle(i, subMesh._trianglePlanes, p3, p2, p1, !!subMesh.getMaterial(), collider);
            }
            //return this;
            // }

        }
        //}
        return this;
    }
    public intersectsPromise(ray: BABYLON.Ray, fastCheck?: boolean, trianglePredicate?: BABYLON.TrianglePickingPredicate): Promise<BABYLON.PickingInfo> {
        let bounding = this.getBoundingInfo();
        return TerraMesh.worker.message(WorkerReturn.Promise, 'intersects',
            {
                meshId: this.uniqueId,
                args: [bounding.boundingBox, bounding.boundingSphere, ray.origin, ray.direction, fastCheck, trianglePredicate]
            });
    }
    public render(subMesh: BABYLON.SubMesh, enableAlphaMode: boolean, effectiveMeshReplacement?: BABYLON.AbstractMesh): BABYLON.Mesh {
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
        (function () {
            if (this._internalMeshDataInfo._onBeforeRenderObservable) {
                this._internalMeshDataInfo._onBeforeRenderObservable.notifyObservers(this);
            }
        }).bind(this)()

        var engine = this._scene.getEngine();
        var hardwareInstancedRendering = batch.hardwareInstancedRendering[subMesh._id];
        let instanceDataStorage = this._instanceDataStorage;

        let material = subMesh.getMaterial();

        if (!material) {
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

        var effect: Nullable<BABYLON.Effect>;
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
                sideOrientation = (sideOrientation === BABYLON.Material.ClockWiseSideOrientation ? BABYLON.Material.CounterClockWiseSideOrientation : BABYLON.Material.ClockWiseSideOrientation);
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
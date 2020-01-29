import { WorkerThread, WorkerReturn } from "./WorkerThread.js";

export class TerraMesh extends BABYLON.Mesh {
    public positionsBuffer: SharedArrayBuffer;
    public positionsView: DataView;
    public positions: Float32Array;

    public indices: Uint32Array;
    public indicesBuffer: SharedArrayBuffer;

    public normalsBuffer: SharedArrayBuffer;
    public normals: Float32Array;
    public normalsView: DataView;

    static worker = new WorkerThread('/webworkers/mesh.js');

    constructor(name: string, indices: Uint32Array, positions: Float32Array, normals: Float32Array, protected wasm) {
        super(name);
        this.indicesBuffer = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * indices.length);
        this.indices = new Uint32Array(this.indicesBuffer);
        this.indices.set(indices);

        this.normalsBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * normals.length)
        this.normals = new Float32Array(this.normalsBuffer)
        this.normals.set(normals);
        this.normalsView = new DataView(this.normalsBuffer);


        this.positionsBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * positions.length);
        this.positions = new Float32Array(this.positionsBuffer);
        this.positions.set(positions);
        this.positionsView = new DataView(this.positionsBuffer);

        TerraMesh.worker.message(WorkerReturn.Promise, 'init',
            {
                meshId: this.uniqueId,
                positions: this.positionsBuffer,
                indices: this.indicesBuffer,
                normals: this.normalsBuffer,
            });
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
}
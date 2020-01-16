import { WorkerThread, WorkerReturn } from "../WorkerThread.js";

interface TerrainMap {
    width: number,
    height: number,
    indices: Uint32Array,
    normals: Float32Array,
    positions: Float32Array,
    uvs: Float32Array,
    texture: Blob
}
export class Terrain extends BABYLON.GroundMesh {
    public slopeArrBuffer: SharedArrayBuffer;
    public facet1ArrBuffer: SharedArrayBuffer;
    public facet2ArrBuffer: SharedArrayBuffer;

    public slopeArr: Int16Array;
    public facet1Arr: Float32Array;
    public facet2Arr: Float32Array;

    private ratioX: number;
    private ratioY: number;

    public positionsBuffer: SharedArrayBuffer;
    public positionsView: DataView;

    public indices: Uint32Array;
    public indicesBuffer: SharedArrayBuffer;

    public normalsBuffer: SharedArrayBuffer;
    public normals: Float32Array;
    public normalsView: DataView;

    public positions: Float32Array;
    public uvs: Float32Array;

    public worker = new WorkerThread('/webworkers/terrainWorker.js');

    public inited: Promise<any>;

    //public ground: BABYLON.GroundMesh;
    constructor(private vdata: TerrainMap, private scene: BABYLON.Scene) {
        super('ground', scene);

        this.indicesBuffer = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * vdata.indices.length);
        this.indices = new Uint32Array(this.indicesBuffer);
        this.indices.set(vdata.indices);

        this.normalsBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * vdata.normals.length)

        this.normals = new Float32Array(this.normalsBuffer)
        this.normals.set(vdata.normals);

        this.normalsView = new DataView(this.normalsBuffer);

        this.positionsBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * vdata.positions.length);
        this.positions = new Float32Array(this.positionsBuffer);
        this.positions.set(vdata.positions);

        this.positionsView = new DataView(this.positionsBuffer);


        this.uvs = vdata.uvs;

        this._subdivisionsX = 250;
        this._subdivisionsY = 250;

        this.slopeArrBuffer = new SharedArrayBuffer(Int16Array.BYTES_PER_ELEMENT * this._subdivisionsX * this._subdivisionsY)
        this.facet1ArrBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this._subdivisionsX * this._subdivisionsY * 4);
        this.facet2ArrBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this._subdivisionsX * this._subdivisionsY * 4);
        this.slopeArr = new Int16Array(this.slopeArrBuffer);
        this.facet1Arr = new Float32Array(this.facet1ArrBuffer);
        this.facet2Arr = new Float32Array(this.facet2ArrBuffer);



        this._width = vdata.width;
        this._height = vdata.height;
        this._maxX = this._width / 2.0;
        this._maxZ = this._height / 2.0;
        this._minX = -this._maxX;
        this._minZ = -this._maxZ;

        this.ratioX = this._subdivisionsX / this._width;
        this.ratioY = this._subdivisionsY / this._height;

        var vertexData = new BABYLON.VertexData();

        vertexData.indices = this.indices;
        vertexData.positions = this.positions;
        vertexData.normals = this.normals;
        vertexData.uvs = this.uvs;

        vertexData.applyToMesh(this, true);
        let boundingInfo = this.subMeshes[0].getBoundingInfo();

        this.inited = this.worker.message(WorkerReturn.Promise, 'init',
            {
                positions: this.positionsBuffer,
                indices: this.indicesBuffer,
                normals: this.normalsBuffer,
                slopeArr: this.slopeArrBuffer,
                facet1Arr: this.facet1ArrBuffer,
                facet2Arr: this.facet2ArrBuffer,
                subdivisionsX: this._subdivisionsX,
                subdivisionsY: this._subdivisionsY,
                boundingBox: boundingInfo.boundingBox,
                boundingSphere: boundingInfo.boundingSphere
            });
        this._setReady(true);



      //  this.worker.message(WorkerReturn.noReturn, 'createHeights', {});
    /**********************/
        //this.createHeights();
      /*  
        let avarages = {
            heights1: [],
            heights2: [],
            heights3: [],
            heights4: []

        };
        for (let i = 0; i < 30; i++) {
            let timed = new Date().getTime();
            this.createHeights(positionsBuffer);
            avarages['heights1'].push(new Date().getTime() - timed)
        }
        for (let key in avarages) {
            avarages[key].shift(); avarages[key].shift(); avarages[key].shift();
            console.log(key, avarages[key].reduce((a, b) => a + b, 0)/27)
        }
        console.log(avarages);*/
    }
  
    //BABYLON 4103
    //ARRAY 2800 -> 1897 -> 1720 -> 1708 -> 1631
    //Dataview 6100
    //pure array  848 -> 763

   /* public _collideForSubMesh(subMesh: BABYLON.SubMesh, transformMatrix: BABYLON.Matrix, collider: BABYLON.Collider): BABYLON.AbstractMesh {
        this._generatePointsArray();

        if (!this._positions) {
            return this;
        }

        // Transformation
        if (!subMesh._lastColliderWorldVertices || !subMesh._lastColliderTransformMatrix!.equals(transformMatrix)) {
            subMesh._lastColliderTransformMatrix = transformMatrix.clone();
            subMesh._lastColliderWorldVertices = [];
            subMesh._trianglePlanes = [];
            var start = subMesh.verticesStart;
            var end = (subMesh.verticesStart + subMesh.verticesCount);
            for (var i = start; i < end; i++) {
                subMesh._lastColliderWorldVertices.push(Vector3.TransformCoordinates(this.positions[i], transformMatrix));

                const m = transformation.m;
                var rx = x * m[0] + y * m[4] + z * m[8] + m[12];
                var ry = x * m[1] + y * m[5] + z * m[9] + m[13];
                var rz = x * m[2] + y * m[6] + z * m[10] + m[14];
                var rw = 1 / (x * m[3] + y * m[7] + z * m[11] + m[15]);

                result.x = rx * rw;
                result.y = ry * rw;
                result.z = rz * rw;


            }
        }

        // Collide
        collider._collide(subMesh._trianglePlanes, subMesh._lastColliderWorldVertices, (<IndicesArray>this.getIndices()), subMesh.indexStart, subMesh.indexStart + subMesh.indexCount, subMesh.verticesStart, !!subMesh.getMaterial(), this);
        return this;
    }*/
    getHeightAtCoordinates(x: number, z: number): number {
        let facet: Float32Array;
        let col = ((x + this._maxX) * this.ratioX)|0;
        let row = (-(z + this._maxZ) * this.ratioY + this._subdivisionsY) | 0;
        let pos: number = row * this._subdivisionsX + col;
        try {
            if (z < -1 * x + this.slopeArr[pos]) {
                facet = new Float32Array(this.facet1Arr.buffer, pos << 4, 4) // << 4 =  4 *  Float32Array.BYTES_PER_ELEMENT
            }
            else {
                facet = new Float32Array(this.facet2Arr.buffer, pos << 4, 4) // << 4 = 4 *  Float32Array.BYTES_PER_ELEMENT
            }
        } catch (e) {
            if (e instanceof RangeError) {
                console.warn('Invalid coordinate to getHeightAtCoordinates '+ x+ ' '+z);
                return this.getHeightAtCoordinates(Math.min(Math.max(x, this._minX+1), this._maxX-1), Math.min(Math.max(z, this._minZ+1), this._maxZ-1))
            }
            throw (e);
        }
        return -(facet[0] * x + facet[2] * z + facet[3]) / facet[1];
    }

    public _checkCollision(collider: BABYLON.Collider): BABYLON.AbstractMesh {
        console.log('_checkCollision');
        // Bounding box test
        if (!this._boundingInfo || !this._boundingInfo._checkCollision(collider)) {
            return this;
        }

        // Transformation matrix
        const collisionsScalingMatrix = new BABYLON.Matrix();
        const collisionsTransformMatrix = new BABYLON.Matrix();
        BABYLON.Matrix.ScalingToRef(1.0 / collider._radius.x, 1.0 / collider._radius.y, 1.0 / collider._radius.z, collisionsScalingMatrix);
        this.worldMatrixFromCache.multiplyToRef(collisionsScalingMatrix, collisionsTransformMatrix);
        this._processCollisionsForSubMeshes(collider, collisionsTransformMatrix);
        return this;
    }
    public intersects(ray: BABYLON.Ray, fastCheck?: boolean, trianglePredicate?: BABYLON.TrianglePickingPredicate): BABYLON.PickingInfo {
        console.log('terrain intersect')
        //@ts-ignore
        return new Promise((res, rej) => {
            res(super.intersects(ray, fastCheck, trianglePredicate));
        });
        
        /*
        this.worker.message(WorkerReturn.Promise, 'intersects',
            {
                ray: ray,
                fastCheck: fastCheck,
                trianglePredicate: trianglePredicate
            });
        debugger;
        var pickingInfo = new BABYLON.PickingInfo();
        
        const intersectionThreshold = this.getClassName() === "InstancedLinesMesh" || this.getClassName() === "LinesMesh" ? (this as any).intersectionThreshold : 0;
        const boundingInfo = this._boundingInfo;
        if (!this.subMeshes || !boundingInfo || !ray.intersectsSphere(boundingInfo.boundingSphere, intersectionThreshold) || !ray.intersectsBox(boundingInfo.boundingBox, intersectionThreshold)) {
            return pickingInfo;
        }

        if (!this._generatePointsArray()) {
            return pickingInfo;
        }

        var intersectInfo: Nullable<BABYLON.IntersectionInfo> = null;

        var subMeshes = this._scene.getIntersectingSubMeshCandidates(this, ray);
        //console.log(subMeshes);
        var len: number = subMeshes.length;
        let p0 = new BABYLON.Vector3();
        let p1 = new BABYLON.Vector3();
        let p2 = new BABYLON.Vector3();
        for (var index = 0; index < len; index++) {
            var subMesh = subMeshes.data[index];

            // Bounding test
            if (len > 1 && !subMesh.canIntersects(ray)) {
                continue;
            }

            //var currentIntersectInfo = subMesh.intersects(ray, (<BABYLON.Vector3[]>this._positions),(<IndicesArray>this.getIndices()), fastCheck,trianglePredicate);
            //var currentIntersectInfo = subMesh._intersectTriangles(ray, positions, indices, fastCheck, trianglePredicate);
            let currentIntersectInfo = null;
            //let indices = <IndicesArray>this.getIndices();
           // let positions = <BABYLON.Vector3[]>this._positions;
           // console.log(subMesh);
            let count = subMesh.indexStart + subMesh.indexCount;
            for (var index = subMesh.indexStart; index < count; index += 3) {

                p0.x = this.positions[this.indices[index] * 3]
                p0.y = this.positions[this.indices[index] * 3 + 1]
                p0.z = this.positions[this.indices[index] * 3 + 2]

                p1.x = this.positions[this.indices[index+1] * 3]
                p1.y = this.positions[this.indices[index+1] * 3 + 1]
                p1.z = this.positions[this.indices[index+1] * 3 + 2]

                p2.x = this.positions[this.indices[index+2] * 3]
                p2.y = this.positions[this.indices[index+2] * 3 + 1]
                p2.z = this.positions[this.indices[index+2] * 3 + 2]

                if (trianglePredicate && !trianglePredicate(p0, p1, p2, ray)) {
                    continue;
                }

                let subcurrentIntersectInfo = ray.intersectsTriangle(p0, p1, p2);

                if (subcurrentIntersectInfo) {
                    if (subcurrentIntersectInfo.distance < 0) {
                        continue;
                    }

                    if (fastCheck || !currentIntersectInfo || subcurrentIntersectInfo.distance < currentIntersectInfo.distance) {
                        currentIntersectInfo = subcurrentIntersectInfo;
                        currentIntersectInfo.faceId = index / 3;

                        if (fastCheck) {
                            break;
                        }
                    }
                }
            }

            if (currentIntersectInfo) {
                if (fastCheck || !intersectInfo || currentIntersectInfo.distance < intersectInfo.distance) {
                    intersectInfo = currentIntersectInfo;
                    intersectInfo.subMeshId = index;

                    if (fastCheck) {
                        break;
                    }
                }
            }
        }

        if (intersectInfo) {
            // Get picked point
            const world = this.getWorldMatrix();
            const direction = new BABYLON.Vector3();
            ray.direction.scaleToRef(intersectInfo.distance, direction);
            const worldDirection = BABYLON.Vector3.TransformNormal(direction, world);
            const pickedPoint = worldDirection.addInPlace(ray.origin);

            // Return result
            pickingInfo.hit = true;
            pickingInfo.distance = BABYLON.Vector3.Distance(ray.origin, pickedPoint);
            pickingInfo.pickedPoint = pickedPoint;
            pickingInfo.pickedMesh = this;
            pickingInfo.bu = intersectInfo.bu || 0;
            pickingInfo.bv = intersectInfo.bv || 0;
            pickingInfo.faceId = intersectInfo.faceId;
            pickingInfo.subMeshId = intersectInfo.subMeshId;
            return pickingInfo;
        }

        return pickingInfo;*/
    }

}
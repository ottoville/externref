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
    public slopeArr: Int16Array;
    public facet1Arr: Float32Array;
    public facet2Arr: Float32Array;

    private ratioX: number;
    private ratioY: number;

    public positionsBuffer: SharedArrayBuffer;
    public positionsView: DataView;

    public indices: Uint32Array;
    public indicesBuffer: SharedArrayBuffer;
    public normals: Float32Array;
    public normalsView: DataView;

    public positions: Float32Array;
    public uvs: Float32Array;

    //public ground: BABYLON.GroundMesh;
    constructor(private vdata: TerrainMap, private scene: BABYLON.Scene) {
        super('ground', scene);
        this.indicesBuffer = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * vdata.indices.length);
        this.indices = new Uint32Array(this.indicesBuffer);
        this.indices.set(vdata.indices);
        this.normals = vdata.normals;
        this.normalsView = new DataView(this.normals.buffer);

        this.positionsBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * vdata.positions.length);
        this.positions = new Float32Array(this.positionsBuffer);
        this.positions.set(vdata.positions);

       // this.positions = vdata.positions;
        //this.positionsBuffer = this.positions.buffer;

        this.positionsView = new DataView(this.positionsBuffer);
        this.uvs = vdata.uvs;

        this._subdivisionsX = 250;
        this._subdivisionsY = 250;

        this.slopeArr = new Int16Array(this._subdivisionsX * this._subdivisionsY * 2);
        this.facet1Arr = new Float32Array(this._subdivisionsX * this._subdivisionsY * 4);
        this.facet2Arr = new Float32Array(this._subdivisionsX * this._subdivisionsY * 4);


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
        this._setReady(true);



    /**********************/
        this.createHeights();
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
    createHeights() {
        //native: 95
        //212
        let v1arr = [];
        let v2arr = [];
        let v1v2 = new BABYLON.Vector3();
        let v1v3 = new BABYLON.Vector3();
        let v1v4 = new BABYLON.Vector3();
        let norm1 = new BABYLON.Vector3();
        let norm2 = new BABYLON.Vector3();
        let i = 0;
        let j = 0;
        let k = 0;
        let cd = 0;     // 2D slope coefficient : z = cd * x + h
        let h = 0;
        let d1 = 0;     // facet plane equation : ax + by + cz + d = 0
        let d2 = 0;
        let positionsView = this.positionsView;
        for (var row = 0; row < this._subdivisionsY; row++) {
            for (var col = 0; col < this._subdivisionsX; col++) {
                i = col * 3;
                j = row * (this._subdivisionsX + 1) * 3;
                k = (row + 1) * (this._subdivisionsX + 1) * 3;

                v1arr = [
                    positionsView.getFloat32((j + i) << 2, true),
                    positionsView.getFloat32((j + i + 1) << 2, true),
                    positionsView.getFloat32((j + i +2) << 2, true),
                ]
                v2arr = [
                    positionsView.getFloat32((j + i + 3) << 2, true),
                    positionsView.getFloat32((j + i + 4) << 2, true),
                    positionsView.getFloat32((j + i + 5) << 2, true),
                ]
                v1v3.x = positionsView.getFloat32((k + i + 0) << 2, true) - v1arr[0];
                v1v3.y = positionsView.getFloat32((k + i + 1) << 2, true) - v1arr[1];
                v1v3.z = positionsView.getFloat32((k + i + 2) << 2, true) - v1arr[2];
                v1v4.x = positionsView.getFloat32((k + i + 3) << 2, true) - v1arr[0];
                v1v4.y = positionsView.getFloat32((k + i + 4) << 2, true) - v1arr[1];
                v1v4.z = positionsView.getFloat32((k + i + 5) << 2, true) - v1arr[2];

                cd = (positionsView.getFloat32((k + i + 2) << 2, true) - v1arr[2]) / (positionsView.getFloat32((k + i + 3) << 2, true) - v1arr[0]);
                h = v1arr[2] - cd * v1arr[0];             // v1 belongs to the slope

                // facet equations :
                // we compute each facet normal vector
                // the equation of the facet plane is : norm.x * x + norm.y * y + norm.z * z + d = 0
                // we compute the value d by applying the equation to v1 which belongs to the plane
                // then we store the facet equation in a Vector4

                v1v2.x = v2arr[0] - v1arr[0];
                v1v2.y = v2arr[1] - v1arr[1];
                v1v2.z = v2arr[2] - v1arr[2];
                // v2.subtractToRef(v1, v1v2);
                //v3.subtractToRef(v1, v1v3);

                //v4.subtractToRef(v1, v1v4);


                norm1.x = v1v4.y * v1v3.z - v1v4.z * v1v3.y;
                norm1.y = v1v4.z * v1v3.x - v1v4.x * v1v3.z;
                norm1.z = v1v4.x * v1v3.y - v1v4.y * v1v3.x;

                //BABYLON.Vector3.CrossToRef(v1v4, v1v3, norm1);  // caution : CrossToRef uses the Tmp class

                norm2.x = v1v2.y * v1v4.z - v1v2.z * v1v4.y;
                norm2.y = v1v2.z * v1v4.x - v1v2.x * v1v4.z;
                norm2.z = v1v2.x * v1v4.y - v1v2.y * v1v4.x;
                // BABYLON.Vector3.CrossToRef(v1v2, v1v4, norm2);
                norm1.normalize();
                norm2.normalize();
                d1 = -(norm1.x * v1arr[0] + norm1.y * v1arr[1] + norm1.z * v1arr[2]);
                d2 = -(norm2.x * v2arr[0] + norm2.y * v2arr[1] + norm2.z * v2arr[2]);
                this.slopeArr.set([cd, h], (row * this._subdivisionsX + col) * 2);
                this.facet1Arr.set([norm1.x, norm1.y, norm1.z, d1], (row * this._subdivisionsX + col) * 4)
                this.facet2Arr.set([norm2.x, norm2.y, norm2.z, d2], (row * this._subdivisionsX + col) * 4)
            }
        }
    }
  
    //BABYLON 4103
    //ARRAY 2800 -> 1897 -> 1720 -> 1708 -> 1631
    //Dataview 6100
    //pure array  848 -> 763


    getHeightAtCoordinates(x: number, z: number): number {
        let facet: Float32Array;
        let col = ((x + this._maxX) * this.ratioX)|0;
        let row = (-(z + this._maxZ) * this.ratioY + this._subdivisionsY) | 0;
        let pos: number = row * this._subdivisionsX + col;
        try {
            if (z < this.slopeArr[pos << 1] * x + this.slopeArr[(pos << 1) + 1])
                facet = new Float32Array(this.facet1Arr.buffer, pos << 4, 4) // << 4 =  4 *  Float32Array.BYTES_PER_ELEMENT
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
    public intersects(ray: BABYLON.Ray, fastCheck?: boolean, trianglePredicate?: BABYLON.TrianglePickingPredicate): BABYLON.PickingInfo {
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

        return pickingInfo;
    }

}
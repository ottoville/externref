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
    private ratioY:number;

    //public ground: BABYLON.GroundMesh;
    constructor(private vdata: TerrainMap, private scene: BABYLON.Scene) {
        super('ground', scene);
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

        vertexData.indices = vdata.indices;
        vertexData.positions = vdata.positions;
        vertexData.normals = vdata.normals;
        vertexData.uvs = vdata.uvs;

        vertexData.applyToMesh(this, true);
        this._setReady(true);



        /**********************/

        let v1 = new BABYLON.Vector3();
        let v2 = new BABYLON.Vector3();
        let v3 = new BABYLON.Vector3();
        let v4 = new BABYLON.Vector3();
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

        for (var row = 0; row < this._subdivisionsY; row++) {
            for (var col = 0; col < this._subdivisionsX; col++) {
                i = col * 3;
                j = row * (this._subdivisionsX + 1) * 3;
                k = (row + 1) * (this._subdivisionsX + 1) * 3;
                v1.x = vdata.positions[j + i];
                v1.y = vdata.positions[j + i + 1];
                v1.z = vdata.positions[j + i + 2];

                v2.x = vdata.positions[j + i + 3];
                v2.y = vdata.positions[j + i + 4];
                v2.z = vdata.positions[j + i + 5];

                v3.x = vdata.positions[k + i];
                v3.y = vdata.positions[k + i + 1];
                v3.z = vdata.positions[k + i + 2];

                v4.x = vdata.positions[k + i + 3];
                v4.y = vdata.positions[k + i + 4];
                v4.z = vdata.positions[k + i + 5];

                // 2D slope V1V4
                cd = (v4.z - v1.z) / (v4.x - v1.x);
                h = v1.z - cd * v1.x;             // v1 belongs to the slope

                // facet equations :
                // we compute each facet normal vector
                // the equation of the facet plane is : norm.x * x + norm.y * y + norm.z * z + d = 0
                // we compute the value d by applying the equation to v1 which belongs to the plane
                // then we store the facet equation in a Vector4
                v2.subtractToRef(v1, v1v2);
                v3.subtractToRef(v1, v1v3);
                v4.subtractToRef(v1, v1v4);
                BABYLON.Vector3.CrossToRef(v1v4, v1v3, norm1);  // caution : CrossToRef uses the Tmp class
                BABYLON.Vector3.CrossToRef(v1v2, v1v4, norm2);
                norm1.normalize();
                norm2.normalize();
                d1 = -(norm1.x * v1.x + norm1.y * v1.y + norm1.z * v1.z);
                d2 = -(norm2.x * v2.x + norm2.y * v2.y + norm2.z * v2.z);
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
}
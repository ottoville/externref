import { WorkerThread, WorkerReturn } from "../WorkerThread.js";
import { TerraMesh } from "../TerraMesh.js";


interface TerrainMap {
    width: number,
    height: number,
    indices: Uint32Array,
    normals: Float32Array,
    positions: Float32Array,
    uvs: Float32Array,
    texture: Blob
}
export class Terrain extends TerraMesh {

    public _subdivisionsX: number;
    public _subdivisionsY: number;

    public _width: number;
    public _height: number;
    public _minX: number;
    public _maxX: number;
    public _minZ: number;
    public _maxZ: number;


    public slopeArrBuffer: SharedArrayBuffer;
    public facet1ArrBuffer: SharedArrayBuffer;
    public facet2ArrBuffer: SharedArrayBuffer;

    public slopeArr: Int16Array;
    public facet1Arr: Float32Array;
    public facet2Arr: Float32Array;

    private ratioX: number;
    private ratioY: number;
    
    public uvs: Float32Array;

    public terrainWorker = new WorkerThread('/webworkers/terrainWorker.js');

    public inited: Promise<any>;

    //public ground: BABYLON.GroundMesh;
    constructor(private vdata: TerrainMap, private scene: BABYLON.Scene, wasm) {
        super('ground',vdata.indices, vdata.positions, vdata.normals, wasm);
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

        this.inited = this.terrainWorker.message(WorkerReturn.Promise, 'init',
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

        console.log('terrain bounding');
        console.log(this.getBoundingInfo());

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
        
        // Bounding box test
        

        //if (!this._boundingInfo || !this._boundingInfo._checkCollision(collider)) {

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
                    for (let i = 0; i < this.positions.length / 3; i++) {
                        let transformed = this.wasm.transformcoordinatesfromfloats(this.positions[i * 3], this.positions[i * 3 + 1] + 20, this.positions[i * 3 + 2], collisionsTransformMatrix.m as Float32Array)
                        subMesh._lastColliderWorldVertices.push(new BABYLON.Vector3(transformed[0], transformed[1], transformed[2]))
                    }
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
}
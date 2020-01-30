import { WorkerThread, WorkerReturn } from "../WorkerThread.js";
import { TerraMesh } from "../TerraMesh.js";
//@ts-ignore
import glslangModule from 'https://unpkg.com/@webgpu/glslang@0.0.8/dist/web-devel/glslang.js';


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

        this.inited.then(async () => {
            /* WEBGPU START */

            //@ts-ignore
            const adapter = await navigator.gpu.requestAdapter();
            const device = await adapter.requestDevice();


            // First Matrix

            const slopeArrMatrix = new Int16Array(this.slopeArr.length + 2);
            slopeArrMatrix[0] = this._subdivisionsY;
            slopeArrMatrix[1] = this._subdivisionsX;
            slopeArrMatrix.set(this.slopeArr, 2);

            const facet1ArrMatrix = new Float32Array(this.facet1Arr.length + 2);
            facet1ArrMatrix[0] = this._subdivisionsY;
            facet1ArrMatrix[1] = this._subdivisionsX;
            facet1ArrMatrix.set(this.facet1Arr, 2);

            const facet2ArrMatrix = new Float32Array(this.facet2Arr.length + 2);
            facet2ArrMatrix[0] = this._subdivisionsY;
            facet2ArrMatrix[1] = this._subdivisionsX;
            facet2ArrMatrix.set(this.facet2Arr, 2);


            const [gpuBufferFirstMatrix, arrayBufferFirstMatrix] = device.createBufferMapped({
                size: slopeArrMatrix.byteLength,
                //@ts-ignore
                usage: GPUBufferUsage.STORAGE,
            });
            new Int16Array(arrayBufferFirstMatrix).set(slopeArrMatrix);
            gpuBufferFirstMatrix.unmap();


            // Second Matrix



            const [gpuBufferSecondMatrix, arrayBufferSecondMatrix] = device.createBufferMapped({
                size: facet1ArrMatrix.byteLength,
                //@ts-ignore
                usage: GPUBufferUsage.STORAGE,
            });
            new Float32Array(arrayBufferSecondMatrix).set(facet1ArrMatrix);
            gpuBufferSecondMatrix.unmap();

            const [gpuBufferThirdMatrix, arrayBufferThirdMatrix] = device.createBufferMapped({
                size: facet1ArrMatrix.byteLength,
                //@ts-ignore
                usage: GPUBufferUsage.STORAGE,
            });
            new Float32Array(arrayBufferThirdMatrix).set(facet2ArrMatrix);
            gpuBufferThirdMatrix.unmap();

            // Result Matrix

            //const resultMatrixBufferSize = Float32Array.BYTES_PER_ELEMENT * (2 + firstMatrix[0] * secondMatrix[1]);

            //const resultMatrixBufferSize = Float32Array.BYTES_PER_ELEMENT * this._subdivisionsX * this._subdivisionsY;

            const resultMatrixBufferSize = Float32Array.BYTES_PER_ELEMENT * (2 + 5000 * 5000);
            const resultMatrixBuffer = device.createBuffer({
                size: resultMatrixBufferSize,
                //@ts-ignore
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });


            const bindGroupLayout = device.createBindGroupLayout({
                bindings: [
                    {
                        binding: 0,
                        //@ts-ignore
                        visibility: GPUShaderStage.COMPUTE,
                        type: "readonly-storage-buffer"
                    },
                    {
                        binding: 1,
                        //@ts-ignore
                        visibility: GPUShaderStage.COMPUTE,
                        type: "readonly-storage-buffer"
                    },
                    {
                        binding: 2,
                        //@ts-ignore
                        visibility: GPUShaderStage.COMPUTE,
                        type: "readonly-storage-buffer"
                    },
                    {
                        binding: 3,
                        //@ts-ignore
                        visibility: GPUShaderStage.COMPUTE,
                        type: "storage-buffer"
                    }
                ]
            });

            const bindGroup = device.createBindGroup({
                layout: bindGroupLayout,
                bindings: [
                    {
                        binding: 0,
                        resource: {
                            buffer: gpuBufferFirstMatrix
                        }
                    },
                    {
                        binding: 1,
                        resource: {
                            buffer: gpuBufferSecondMatrix
                        }
                    },
                    {
                        binding: 2,
                        resource: {
                            buffer: gpuBufferThirdMatrix
                        }
                    },
                    {
                        binding: 3,
                        resource: {
                            buffer: resultMatrixBuffer
                        }
                    }
                ]
            });
            const computeShaderCode = await (await (fetch('../../shaders/webgpu.comp'))).text();

            const glslang = await glslangModule();

            const computePipeline = device.createComputePipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: [bindGroupLayout]
                }),
                computeStage: {
                    module: device.createShaderModule({
                        code: glslang.compileGLSL(computeShaderCode, "compute")
                    }),
                    entryPoint: "main"
                }
            });


            const commandEncoder = device.createCommandEncoder();

            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.dispatch(5000 /* x */, 5000 /* y */);
            passEncoder.endPass();


            // Get a GPU buffer for reading in an unmapped state.
            const gpuReadBuffer = device.createBuffer({
                size: resultMatrixBufferSize,
                //@ts-ignore
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });

            // Encode commands for copying buffer to buffer.
            commandEncoder.copyBufferToBuffer(
                resultMatrixBuffer /* source buffer */,
                0 /* source offset */,
                gpuReadBuffer /* destination buffer */,
                0 /* destination offset */,
                resultMatrixBufferSize /* size */
            );

            // Submit GPU commands.
            const gpuCommands = commandEncoder.finish();
            device.defaultQueue.submit([gpuCommands]);


            // Read buffer.
            const arrayBuffer = await gpuReadBuffer.mapReadAsync();
            let testcanvas = document.createElement('canvas');
            let testctx = testcanvas.getContext('2d');
            // testctx.putImageData()
            console.log('debug webgpu');
            //console.log(new Float32Array(arrayBuffer));
            console.log(new Int32Array(arrayBuffer));
            console.log(this.slopeArr.slice(0, 20));
            let debugarr = [];
            /*let row = 124;
            for (let col = 125; col > 0; col--) {
                for (let pix = 0; pix < 40; pix++) {
                    debugarr.push(this.slopeArr[row * this._subdivisionsX + col]);
                }
            }
            console.log(debugarr);*/

                




        /* WEBGPU ENDS */

        })


        this._setReady(true);

        console.log('terrain bounding');
        console.log(this.getBoundingInfo());

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
}
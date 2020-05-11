import { WorkerThread, WorkerReturn } from "../WorkerThread.js";
import { TerraMesh } from "../TerraMesh.js";
//@ts-ignore
import glslangModule from 'https://unpkg.com/@webgpu/glslang@0.0.8/dist/web-devel/glslang.js';
import { VertexBuffer } from "../lib/babylon/Meshes/buffer.js";
import { WebGPUEngine } from "../lib/babylon/index.js";


interface TerrainMap {
    width: number,
    height: number,
    indices: Uint32Array,
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

    public slopeArrGPUBuffer: GPUBuffer;
    public facet1ArrGPUBuffer: GPUBuffer;
    public facet2ArrGPUBuffer: GPUBuffer;

    public slopeArrBuffer: SharedArrayBuffer;
    public facet1ArrBuffer: SharedArrayBuffer;
    public facet2ArrBuffer: SharedArrayBuffer;

    public slopeArr: Int32Array;
    public facet1Arr: Float32Array;
    public facet2Arr: Float32Array;

    private ratioX: number;
    private ratioY: number;
    
    public static terrainWorker = new WorkerThread('/webworkers/terrainWorker.js');

    public inited: Promise<any>;
    public static async fromHeightMap(map: string, device: GPUDevice): Promise<Terrain> {
        let vdata = await Terrain.terrainWorker.message<TerrainMap, PostMessageOptions>(WorkerReturn.Promise, 'createHeightMap', {url: map});
        return new Terrain(vdata, device);
    }
    public createTexture(engine: WebGPUEngine) : Promise<GPUBuffer> {
        return new Promise((tres, trej) => {
            this.inited.then(async () => {
                console.log('creating terrain texture')
                /* WEBGPU START */
                const computeShaderCode = await (await (fetch('../../shaders/webgpu.comp'))).text();
                //@ts-ignore
                const device: GPUDevice = engine._device;

                // Result Matrix

                const resultMatrixBufferSize = Int32Array.BYTES_PER_ELEMENT * (2 + 5120 * 5120);
                const resultMatrixBuffer = device.createBuffer({
                    size: resultMatrixBufferSize,
                    //@ts-ignore
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
                });
                const glslang = await glslangModule();
                const computePipeline = device.createComputePipeline({
                    computeStage: {
                        module: device.createShaderModule({
                            code: glslang.compileGLSL(computeShaderCode, "compute")
                        }),
                        entryPoint: "main"
                    }
                });
                const bindGroup = device.createBindGroup({
                    //@ts-ignore
                    layout: computePipeline.getBindGroupLayout(0 /* index */),
                    entries: [
                        {
                            binding: 0,
                            resource: {
                                buffer: this.slopeArrGPUBuffer
                            }
                        },
                        {
                            binding: 1,
                            resource: {
                                buffer: this.facet1ArrGPUBuffer
                            }
                        },
                        {
                            binding: 2,
                            resource: {
                                buffer: this.facet2ArrGPUBuffer
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
                console.time('Webgpu paint')
                const commandEncoder = device.createCommandEncoder();

                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(computePipeline);
                passEncoder.setBindGroup(0, bindGroup);
                passEncoder.dispatch(5120 /* x */, 5120 /* y */);
                passEncoder.endPass();
                //tres(resultMatrixBuffer);
                console.timeEnd('Webgpu paint');
                // Get a GPU buffer for reading in an unmapped state.
                const gpuReadBuffer = device.createBuffer({
                    size: resultMatrixBufferSize-8,
                    //@ts-ignore
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                });
                // Encode commands for copying buffer to buffer.
                commandEncoder.copyBufferToBuffer(
                    resultMatrixBuffer /* source buffer */,
                    8 /* source offset */,
                    gpuReadBuffer /* destination buffer */,
                    0 /* destination offset */,
                    resultMatrixBufferSize-8 /* size */
                );

                // Submit GPU commands.
                const gpuCommands = commandEncoder.finish();
                device.defaultQueue.submit([gpuCommands]);
                //resultMatrixBuffer.destroy();
                tres(resultMatrixBuffer);

                // Read buffer.
                let arrayBuffer: ArrayBuffer = await gpuReadBuffer.mapReadAsync();
                gpuReadBuffer.label = 'computed';
                
                Terrain.terrainWorker.message<ArrayBuffer, Transferable[]>(WorkerReturn.Promise, 'saveTexture', arrayBuffer, [arrayBuffer]);
                gpuReadBuffer.destroy()
            })
        });
    }
    //public ground: BABYLON.GroundMesh;
    constructor(vdata: TerrainMap, device: GPUDevice) {
        super('ground', vdata.positions, vdata.indices, undefined, vdata.uvs);
        
        this._subdivisionsX = 250;
        this._subdivisionsY = 250;

        this.slopeArrBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * this._subdivisionsX * this._subdivisionsY)
        this.facet1ArrBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this._subdivisionsX * this._subdivisionsY * 4);
        this.facet2ArrBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this._subdivisionsX * this._subdivisionsY * 4);
        this.slopeArr = new Int32Array(this.slopeArrBuffer);
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

       // var vertexData = new BABYLON.VertexData();

        //vertexData.indices = this.indices;
        //vertexData.positions = this.positions;
        
        

        this.inited = TerraMesh.worker.message<SharedArrayBuffer, PostMessageOptions>(this.uniqueId, 'ComputeNormals').then(async normalsb => {
            this.normalsBuffer = normalsb;
            this.normals = new Float32Array(this.normalsBuffer)
            this.normalsView = new DataView(this.normalsBuffer);
            this.setVerticesData(VertexBuffer.NormalKind, this.normals);

            let boundingInfo = this.subMeshes[0].getBoundingInfo();
            await Terrain.terrainWorker.message(WorkerReturn.Promise, 'init',
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
            const [gpuBufferFirstMatrix, arrayBufferFirstMatrix] = device.createBufferMapped({
                size: this.slopeArrBuffer.byteLength,
                //@ts-ignore
                usage: GPUBufferUsage.STORAGE,
            });
            new Int32Array(arrayBufferFirstMatrix).set(new Int32Array(this.slopeArrBuffer));
            gpuBufferFirstMatrix.unmap();
            this.slopeArrGPUBuffer = gpuBufferFirstMatrix;

            const [gpuBufferFacet1, arrayBufferFacet1] = device.createBufferMapped({
                size: this.facet1Arr.byteLength,
                //@ts-ignore
                usage: GPUBufferUsage.STORAGE,
            });
            new Float32Array(arrayBufferFacet1).set(this.facet1Arr);
            gpuBufferFacet1.unmap();
            this.facet1ArrGPUBuffer = gpuBufferFacet1;

            const [gpuBufferFacet2, arrayBufferFacet2] = device.createBufferMapped({
                size: this.facet2Arr.byteLength,
                //@ts-ignore
                usage: GPUBufferUsage.STORAGE,
            });
            new Float32Array(arrayBufferFacet2).set(this.facet2Arr);
            gpuBufferFacet2.unmap();
            this.facet2ArrGPUBuffer = gpuBufferFacet2;
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
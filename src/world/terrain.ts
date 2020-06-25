import { WorkerThread, WorkerReturn } from "../WorkerThread.js";
import { TerraMesh } from "../TerraMesh.js";
import { VertexBuffer } from "../lib/babylon/Meshes/buffer.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine";
import { GPUScene } from "../GPUScene.js";
import { worldPosition } from "../traits/worldPosition.js";
import { Drawable } from "../drawables/Drawable.js";
import { Mesh } from "../drawables/Mesh";


interface TerrainMap {
    width: number,
    height: number,
    indices: Uint32Array,
    positions: Float32Array,
    uvs: Float32Array,
    texture: Blob
}
export interface TerrainPipelineLayoutPosition extends GPUPipelineLayout {

}
export interface TerrainPipelineLayoutPositionTime extends GPUPipelineLayout {

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

    public initedGPU: Promise<any>;
    static Layouts: Map<GPUScene, GPUBindGroupLayout> = new Map();
    static getLayout(scene: GPUScene): GPUBindGroupLayout {
        let layout: GPUBindGroupLayout | undefined;
        if (layout = Terrain.Layouts.get(scene)) {
            return layout;
        }
        layout = scene.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    type: "readonly-storage-buffer"
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    type: "readonly-storage-buffer"
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    type: "readonly-storage-buffer"
                }
            ]
        });
        Terrain.Layouts.set(scene, layout);
        return layout;
    }

    PipelineLayoutPosition: [GPUPipelineLayout, Set<Drawable>] = [GPUScene.instance.device.createPipelineLayout({
        bindGroupLayouts: [GPUScene.instance.uniformBindGroupLayout, Terrain.getLayout(GPUScene.instance), worldPosition.getLayout(GPUScene.instance)]
    }), new Set()];
    PipelineLayoutPositionTime: [GPUPipelineLayout, Set<Drawable>] = [GPUScene.instance.device.createPipelineLayout({
        bindGroupLayouts: [GPUScene.instance.uniformBindGroupLayout, Terrain.getLayout(GPUScene.instance), GPUScene.instance.uniformBindGroupLayout, worldPosition.getLayout(GPUScene.instance)]
    }),
    new Set()
    ]

    bindGroup: GPUBindGroup;
    public static async fromHeightMap(map: string, device: GPUDevice): Promise<Terrain> {
        let vdata = await Terrain.terrainWorker.message<SharedArrayBuffer, PostMessageOptions>(WorkerReturn.Promise, 'createHeightMap', { url: map });




        const [sourceGPU, sourcearr] = GPUScene.instance.device.createBufferMapped({ size: 4 + 4 + 4 + 4 + 4 + 4 + 4 + vdata.byteLength, usage: GPUBufferUsage.STORAGE });
        new Float32Array(sourcearr).set([10000, 10000]);   // terrain width and height
        new Uint32Array(sourcearr).set([250, 250,   //buffer width and height
                                        250,        //subdivisions
        ],2); 
        new Int32Array(sourcearr).set([-2, 255],5); //min and max height
        new Uint32Array(sourcearr).set(new Uint32Array(vdata),7);
        sourceGPU.unmap();

        const terrainPositionsLength = Float32Array.BYTES_PER_ELEMENT * (250 + 1) * (250 + 1) * 3;
        const terrainUvsLength = Float32Array.BYTES_PER_ELEMENT * (250 + 1) * (250 + 1) * 2;

        const terrainPositionAndUvsGPU = GPUScene.instance.device.createBuffer({
            size: terrainPositionsLength + terrainUvsLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });


        const computePipeline = GPUScene.instance.device.createComputePipeline({

            computeStage: {
                module: GPUScene.instance.shaderModules.get("CreateGroundFromHeightMap.comp")!,
                entryPoint: "main"
            }
        });
        const sourceBindGroup = GPUScene.instance.device.createBindGroup({
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: sourceGPU
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: terrainPositionAndUvsGPU
                    }
                }
            ]
        });



        const computePipelineNormals = GPUScene.instance.device.createComputePipeline({

            computeStage: {
                module: GPUScene.instance.shaderModules.get("calculatePlaneIndices.comp")!,
                entryPoint: "main"
            }
        });
        const terrainIndicesLength = Uint32Array.BYTES_PER_ELEMENT * (250 * 250 * 6);
        const terrainIndicesGPU = GPUScene.instance.device.createBuffer({
            size: terrainIndicesLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
        const gpuReadBufferIndices = GPUScene.instance.device.createBuffer({
            size: terrainIndicesLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        const bindGroupNormals = GPUScene.instance.device.createBindGroup({
            layout: computePipelineNormals.getBindGroupLayout(0),
            entries: [

                {
                    binding: 0,
                    resource: {
                        buffer: terrainIndicesGPU
                    }
                }
            ]
        });
        const commandEncoder = GPUScene.instance.device.createCommandEncoder();

        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, sourceBindGroup);
        passEncoder.dispatch(250 + 1, 250 + 1);

        passEncoder.setPipeline(computePipelineNormals);
        passEncoder.setBindGroup(0, bindGroupNormals);
        passEncoder.dispatch(250, 250);


        passEncoder.endPass();
        const gpuReadBufferPositionsAndUvs = GPUScene.instance.device.createBuffer({
            size: terrainPositionsLength + terrainUvsLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        commandEncoder.copyBufferToBuffer(
            terrainPositionAndUvsGPU, // source buffer
            0, //source offset
            gpuReadBufferPositionsAndUvs, //destination buffer
            0, //destination offset
            terrainPositionsLength + terrainUvsLength // size
        );
        commandEncoder.copyBufferToBuffer(
            terrainIndicesGPU,
            0,
            gpuReadBufferIndices,
            0,
            terrainIndicesLength
        );
        const gpuCommands = commandEncoder.finish();

        GPUScene.instance.device.defaultQueue.submit([gpuCommands]);


        const positionsAndUvs = await gpuReadBufferPositionsAndUvs.mapReadAsync()
        // const uvs = await gpuReadBufferUvs.mapReadAsync()
        const indices = await gpuReadBufferIndices.mapReadAsync();









        /*

        const m = new Mesh({
            sampleCount: GPUScene.instance.sampleCount,
            primitiveTopology: 'triangle-strip',
            rasterizationState: {
                cullMode: 'none',
            },
            depthStencilState: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus-stencil8",
            },
            colorStates: [{
                format: "bgra8unorm",
            }],
            vertexStage: {
                module: GPUScene.instance.shaderModules.get("ground.vert")!,
                entryPoint: "main",
            },
            fragmentStage: {
                module: GPUScene.instance.shaderModules.get("ground.frag")!,
                entryPoint: "main"
            },
            vertexState: {
                vertexBuffers:
                    [{
                        arrayStride: 4 * 3,
                        stepMode: "vertex" as GPUInputStepMode,
                        attributes: [{
                            // position
                            shaderLocation: 0,
                            offset: 0,
                            format: "float3" as GPUVertexFormat
                        }]
                    }]
            },
            // layout: pipelineLayout,
        }, null, vdata.indices.length, 1)
        
        m.setVertexBuffer(0, vdata.positions.buffer);
        m.setIndexBuffer(vdata.indices.buffer);*/
        const vdata2 = {
            positions: new Float32Array(positionsAndUvs, 0, terrainPositionsLength >> 2),
            uvs: new Float32Array(positionsAndUvs, terrainPositionsLength),
            indices: new Uint32Array(indices)
        }
        debugger;
        //@ts-ignore
        return new Terrain(vdata2, device);
    }
    public createTexture(engine: WebGPUEngine): Promise<GPUBuffer> {
        return new Promise((tres, trej) => {
            this.initedGPU.then(async () => {
                console.log('creating terrain texture')

                const resultMatrixBufferSize = Int32Array.BYTES_PER_ELEMENT * (2 + 5120 * 5120);
                const resultMatrixBuffer = this.device.createBuffer({
                    size: resultMatrixBufferSize,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
                });
                const bindGroup1Layout = this.device.createBindGroupLayout({
                    entries: [
                        {
                            binding: 0,
                            visibility: GPUShaderStage.COMPUTE,
                            type: "storage-buffer"
                        }]
                })
                const computePipeline = this.device.createComputePipeline({
                    layout: this.device.createPipelineLayout({
                        bindGroupLayouts: [Terrain.getLayout(GPUScene.instance), bindGroup1Layout]
                    }),
                    computeStage: {
                        module: GPUScene.instance.shaderModules.get("webgpu.comp")!,
                        entryPoint: "main"
                    }
                });

                const bindGroup1 = this.device.createBindGroup({
                    layout: bindGroup1Layout,
                    entries: [
                        {
                            binding: 0,
                            resource: {
                                buffer: resultMatrixBuffer
                            }
                        }
                    ]
                });
                console.time('Webgpu paint')
                const commandEncoder = this.device.createCommandEncoder();

                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(computePipeline);
                passEncoder.setBindGroup(0, this.bindGroup);
                passEncoder.setBindGroup(1, bindGroup1);
                passEncoder.dispatch(5120 /* x */, 5120 /* y */);
                passEncoder.endPass();
                //tres(resultMatrixBuffer);
                console.timeEnd('Webgpu paint');
                // Get a GPU buffer for reading in an unmapped state.
                const gpuReadBuffer = this.device.createBuffer({
                    size: resultMatrixBufferSize - 8,
                    //@ts-ignore
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                });
                // Encode commands for copying buffer to buffer.
                commandEncoder.copyBufferToBuffer(
                    resultMatrixBuffer /* source buffer */,
                    8 /* source offset */,
                    gpuReadBuffer /* destination buffer */,
                    0 /* destination offset */,
                    resultMatrixBufferSize - 8 /* size */
                );

                // Submit GPU commands.
                const gpuCommands = commandEncoder.finish();
                this.device.defaultQueue.submit([gpuCommands]);
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
    constructor(vdata: TerrainMap, private device: GPUDevice) {
        super('ground', vdata.positions, vdata.indices, undefined, vdata.uvs);

        this._subdivisionsX = 250;
        this._subdivisionsY = 250;

        this.slopeArrBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * this._subdivisionsX * this._subdivisionsY)
        this.facet1ArrBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this._subdivisionsX * this._subdivisionsY * 4);
        this.facet2ArrBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this._subdivisionsX * this._subdivisionsY * 4);
        this.slopeArr = new Int32Array(this.slopeArrBuffer);
        this.facet1Arr = new Float32Array(this.facet1ArrBuffer);
        this.facet2Arr = new Float32Array(this.facet2ArrBuffer);

        this._width = 10000;
        this._height = 10000;
        this._maxX = this._width / 2.0;
        this._maxZ = this._height / 2.0;
        this._minX = -this._maxX;
        this._minZ = -this._maxZ;

        this.ratioX = this._subdivisionsX / this._width;
        this.ratioY = this._subdivisionsY / this._height;

        // var vertexData = new BABYLON.VertexData();

        //vertexData.indices = this.indices;
        //vertexData.positions = this.positions;
        const [gpuBufferFirstMatrix, arrayBufferFirstMatrix] = device.createBufferMapped({
            size: this.slopeArrBuffer.byteLength,
            usage: GPUBufferUsage.STORAGE,
        });
        const [gpuBufferFacet1, arrayBufferFacet1] = device.createBufferMapped({
            size: this.facet1Arr.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        const [gpuBufferFacet2, arrayBufferFacet2] = device.createBufferMapped({
            size: this.facet2Arr.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.facet2ArrGPUBuffer = gpuBufferFacet2;
        this.slopeArrGPUBuffer = gpuBufferFirstMatrix;
        this.facet1ArrGPUBuffer = gpuBufferFacet1;
        this.bindGroup = this.device.createBindGroup({
            layout: Terrain.getLayout(GPUScene.instance),
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
                }
            ]
        });

        this.initedGPU = TerraMesh.worker.message<SharedArrayBuffer, PostMessageOptions>(this.uniqueId, 'ComputeNormals').then(async normalsb => {
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

            new Int32Array(arrayBufferFirstMatrix).set(new Int32Array(this.slopeArrBuffer));
            gpuBufferFirstMatrix.unmap();



            new Float32Array(arrayBufferFacet1).set(this.facet1Arr);
            gpuBufferFacet1.unmap();



            new Float32Array(arrayBufferFacet2).set(this.facet2Arr);
            gpuBufferFacet2.unmap();



        })

        this._setReady(true);
        //  this.visibility = 0;
        console.log('terrain bounding');
        console.log(this.getBoundingInfo());

    }

    //BABYLON 4103
    //ARRAY 2800 -> 1897 -> 1720 -> 1708 -> 1631
    //Dataview 6100
    //pure array  848 -> 763


    getHeightAtCoordinates(x: number, z: number): number {
        let facet: Float32Array;
        let col = ((x + this._maxX) * this.ratioX) | 0;
        let row = (-(z + this._maxZ) * this.ratioY + this._subdivisionsY) | 0;
        debugger;
        console.log(col, row);
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
                console.warn('Invalid coordinate to getHeightAtCoordinates ' + x + ' ' + z);
                return this.getHeightAtCoordinates(Math.min(Math.max(x, this._minX + 1), this._maxX - 1), Math.min(Math.max(z, this._minZ + 1), this._maxZ - 1))
            }
            throw (e);
        }
        return -(facet[0] * x + facet[2] * z + facet[3]) / facet[1];
    }
}
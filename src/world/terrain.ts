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

export class Terrain {

    /*

     - No writable storage buffer layouts to vertex/fragment shader
     - Bind groups indexing
     


     * */
    static _subdivisionsX: number = 250;
    static _subdivisionsY: number = 250;

    public _width: number;
    public _height: number;
    public _minX: number;
    public _maxX: number;
    public _minZ: number;
    public _maxZ: number;



    slopeArrGPUBuffer: GPUBuffer = this.gpuscene.device.createBuffer({
        size: Int32Array.BYTES_PER_ELEMENT * Terrain._subdivisionsX * Terrain._subdivisionsY,
        usage: GPUBufferUsage.STORAGE,
    });
    facet1ArrGPUBuffer: GPUBuffer = this.gpuscene.device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * Terrain._subdivisionsX * Terrain._subdivisionsY * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    facet2ArrGPUBuffer: GPUBuffer = this.gpuscene.device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * Terrain._subdivisionsX * Terrain._subdivisionsY * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    public slopeArrBuffer: SharedArrayBuffer;
    public facet1ArrBuffer: SharedArrayBuffer;
    public facet2ArrBuffer: SharedArrayBuffer;

    public slopeArr: Int32Array;
    public facet1Arr: Float32Array;
    public facet2Arr: Float32Array;

    private ratioX: number;
    private ratioY: number;

    public static terrainWorker = new WorkerThread('/webworkers/terrainWorker.js');

    static heightLayouts: Map<GPUScene, GPUBindGroupLayout> = new Map();
    terraMesh: TerraMesh;
    static getHeightsLayout(scene: GPUScene): GPUBindGroupLayout {
        let layout: GPUBindGroupLayout | undefined;
        if (layout = Terrain.heightLayouts.get(scene)) {
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
        Terrain.heightLayouts.set(scene, layout);
        return layout;
    }

    PipelineLayoutPosition: [GPUPipelineLayout, Set<Drawable>] = [GPUScene.instance.device.createPipelineLayout({
        bindGroupLayouts: [GPUScene.instance.uniformBindGroupLayout, Terrain.getHeightsLayout(GPUScene.instance), worldPosition.getLayout(GPUScene.instance)]
    }), new Set()];
    PipelineLayoutPositionTime: [GPUPipelineLayout, Set<Drawable>] = [GPUScene.instance.device.createPipelineLayout({
        bindGroupLayouts: [GPUScene.instance.uniformBindGroupLayout, Terrain.getHeightsLayout(GPUScene.instance), GPUScene.instance.uniformBindGroupLayout, worldPosition.getLayout(GPUScene.instance)]
    }),
    new Set()
    ]
    heightsBindGroupEntries = [
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
    heightsBindGroup: GPUBindGroup = this.gpuscene.device.createBindGroup({
        layout: Terrain.getHeightsLayout(this.gpuscene),
        entries: this.heightsBindGroupEntries
    });
    public static async fromHeightMap(map: string, device: GPUDevice): Promise<SharedArrayBuffer> {
        let img = await fetch('/images/tenerife250.webp');
        let b = await img.blob();

        let bitmap = await createImageBitmap(b);
        let totalbufferdata = new SharedArrayBuffer(250 * 250 * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT);

        let align = (250 - bitmap.width) / 2

        let partcount = 2;
        let readycount = 0;
        let workers: Worker[] = [];
        //self.postMessage({ type: 'setProgress', data: { progress: 41 } });
        const buffer: SharedArrayBuffer = await new Promise(function initWorker(res, rej) {
            let worker = new Worker('../webworkers/bitmapWorker.js');
            workers.push(worker);
            /* progress 42 and 43 are reserved for this */
            // self.postMessage({ type: 'setProgress', data: { progress: 41 + (2 * (workers.length / partcount)) } });
            worker.postMessage({ bitmap: bitmap, buffer: totalbufferdata, partcount: partcount, partnumber: workers.length - 1, align: align }, [bitmap]);
            worker.onmessage = e => {
                try {
                    if (e.data.type == 'init') {
                        if (workers.length < partcount) {
                            bitmap = e.data.bitmap;
                            initWorker(res, rej);
                        } else {
                            // self.postMessage({ type: 'setProgress', data: { progress: 45 } });
                            bitmap.close();
                            // self.postMessage({ type: 'setProgress', data: { progress: 46 } });
                        }
                    } else if (e.data.type == 'ready') {
                        if (++readycount == partcount) {
                            //  self.postMessage({ type: 'setProgress', data: { progress: 48 } });
                            res(totalbufferdata)
                            workers.forEach(w => w.terminate());
                        }
                    } else if (e.data.type == 'rejected') {
                        rej(e.data.data);
                    }
                } catch (e) {
                    rej(e)
                }
            }
        });
        return buffer;
     //   let vdata = await Terrain.terrainWorker.message<SharedArrayBuffer, PostMessageOptions>(WorkerReturn.Promise, 'createHeightMap', { url: map });

        //@ts-ignore
        //return new Terrain(vdata, GPUScene.instance);
    }
    public createTexture(engine: WebGPUEngine): Promise<GPUBuffer> {
        return new Promise(async (tres, trej) => {

            console.log('creating terrain texture')
            debugger;
            const resultMatrixBufferSize = Int32Array.BYTES_PER_ELEMENT * (2 + 5120 * 5120);
            const resultMatrixBuffer = this.gpuscene.device.createBuffer({
                size: resultMatrixBufferSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });
                
            const computePipeline = GPUScene.instance.createComputePipeline("createTerrainTexture.comp", this.gpuscene.device.createPipelineLayout({
                bindGroupLayouts: [Terrain.getHeightsLayout(GPUScene.instance), GPUScene.instance.singleWritableStorageLayout]
            }));


            const bindGroup1 = this.gpuscene.device.createBindGroup({
                layout: GPUScene.instance.singleWritableStorageLayout,
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
            const commandEncoder = this.gpuscene.device.createCommandEncoder();

            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, this.heightsBindGroup);
            passEncoder.setBindGroup(1, bindGroup1);
            passEncoder.dispatch(5120 , 5120 );
            passEncoder.endPass();
            //tres(resultMatrixBuffer);
            console.timeEnd('Webgpu paint');
            // Get a GPU buffer for reading in an unmapped state.
            const gpuReadBuffer = this.gpuscene.device.createBuffer({
                size: resultMatrixBufferSize - 8,
                //@ts-ignore
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            // Encode commands for copying buffer to buffer.
            commandEncoder.copyBufferToBuffer(
                resultMatrixBuffer ,
                8 ,
                gpuReadBuffer ,
                0 ,
                resultMatrixBufferSize - 8 
            );
            debugger;
            // Submit GPU commands.
            const gpuCommands = commandEncoder.finish();
            this.gpuscene.device.defaultQueue.submit([gpuCommands]);
            debugger;
            //resultMatrixBuffer.destroy();
            tres(resultMatrixBuffer);

            // Read buffer.
            let arrayBuffer: ArrayBuffer = await gpuReadBuffer.mapReadAsync();
            gpuReadBuffer.label = 'computed';

            Terrain.terrainWorker.message<ArrayBuffer, Transferable[]>(WorkerReturn.Promise, 'saveTexture', arrayBuffer, [arrayBuffer]);
            gpuReadBuffer.destroy()
        });
    }
    //public ground: BABYLON.GroundMesh;

    constructor(buffer: SharedArrayBuffer, private gpuscene: GPUScene) {
        const [sourceGPU, sourcearr] = GPUScene.instance.device.createBufferMapped({ size: 4 + 4 + 4 + 4 + 4 + 4 + 4 + buffer.byteLength, usage: GPUBufferUsage.STORAGE });
        new Float32Array(sourcearr).set([10000, 10000]);   // terrain width and height
        new Uint32Array(sourcearr).set([250, 250,   //buffer width and height
            250,        //subdivisions
        ], 2);
        new Int32Array(sourcearr).set([-2, 255], 5); //min and max height
        new Uint32Array(sourcearr).set(new Uint32Array(buffer), 7);
        sourceGPU.unmap();

        const terrainPositionsLength = Float32Array.BYTES_PER_ELEMENT * (250 + 1) * (250 + 1) * 3;
        const terrainUvsLength = Float32Array.BYTES_PER_ELEMENT * (250 + 1) * (250 + 1) * 2;
        const terrainPositionAndUvsGPU = gpuscene.createGPUBuffer(terrainPositionsLength + terrainUvsLength, GPUBufferUsage.VERTEX, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC)
       /* const terrainPositionAndUvsGPU = GPUScene.instance.device.createBuffer({
            size: terrainPositionsLength + terrainUvsLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
        });*/
        const computePipeline = GPUScene.instance.createComputePipeline('CreateGroundFromHeightMap.comp')

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

        const computePipelineNormals = GPUScene.instance.createComputePipeline('calculatePlaneIndices.comp')

        const computePlaneHeights = GPUScene.instance.createComputePipeline('calculatePlaneHeights.comp');
        const bindGroupPositions = GPUScene.instance.device.createBindGroup({
            layout: computePlaneHeights.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: terrainPositionAndUvsGPU
                    }
                }
            ]
        });
        const bindGroupHeights = GPUScene.instance.device.createBindGroup({
            layout: computePlaneHeights.getBindGroupLayout(1),
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


        const terrainIndicesLength = Uint32Array.BYTES_PER_ELEMENT * (250 * 250 * 6);
        const terrainIndicesGPU = gpuscene.createGPUBuffer(terrainIndicesLength,GPUBufferUsage.INDEX, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC);
        const gpuReadBufferIndices = gpuscene.device.createBuffer({
            size: terrainIndicesLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        const bindGroupNormals = gpuscene.device.createBindGroup({
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

     /*   passEncoder.setPipeline(computePlaneHeights);
        passEncoder.setBindGroup(0, bindGroupPositions);
        passEncoder.setBindGroup(1, bindGroupHeights);
        passEncoder.dispatch(250, 250);*/

        passEncoder.setPipeline(computePipelineNormals);
        passEncoder.setBindGroup(0, bindGroupNormals);

        passEncoder.dispatch(250, 250);


        passEncoder.endPass();
        
        const gpuReadBufferPositionsAndUvs = gpuscene.device.createBuffer({
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
        
        gpuscene.device.defaultQueue.submit([gpuCommands]);
        debugger;

        /*const positionsAndUvs = await gpuReadBufferPositionsAndUvs.mapReadAsync()
        // const uvs = await gpuReadBufferUvs.mapReadAsync()
        const indices = await gpuReadBufferIndices.mapReadAsync();




        const vdata = {
            positions: new Float32Array(positionsAndUvs, 0, terrainPositionsLength >> 2),
            uvs: new Float32Array(positionsAndUvs, terrainPositionsLength),
            indices: new Uint32Array(indices)
        }
        */




        const m = new Mesh({
            sampleCount: GPUScene.instance.sampleCount,
            primitiveTopology: 'triangle-list',
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
                        arrayStride: 4 * 5,
                        stepMode: "vertex",
                        attributes: [{
                            // position
                            shaderLocation: 0,
                            offset: 0,
                            format: "float3"
                        },
                        {
                            // uv
                            shaderLocation: 1,
                            offset: 4 * 3,
                            format: "float2"
                        }]
                    }]
            },
            // layout: pipelineLayout,
        }, null, terrainIndicesLength/4, 1)
        // m.setVertexBuffer(0, vdata.positions);
        m.setVertexBuffer(0, terrainPositionAndUvsGPU);
        m.setIndexBuffer(terrainIndicesGPU);
        debugger;

      //  this.terraMesh = new TerraMesh('ground', vdata.positions, vdata.indices, undefined, vdata.uvs);
        this.terraMesh = new TerraMesh('ground', new Float32Array([1,2,3,4,5,6,7,8,9]));






        this.slopeArrBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * Terrain._subdivisionsX * Terrain._subdivisionsY)
        this.facet1ArrBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain._subdivisionsX * Terrain._subdivisionsY * 4);
        this.facet2ArrBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain._subdivisionsX * Terrain._subdivisionsY * 4);
        this.slopeArr = new Int32Array(this.slopeArrBuffer);
        this.facet1Arr = new Float32Array(this.facet1ArrBuffer);
        this.facet2Arr = new Float32Array(this.facet2ArrBuffer);

        this._width = 10000;
        this._height = 10000;
        this._maxX = this._width / 2.0;
        this._maxZ = this._height / 2.0;
        this._minX = -this._maxX;
        this._minZ = -this._maxZ;

        this.ratioX = Terrain._subdivisionsX / this._width;
        this.ratioY = Terrain._subdivisionsY / this._height;

        // var vertexData = new BABYLON.VertexData();

        //vertexData.indices = this.indices;
        //vertexData.positions = this.positions;
        /*
        const [gpuBufferFirstMatrix, arrayBufferFirstMatrix] = gpuscene.device.createBufferMapped({
            size: this.slopeArrBuffer.byteLength,
            usage: GPUBufferUsage.STORAGE,
        });
        const [gpuBufferFacet1, arrayBufferFacet1] = gpuscene.device.createBufferMapped({
            size: this.facet1Arr.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        const [gpuBufferFacet2, arrayBufferFacet2] = gpuscene.device.createBufferMapped({
            size: this.facet2Arr.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.facet2ArrGPUBuffer = gpuBufferFacet2;
        this.slopeArrGPUBuffer = gpuBufferFirstMatrix;
        this.facet1ArrGPUBuffer = gpuBufferFacet1;
        this.bindGroup = this.device.createBindGroup({
            layout: Terrain.getHeightsLayout(GPUScene.instance),
            entries: [
                {
                    binding: 0,
                    resouz<lllrce: {
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
        });*/
        /*
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



        })*/

        this.terraMesh._setReady(true);
        this.terraMesh.visibility = 0;
        console.log('terrain bounding');
        console.log(this.terraMesh.getBoundingInfo());

    }

    //BABYLON 4103
    //ARRAY 2800 -> 1897 -> 1720 -> 1708 -> 1631
    //Dataview 6100
    //pure array  848 -> 763


    getHeightAtCoordinates(x: number, z: number): number {
        let facet: Float32Array;
        let col = ((x + this._maxX) * this.ratioX) | 0;
        let row = (-(z + this._maxZ) * this.ratioY + Terrain._subdivisionsY) | 0;
        debugger;
        console.log(col, row);
        let pos: number = row * Terrain._subdivisionsX + col;
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
import { Scene } from "../Scene.js";
import { TerrainTool } from "../tools/Terrain.js";
import { TerrainMesh } from "../GPU/Meshes/Terrain.js";
import { GPUBufferUsage } from "../GPU.js"
import type { PipelineLayout } from "../GPU/PipelineLayout.js";
import { Engine } from "../engine.js";
import { BindGroupLayout } from "../GPU/BindGroupLayout.js";
import { ComputePipeline } from "../GPU/ComputePipeline.js";
import { Buffer, type CopySrcBuffer, ReadBuffer, WriteBuffer, CopyDstBuffer, BindUniformBuffer, BindStorageBuffer, VertexBuffer } from "../GPU/Buffer.js";
import { BindGroup } from "GPU/BindGroup.js";
declare const engine:Engine;

declare class OffscreenCanvas {
    width: number;
    height: number;
    convertToBlob(options?: { type?: "image/png" | "image/webp"; quality?: number; }): Promise<Blob>
    getContext(contextType: "2d"):CanvasRenderingContext2D
    constructor(width: number, height:number)
}
export class Terrain {
    /*
TODO
     - No writable storage buffer layouts to vertex/fragment shader

     * */

        // 1000 * 1000: 40 - 50ms when no collision
    static readonly subdivisions = [64, 64] as const;
    static readonly size = [10000, 10000] as const;
    static readonly maxXZ=[Terrain.size[0] / 2.0,Terrain.size[1] / 2.0] as const;
    static readonly minmax=[-2, 500] as const;
    static readonly textureSize = [8192, 8192] as const;

    slopeArrGPUBuffer: BindStorageBuffer;
    //TODO: Remove copy_src
    
    facet12ArrGPUBuffer: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer
    facet12ArrGPUBufferSwap: WriteBuffer;



    public slopeArrBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * Terrain.subdivisions[0] * Terrain.subdivisions[1]);

    public slopeArr = new Int32Array(this.slopeArrBuffer);

    readonly mesh: TerrainMesh;

    TerrainHeightsbindGroupTree : PipelineLayout;
    ready: Promise<void>;
    
    //TerrainHeightsbindGroupPositionTree = this.TerrainHeightsbindGroupTree.addChildBindGroup(this.scene.gpu.BindGroupPosition, true)

    public static fromSave(cachedvertices: Response): Promise<ArrayBuffer> {
        return cachedvertices.arrayBuffer();
        /* const cacheimg = new Image();
         cacheimg.src = URL.createObjectURL(await cachedvertices.blob());
         await cacheimg.decode();
         const canvas = new OffscreenCanvas(cacheimg.width, cacheimg.height);
         const context = canvas.getContext('2d');
         if (!context)
             throw (new Error('Unable to get 2D contect of vertices data'));
         context.drawImage(cacheimg, 0, 0);
         return context.getImageData(0, 0, cacheimg.width, cacheimg.height).data.buffer;*/
    }




    readonly #terrainIndicesLength = Uint32Array.BYTES_PER_ELEMENT * (Terrain.subdivisions[0] * Terrain.subdivisions[1] * 6);

    autosave = 0;
    updateSwap2(offset = 0, byteLength:number, nofaces = false) {
        if(!engine.gpu)
            return
        const b1 = Buffer.create(engine.gpu, byteLength, [GPUBufferUsage.COPY_SRC], 'terrain_b1', (b) => {
            new Float32Array(b.getMappedRange()).set(
                new Float32Array(engine.memory.buffer, engine.rust.vertices_pointer(this.mesh.ptr)+offset, byteLength/4)
            )
        });

        const commandEncoder = engine.gpu.device.createCommandEncoder({label: 'updateSwap2_encoder'});
        b1.copyTo(commandEncoder, this.terrainPositionAndUvsAndNormalsGPU, 0, offset, byteLength)
        let b2: CopySrcBuffer;
        if (!nofaces) {
            const facesByteLength = this.mesh.faces_count * 4 * Float32Array.BYTES_PER_ELEMENT;
            b2 = Buffer.create(engine.gpu,facesByteLength, [GPUBufferUsage.COPY_SRC], 'terrain_b2', b => {
                new Float32Array(b.getMappedRange()).set(new Float32Array(engine.memory.buffer, engine.rust.faces_pointer(this.mesh.ptr), this.mesh.faces_count * 4))
            });
            b2.copyTo(commandEncoder, this.facet12ArrGPUBuffer, 0, 0, facesByteLength);
            engine.gpu.device.queue.submit([commandEncoder.finish()]);
            b2.destroy();
        }
        b1.destroy();
        clearTimeout(this.autosave);
        this.autosave = setTimeout(() => this.serialize(), 10000)

    }

    static async loadFromTexture(scenes: Scene[]): Promise<Terrain> {
        if(!engine.gpu)
            throw(new Error('Terrain texture creation needs GPU'));
        const settingsGPU = Buffer.create(engine.gpu, 48, [GPUBufferUsage.STORAGE, GPUBufferUsage.UNIFORM],'settingsGPU', b => {
            const sourcearrSettings = b.getMappedRange();
            new Uint32Array(sourcearrSettings).set(this.size);   // terrain width and height
            new Uint32Array(sourcearrSettings, 8).set(Terrain.subdivisions);
            new Uint32Array(sourcearrSettings, 16).set([Terrain.subdivisions[0]]);       //subdivisions
            new Int32Array(sourcearrSettings, 24).set(Terrain.minmax); //min and max height,
            new Int32Array(sourcearrSettings, 32).set(Terrain.maxXZ); //maxX, maxZ
            new Int32Array(sourcearrSettings, 40).set(Terrain.textureSize); //texture size
        });
        const positionsCount =  ((size:number) => {
            while(size%4 !== 0)
                size++;
            return size;
        })( (Terrain.subdivisions[0] + 1) * (Terrain.subdivisions[1] + 1));
               
        const positionsLength = Float32Array.BYTES_PER_ELEMENT * positionsCount * 4;
        const uvsLength =       Float32Array.BYTES_PER_ELEMENT * positionsCount * 4;
        const normalsLength =   Float32Array.BYTES_PER_ELEMENT * positionsCount * 4;
        const verticesBufferSize = positionsLength + uvsLength + normalsLength

        const t = await caches.match(new Request('/terrain')).then(async cachedvertices => {
            if (cachedvertices) {
                const cachedBuffer = await Terrain.fromSave(cachedvertices);
                var terrainPositionAndUvsAndNormalsGPU = Buffer.create(engine.gpu!, verticesBufferSize, [GPUBufferUsage.STORAGE, GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC], 'terrainPositionAndUvsAndNormalsGPU',
                    b => {
                        new Uint8Array(b.getMappedRange()).set(new Uint8Array(cachedBuffer));       
                    })
            } else {
                const b = await (await fetch('/images/tenerife250.webp')).blob();

                const bitmap = await createImageBitmap(b);
                const texture = engine.gpu!.device.createTexture({
                    format: 'rgba8unorm',
                    size:[bitmap.width, bitmap.height],
                    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
                })
                engine.gpu!.device.queue.copyExternalImageToTexture({source:bitmap},{texture},[bitmap.width,bitmap.height]);

                const computePipeline = new ComputePipeline(engine.gpu!, 'terrain/CreateGroundFromHeightMap.comp.wgsl');

                const bindGroupSettings = computePipeline.createBindGroup(0, 'bindGroupSettings', (bindGroup) => [{
                    binding: 0,
                    resource: settingsGPU.getUniformBinding(bindGroup)
                }]);
                const commandEncoder = engine.gpu!.device.createCommandEncoder({label: 'loadFromTexture_encoder'});
                const passEncoder = commandEncoder.beginComputePass({label: 'loadFromTexture_encoder_pass_encoder'});
                passEncoder.setBindGroup(0, bindGroupSettings.bindGroup);
                var terrainPositionAndUvsAndNormalsGPU = Buffer.create(engine.gpu!, verticesBufferSize, [GPUBufferUsage.STORAGE, GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC], 'terrainPositionAndUvsAndNormalsGPU')
                const sourceBindGroup = computePipeline.createBindGroup(1,'sourceBindGroup', (bindGroup) => [
                    {
                        binding: 0,
                        resource: terrainPositionAndUvsAndNormalsGPU.getStorageBinding(bindGroup)
                    },
                    {
                        binding: 1,
                        resource: texture.createView()
                    }
                ]);
                passEncoder.setPipeline(computePipeline.pipeline);
                passEncoder.setBindGroup(1, sourceBindGroup.bindGroup);
                passEncoder.dispatchWorkgroups(Terrain.subdivisions[0] + 1, Terrain.subdivisions[1] + 1);
                passEncoder.end();
                engine.gpu!.device.queue.submit([commandEncoder.finish()]);
            }
            const terrain = new Terrain(scenes, settingsGPU, terrainPositionAndUvsAndNormalsGPU);
            await terrain.ready;
            return terrain;

        })
        return t;
    }

    async serialize(compress = false) {
        const cacheP = caches.open('save');
        if (!compress) {
            const response = new Response(this.mesh.vertices);
            response.headers.set('content-length', (this.mesh.vertices_count * Float32Array.BYTES_PER_ELEMENT * this.mesh.vertices_stride).toString());
            response.headers.set('content-type', 'application/octet-stream');

            const indices=this.mesh.indices;
            const response2 = new Response(indices);
            response2.headers.set('content-length', indices.byteLength.toString());
            response2.headers.set('content-type', 'application/octet-stream');


            const cache = await cacheP;
            cache.put(new Request('/terrain'), response);
            cache.put(new Request('/indices'), response2);

        } else {
           /* const c = new OffscreenCanvas((Terrain.subdivisions[0] + 1) * 3, (Terrain.subdivisions[1] + 1));
            const ctx = c.getContext("2d");
            if (!ctx)
                throw ('get 2d context failed');
            //disabled for now
            
            ctx.putImageData(new ImageData(new Uint8ClampedArray(this.#vertices.buffer), c.width, c.height), 0, 0);
            let blob = await c.convertToBlob({ type: "image/webp", quality: 1 });
            const response = new Response(blob);
            response.headers.set('content-length', blob.size.toString());
            (await cacheP).put(new Request('/terrain.webp'), response);*/
        }
    }

    texture:GPUTexture;

    constructor(
        public scenes: Scene[],
        public settingsGPU: BindUniformBuffer & BindStorageBuffer,
        private terrainPositionAndUvsAndNormalsGPU: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer & VertexBuffer
    ) {
        if(!engine.gpu) {
            throw(new Error('Terrain mesh needs GPU'));
        }
        this.slopeArrGPUBuffer = Buffer.create(engine.gpu, Int32Array.BYTES_PER_ELEMENT * Terrain.subdivisions[0] * Terrain.subdivisions[1], [GPUBufferUsage.STORAGE],'slopeArrGPUBuffer');
        this.facet12ArrGPUBuffer = Buffer.create(engine.gpu, Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisions[0] * Terrain.subdivisions[1] * 4 * 2, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC], 'facet12ArrGPUBuffer');
        this.facet12ArrGPUBufferSwap = new WriteBuffer(engine.gpu, Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisions[0] * Terrain.subdivisions[1] * 4 * 2, 'facet12ArrGPUBufferSwap');
        this.texture = engine.gpu.device.createTexture({
            dimension: '2d',
            format: "rgba8unorm",
            mipLevelCount: 1,
            sampleCount: 1,
            size: Terrain.textureSize,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT
        });
        const _heightsBindGroupEntries =  (bindGroup:BindGroup) => [
            {
                binding: 0,
                resource: this.slopeArrGPUBuffer.getStorageBinding(bindGroup)
            },
            {
                binding: 1,
                resource: this.facet12ArrGPUBuffer.getStorageBinding(bindGroup)
            }
        ]
        const heightsLayout = BindGroupLayout.create(engine.gpu,'terrain',
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "read-only-storage"
                }
    
            },
            {
                binding: 1,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "read-only-storage"
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "read-only-storage"
                }
            }
        )
        this.TerrainHeightsbindGroupTree = engine.gpu.positionBindGroupTimeWGSL.addChildBindGroup('terrain', heightsLayout.createBindGroup('TerrainHeightsbindGroupTree', bindGroup => [
            {
                binding: 0,
                resource: this.slopeArrGPUBuffer.getStorageBinding(bindGroup)
            },
            {
                binding: 1,
                resource: this.facet12ArrGPUBuffer.getStorageBinding(bindGroup)
            },
            {
                binding: 2,
                resource: this.settingsGPU.getStorageBinding(bindGroup)
            }
        ]));
        
        const computePipelineIndices = new ComputePipeline(engine.gpu, 'terrain/calculatePlaneIndices.comp.wgsl');

        const positionsCount =  ((size:number) => {
            while(size%4 !== 0)
                size++;
            return size;
        })( (Terrain.subdivisions[0] + 1) * (Terrain.subdivisions[1] + 1));
               

        const commandEncoder = engine.gpu.device.createCommandEncoder({label: 'terrain_encoder'});
        const passEncoder = commandEncoder.beginComputePass({label: 'terrain_pass_encoder'});

        const settingsLayout=new BindGroupLayout(engine.gpu, engine.gpu.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "uniform"
                }
            }]
        }));
        const writableStorageLayout= new BindGroupLayout(engine.gpu, {
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            }]
        }) 
        const writableTextureLayout=new BindGroupLayout(engine.gpu, engine.gpu.device.createBindGroupLayout({
            label: 'writableTextureLayout',
            entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                storageTexture: {
                    access: 'write-only',
                    format: 'rgba8unorm'
                }
            }]
        }));
        const heightsLayout2 = new BindGroupLayout(engine.gpu, {
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage"
                }
            },{
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage"
                }
            }]
            
        })
        const normalsLayout=engine.gpu.device.createPipelineLayout({bindGroupLayouts:[settingsLayout.layout,writableStorageLayout.layout, heightsLayout2.layout]})
        const computePipelineNormals = new ComputePipeline(engine.gpu, 'terrain/calculateNormals.comp.wgsl', normalsLayout)
        const computePlaneHeights = new ComputePipeline(engine.gpu, 'terrain/calculatePlaneHeights.comp.wgsl');

        const terrainPositionAndUvsAndNormalsGPU_bgroup = (bindGroup: BindGroup) => [
            {
                binding: 0,
                resource: this.terrainPositionAndUvsAndNormalsGPU.getStorageBinding(bindGroup)
            }
        ];
        const bindGroupHeightsRead = heightsLayout2.createBindGroup('bindGroupHeightsRead', _heightsBindGroupEntries)
        //todo: remove unneeded flags
        const terrainIndicesGPU = Buffer.create(engine.gpu, this.#terrainIndicesLength, [GPUBufferUsage.INDEX, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC], 'terrainIndicesGPU');

        passEncoder.setPipeline(computePipelineIndices.pipeline);
        const settingsGPUBindGroup = computePipelineIndices.createBindGroup(0, 'settingsGPU',(bindGroup) => [{
            binding: 0,
            resource: this.settingsGPU.getUniformBinding(bindGroup)
        }])
        passEncoder.setBindGroup(0, settingsGPUBindGroup.bindGroup);
        passEncoder.setBindGroup(1, computePipelineIndices.createBindGroup(1,'terrainIndicesGPU',
            (bindGroup) => [{
                binding: 0,
                resource: terrainIndicesGPU.getStorageBinding(bindGroup)
            }
            ]
        ).bindGroup);
        passEncoder.dispatchWorkgroups(...Terrain.subdivisions);

        passEncoder.setPipeline(computePlaneHeights.pipeline);
        passEncoder.setBindGroup(0, computePlaneHeights.createBindGroup(0, 'settingsGPU', (bindGroup) => [{
            binding: 0,
            resource: this.settingsGPU.getUniformBinding(bindGroup)
        }]).bindGroup);
        passEncoder.setBindGroup(1, computePlaneHeights.createBindGroup(1,'terrainPositionAndUvsAndNormalsGPU', terrainPositionAndUvsAndNormalsGPU_bgroup).bindGroup);
        passEncoder.setBindGroup(2,
        new BindGroupLayout(engine.gpu, computePlaneHeights.pipeline.getBindGroupLayout(2)).createBindGroup('_heightsBindGroupEntries', _heightsBindGroupEntries).bindGroup)
        passEncoder.dispatchWorkgroups(...Terrain.subdivisions);

        passEncoder.setPipeline(computePipelineNormals.pipeline);
        passEncoder.setBindGroup(0, computePipelineNormals.createBindGroup(settingsLayout,'settingsGPU',(bindGroup) => [{
            binding: 0,
            resource: this.settingsGPU.getUniformBinding(bindGroup)
        }]).bindGroup)
        passEncoder.setBindGroup(1,         writableStorageLayout.createBindGroup('terrainPositionAndUvsAndNormalsGPU_bgroup', terrainPositionAndUvsAndNormalsGPU_bgroup).bindGroup        )
        passEncoder.setBindGroup(2, bindGroupHeightsRead.bindGroup)
        passEncoder.dispatchWorkgroups(Terrain.subdivisions[0] + 1, Terrain.subdivisions[1] + 1);
        const textureView=this.texture.createView();

        this.mesh = new TerrainMesh(scenes, textureView, this.terrainPositionAndUvsAndNormalsGPU, terrainIndicesGPU, new Float32Array(positionsCount*12), new Uint32Array(this.#terrainIndicesLength / 4), 12);

        this.ready = caches.match(new Request('/terrainTexture.webp')).then(async (cachedtexture) => {
            const textureSizeBytes = Int32Array.BYTES_PER_ELEMENT * (Terrain.textureSize[0] * Terrain.textureSize[1]);
            if (cachedtexture) {
                passEncoder.end();
                var gpuReadBufferPositions = this.terrainPositionAndUvsAndNormalsGPU.createReadCopy(commandEncoder)
                var gpuReadBufferIndices = terrainIndicesGPU.createReadCopy(commandEncoder);
                const bitmap = await createImageBitmap(await cachedtexture.blob());
                engine.gpu!.device.queue.copyExternalImageToTexture({source:bitmap},{texture: this.texture},Terrain.textureSize);
                engine.gpu!.device.queue.submit([commandEncoder.finish()]);
            } else {    
                const createTexturePipeline = new ComputePipeline(engine.gpu!, 
                    "terrain/createTerrainTexture.comp.wgsl",
                    engine.gpu!.device.createPipelineLayout(
                        {
                            bindGroupLayouts: [settingsLayout.layout,heightsLayout2.layout, writableTextureLayout.layout]
                        }
                    )
                );
                const bindGroup1 = createTexturePipeline.createBindGroup(writableTextureLayout, 'writableTexture',() => [
                    {
                        binding: 0,
                        resource: textureView,
                    }
                ])
                passEncoder.setPipeline(createTexturePipeline.pipeline);
                passEncoder.setBindGroup(1, bindGroupHeightsRead.bindGroup);
                passEncoder.setBindGroup(2, bindGroup1.bindGroup);
                passEncoder.dispatchWorkgroups(...Terrain.textureSize);
                passEncoder.end();


                // Get a GPU buffer for reading in an unmapped state.
                const gpuReadBuffer = new ReadBuffer(engine.gpu!, textureSizeBytes, 'terrainReaduBuffer');
                // Encode commands for copying buffer to buffer.
                gpuReadBuffer.copyFromTexture(commandEncoder, {texture: this.texture}, {bytesPerRow: 4*Terrain.textureSize[0]}, Terrain.textureSize )

                var gpuReadBufferPositions = this.terrainPositionAndUvsAndNormalsGPU.createReadCopy(commandEncoder);
                var gpuReadBufferIndices = terrainIndicesGPU.createReadCopy(commandEncoder);
                const gpuCommands = commandEncoder.finish();
                engine.gpu!.device.queue.submit([gpuCommands]);
                const c = new OffscreenCanvas(...Terrain.textureSize);
                const ctx = c.getContext("2d");
                if (!ctx)
                    throw (new Error('get 2d context failed'));
                gpuReadBuffer.readAndDestroy(async arrayBuffer =>{
                    ctx.putImageData(new ImageData(new Uint8ClampedArray(arrayBuffer), c.width, c.height), 0, 0);
                    const blob = await c.convertToBlob({ type: "image/webp", quality: 1 })
                    TerrainTool.saveTexture(await blob.arrayBuffer(), Terrain.textureSize);    
                })
            }

            const commandEncoder2 = engine.gpu!.device.createCommandEncoder({label: 'terrain_encoder2'});
            const readBuffer2 = this.facet12ArrGPUBuffer.createReadCopy(commandEncoder2);
            engine.gpu!.device.queue.submit([commandEncoder2.finish()]);
            readBuffer2.readAndDestroy(buff => {
                this.mesh.faces=new Float32Array(buff);
            });
            gpuReadBufferPositions.readAndDestroy(readbuff => {
                return gpuReadBufferIndices.readAndDestroy(buff => {
                    this.mesh.set_indices_and_vertices(new Uint32Array(buff),new Float32Array(readbuff));
                    this.updateSwap2(0, readbuff.byteLength, true);
                    this.serialize();
                });
            });
        }).catch(engine.showError)
    }
    /*
    #ratioX = Terrain.subdivisionsX / this.width;
    #ratioY = Terrain.subdivisionsY / this.height;
    getHeightAtCoordinates(x: number, z: number): number {
        let facet: Float32Array;
        let col = ((x + this.#maxX) * this.#ratioX) | 0;
        let row = (-(z + this.#maxZ) * this.#ratioY + Terrain.subdivisionsY) | 0;
        console.log(col, row);
        let pos: number = row * Terrain.subdivisionsX + col;
        try {
             //HOX!  this.facet1Arr and this.facet2Arr has now been combinet to this.facet12ArrCPUBuffer,
             //look and example from terrainWorker how to access its indices.

            if (z < -1 * x + this.slopeArr[pos]) {
                //@ts-ignore
                facet = new Float32Array(this.facet1Arr.buffer, pos << 4, 4) // << 4 =  4 *  Float32Array.BYTES_PER_ELEMENT
            }
            else {
                //@ts-ignore
                facet = new Float32Array(this.facet2Arr.buffer, pos << 4, 4) // << 4 = 4 *  Float32Array.BYTES_PER_ELEMENT
            }
        } catch (e) {
            if (e instanceof RangeError) {
                console.warn('Invalid coordinate to getHeightAtCoordinates ' + x + ' ' + z);
                return this.getHeightAtCoordinates(Math.min(Math.max(x, this.#minX + 1), this.#maxX - 1), Math.min(Math.max(z, this.#minZ + 1), this.#maxZ - 1))
            }
            throw (e);
        }
        return -(facet[0] * x + facet[2] * z + facet[3]) / facet[1];
    }*/
}
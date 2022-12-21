import type { Scene } from "../Scene.js";
import { TerrainTool } from "../tools/TerrainTool.js";
import { TerrainMesh } from "../GPU/Meshes/Terrain.js";
import type { PipelineLayout } from "../GPU/PipelineLayout.js";
import type { Engine } from "../engine.js";
import { Buffer, GPUBufferUsage, type CopySrcBuffer, ReadBuffer, WriteBuffer, CopyDstBuffer, BindUniformBuffer, BindStorageBuffer, VertexBuffer } from "../GPU/Buffer/Buffer.js";
import type { BindGroup } from "../GPU/BindGroup.js";
import { TextureUsageEnums } from "../GPU/Texture.js";
import { TextureView } from "../GPU/TextureView.js";
import { RenderTarget } from "../GPU/RenderTargets/RenderTarget.js";
import { CalculatePlaneIndices } from "../GPU/Shaders/calculatePlaneIndices.comp.js";
import { ComputePipeline2 } from "../GPU/ComputePipeline2.js";
import { CalculatePlaneHeights } from "../GPU/Shaders/calculatePlaneHeights.comp.js";
import { CalculateNormals } from "../GPU/Shaders/CalculateNormals.comp.js";
import { BindGroupLayout2, type GPUBindGroupLayoutEntryBuffer } from "../GPU/BindGroupLayout2.js";
import { CreateGroundFromHeightMap } from "../GPU/Shaders/CreateGroundFromHeightMap.comp.js";
import type { GPU } from '../GPU.js'
import { CreateTerrainTexture } from "../GPU/Shaders/CreateTerrainTexture.comp.js";
declare const engine: Engine;



export class Terrain {
    /*
TODO
     - No writable storage buffer layouts to vertex/fragment shader

     * */

    // 1000 * 1000: 40 - 50ms when no collision
    static readonly #subdivisions = [64, 64] as const;
    static readonly size = [10000, 10000] as const;
    static readonly #maxXZ = [Terrain.size[0] / 2.0, Terrain.size[1] / 2.0] as const;
    static readonly #minmax = [-2, 500] as const;
    static readonly #textureSize = { width: 8192, height: 8192 } as const;

    readonly slopeArrGPUBuffer: BindStorageBuffer;
    //TODO: Remove copy_src

    readonly facet12ArrGPUBuffer: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer
    readonly facet12ArrGPUBufferSwap: WriteBuffer;


    readonly mesh: TerrainMesh;

    readonly TerrainHeightsbindGroupTree: PipelineLayout;
    readonly #ready: Promise<void>;
    readonly #terrainIndicesLength = Uint32Array.BYTES_PER_ELEMENT * (Terrain.#subdivisions[0] * Terrain.#subdivisions[1] * 6);

    #autosave = 0;

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




    updateSwap2(offset = 0, byteLength: number, nofaces = false) {
        if (!engine.gpu)
            return
        const b1 = Buffer.create(engine.gpu, byteLength, [GPUBufferUsage.COPY_SRC], 'terrain_b1', (b) => {
            new Float32Array(b.getMappedRange()).set(
                new Float32Array(engine.memory.buffer, engine.rust.vertices_pointer(this.mesh.ptr) + offset, byteLength / 4)
            )
        });

        const commandEncoder = engine.gpu.device.createCommandEncoder({ label: 'updateSwap2_encoder' });
        b1.copyTo(commandEncoder, this.terrainPositionAndUvsAndNormalsGPU, 0, offset, byteLength)
        let b2: CopySrcBuffer;
        if (!nofaces) {
            const facesByteLength = this.mesh.faces_count * 4 * Float32Array.BYTES_PER_ELEMENT;
            b2 = Buffer.create(engine.gpu, facesByteLength, [GPUBufferUsage.COPY_SRC], 'terrain_b2', b => {
                new Float32Array(b.getMappedRange()).set(new Float32Array(engine.memory.buffer, engine.rust.faces_pointer(this.mesh.ptr), this.mesh.faces_count * 4))
            });
            b2.copyTo(commandEncoder, this.facet12ArrGPUBuffer, 0, 0, facesByteLength);
            engine.gpu.device.queue.submit([commandEncoder.finish()]);
            b2.destroy();
        }
        b1.destroy();
        clearTimeout(this.#autosave);
        this.#autosave = setTimeout(() => this.#serialize(), 10000)

    }

    static async loadFromTexture(gpu: GPU, scenes: Scene[]): Promise<Terrain> {
        const settingsLayout = new BindGroupLayout2(gpu, 'settingsBindGroupLayout',
        {
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "uniform",
            hasDynamicOffset: false,
            minBindingSize: 48
          }
        });
        const settingsGPU = Buffer.create(gpu, 48, [GPUBufferUsage.STORAGE, GPUBufferUsage.UNIFORM], 'settingsGPU', b => {
            const sourcearrSettings = b.getMappedRange();
            new Uint32Array(sourcearrSettings).set(this.size);   // terrain width and height
            new Uint32Array(sourcearrSettings, 8).set(Terrain.#subdivisions);
            new Uint32Array(sourcearrSettings, 16).set([Terrain.#subdivisions[0]]);       //subdivisions
            new Int32Array(sourcearrSettings, 24).set(Terrain.#minmax); //min and max height,
            new Int32Array(sourcearrSettings, 32).set(Terrain.#maxXZ); //maxX, maxZ
            new Int32Array(sourcearrSettings, 40).set([Terrain.#textureSize.width, Terrain.#textureSize.height]); //texture size
        });
        const positionsCount = ((size: number) => {
            while (size % 4 !== 0)
                size++;
            return size;
        })((Terrain.#subdivisions[0] + 1) * (Terrain.#subdivisions[1] + 1));

        const positionsLength = Float32Array.BYTES_PER_ELEMENT * positionsCount * 4;
        const uvsLength = Float32Array.BYTES_PER_ELEMENT * positionsCount * 4;
        const normalsLength = Float32Array.BYTES_PER_ELEMENT * positionsCount * 4;
        const verticesBufferSize = positionsLength + uvsLength + normalsLength

        const t = await caches.match(new Request('/terrain')).then(async cachedvertices => {
            if (cachedvertices) {
                const cachedBuffer = await Terrain.fromSave(cachedvertices);
                var terrainPositionAndUvsAndNormalsGPU = Buffer.create(gpu, verticesBufferSize, [GPUBufferUsage.STORAGE, GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC], 'terrainPositionAndUvsAndNormalsGPU',
                    b => {
                        new Uint8Array(b.getMappedRange()).set(new Uint8Array(cachedBuffer));
                    })
            } else {
                const b = await (await fetch('/images/tenerife250.webp')).blob();

                const bitmap = await createImageBitmap(b);
                const texture = gpu.device.createTexture({
                    format: 'rgba8unorm',
                    size: [bitmap.width, bitmap.height],
                    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
                })
                gpu.device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [bitmap.width, bitmap.height]);
                const CreateGroundFromHeightMapShader = new CreateGroundFromHeightMap(settingsLayout);
                const computePipeline = CreateGroundFromHeightMapShader.createComputePipeline('main')

                
                const bindGroupSettings = CreateGroundFromHeightMapShader.bindLayouts[0].createBindGroup('bindGroupSettings', (bindGroup) => [{
                    binding: 0,
                    resource: settingsGPU.getUniformBinding(bindGroup)
                }]);
                const commandEncoder = gpu.device.createCommandEncoder({ label: 'loadFromTexture_encoder' });
                const passEncoder = commandEncoder.beginComputePass({ label: 'loadFromTexture_encoder_pass_encoder' });
                passEncoder.setBindGroup(0, bindGroupSettings.bindGroup);
                var terrainPositionAndUvsAndNormalsGPU = Buffer.create(gpu, verticesBufferSize, [GPUBufferUsage.STORAGE, GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC], 'terrainPositionAndUvsAndNormalsGPU')
                const sourceBindGroup = CreateGroundFromHeightMapShader.bindLayouts[1].createBindGroup('sourceBindGroup', (bindGroup) => [
                    {
                        binding: 0,
                        resource: terrainPositionAndUvsAndNormalsGPU.getStorageBinding(bindGroup)
                    },
                    {
                        binding: 1,
                        resource: texture.createView()
                    }
                ]);
                passEncoder.setPipeline(computePipeline);
                passEncoder.setBindGroup(1, sourceBindGroup.bindGroup);
                passEncoder.dispatchWorkgroups(Terrain.#subdivisions[0] + 1, Terrain.#subdivisions[1] + 1);
                passEncoder.end();
                gpu.device.queue.submit([commandEncoder.finish()]);
            }
            const terrain = new Terrain(scenes,settingsLayout, settingsGPU, terrainPositionAndUvsAndNormalsGPU);
            await terrain.#ready;
            return terrain;

        })
        return t;
    }

    async #serialize(compress = false) {
        const cacheP = caches.open('save');
        if (!compress) {
            const response = new Response(this.mesh.vertices);
            response.headers.set('content-length', (this.mesh.vertices_count * Float32Array.BYTES_PER_ELEMENT * this.mesh.vertices_stride).toString());
            response.headers.set('content-type', 'application/octet-stream');

            const indices = this.mesh.indices;
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

    readonly texture: RenderTarget<"rgba8unorm", 31>;

    constructor(
        public scenes: Scene[],
        public settingsLayout: BindGroupLayout2<[GPUBindGroupLayoutEntryBuffer]>,
        public settingsGPU: BindUniformBuffer & BindStorageBuffer,
        private terrainPositionAndUvsAndNormalsGPU: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer & VertexBuffer
    ) {
        if (!engine.gpu) {
            throw (new Error('Terrain mesh needs GPU'));
        }
        this.slopeArrGPUBuffer = Buffer.create(engine.gpu, Int32Array.BYTES_PER_ELEMENT * Terrain.#subdivisions[0] * Terrain.#subdivisions[1], [GPUBufferUsage.STORAGE], 'slopeArrGPUBuffer');
        this.facet12ArrGPUBuffer = Buffer.create(engine.gpu, Float32Array.BYTES_PER_ELEMENT * Terrain.#subdivisions[0] * Terrain.#subdivisions[1] * 4 * 2, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC], 'facet12ArrGPUBuffer');
        this.facet12ArrGPUBufferSwap = new WriteBuffer(engine.gpu, Float32Array.BYTES_PER_ELEMENT * Terrain.#subdivisions[0] * Terrain.#subdivisions[1] * 4 * 2, 'facet12ArrGPUBufferSwap');
        this.texture = new RenderTarget({
            gpu: engine.gpu,
            format: 'rgba8unorm',
            label: 'Terrain',
            size: Terrain.#textureSize,
            usages: TextureUsageEnums["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC|STORAGE_BINDING"]
        })
        const _heightsBindGroupEntries = (bindGroup: BindGroup) => [
            {
                binding: 0,
                resource: this.slopeArrGPUBuffer.getStorageBinding(bindGroup)
            },
            {
                binding: 1,
                resource: this.facet12ArrGPUBuffer.getStorageBinding(bindGroup)
            }
        ] as const
        const heightsLayout = new BindGroupLayout2(engine.gpu, 'terrain',
            {
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "read-only-storage",
                    minBindingSize: 32
                },
            },
            {
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "read-only-storage",
                    minBindingSize: 32
                }
            },
            {
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "read-only-storage",
                    minBindingSize: 32
                }
            }
        )
        this.TerrainHeightsbindGroupTree = engine.gpu.positionBindGroupTimeWGSL.addChildBindGroup('terrain',
            heightsLayout.createBindGroup('TerrainHeightsbindGroupTree', bindGroup => [
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
        
        const calculatePlaneIndicesShader = new CalculatePlaneIndices(settingsLayout);
        
        const computePipelineIndices = calculatePlaneIndicesShader.createComputePipeline('main');

        const positionsCount = ((size: number) => {
            while (size % 4 !== 0)
                size++;
            return size;
        })((Terrain.#subdivisions[0] + 1) * (Terrain.#subdivisions[1] + 1));


        const commandEncoder = engine.gpu.device.createCommandEncoder({ label: 'terrain_encoder' });
        const passEncoder = commandEncoder.beginComputePass({ label: 'terrain_pass_encoder' });

        //const computePipelineNormals = new ComputePipeline(engine.gpu, 'terrain/calculateNormals.comp.wgsl', normalsLayout)
        const slopesLayout = new BindGroupLayout2(engine.gpu, 'slopesAndFacesBindGroupLayoutReadOnly',
        {
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
            minBindingSize: 32
          },
        },
        {
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
            minBindingSize: 32
          }
        });
        const calculateNormalsShader = new CalculateNormals(settingsLayout, slopesLayout);
        const computePipelineNormals = new ComputePipeline2(calculateNormalsShader, 'main');
        const computePlaneHeightsShader = new CalculatePlaneHeights(settingsLayout);
        const computePlaneHeights = new ComputePipeline2(computePlaneHeightsShader, 'main');

        const terrainPositionAndUvsAndNormalsGPU_bgroup = (bindGroup: BindGroup) => [
            {
                binding: 0,
                resource: this.terrainPositionAndUvsAndNormalsGPU.getStorageBinding(bindGroup)
            }
        ] as const;
        //todo: remove unneeded flags
        const terrainIndicesGPU = Buffer.create(engine.gpu, this.#terrainIndicesLength, [GPUBufferUsage.INDEX, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC], 'terrainIndicesGPU');

        passEncoder.setPipeline(computePipelineIndices);

        const settingsGPUBindGroup = calculatePlaneIndicesShader.bindLayouts[0].createBindGroup('settingsGPU',
            (bindGroup) => [{
                binding: 0,
                resource: this.settingsGPU.getUniformBinding(bindGroup)
            }])
        passEncoder.setBindGroup(0, settingsGPUBindGroup.bindGroup);

        passEncoder.setBindGroup(1, calculatePlaneIndicesShader.bindLayouts[1].createBindGroup('terrainIndicesGPU',
            (bindGroup) => [{
                binding: 0,
                resource: terrainIndicesGPU.getStorageBinding(bindGroup)
            }
            ]
        ).bindGroup);
        passEncoder.dispatchWorkgroups(...Terrain.#subdivisions);

        passEncoder.setPipeline(computePlaneHeights.pipeline);
        passEncoder.setBindGroup(0, settingsGPUBindGroup.bindGroup);
        passEncoder.setBindGroup(1, computePlaneHeightsShader.bindLayouts[1].createBindGroup('terrainPositionAndUvsAndNormalsGPU', terrainPositionAndUvsAndNormalsGPU_bgroup).bindGroup);
        
        passEncoder.setBindGroup(2, computePlaneHeightsShader.bindLayouts[2].createBindGroup('_heightsBindGroupEntries',_heightsBindGroupEntries).bindGroup)
        passEncoder.dispatchWorkgroups(...Terrain.#subdivisions);

        passEncoder.setPipeline(computePipelineNormals.pipeline);
       
        passEncoder.setBindGroup(0, settingsGPUBindGroup.bindGroup)
        passEncoder.setBindGroup(1, calculateNormalsShader.bindLayouts[1].createBindGroup('terrainPositionAndUvsAndNormalsGPU_bgroup', terrainPositionAndUvsAndNormalsGPU_bgroup).bindGroup)
        passEncoder.setBindGroup(2,  calculateNormalsShader.bindLayouts[2].createBindGroup('bindGroupHeightsRead2', _heightsBindGroupEntries).bindGroup)
        passEncoder.dispatchWorkgroups(Terrain.#subdivisions[0] + 1, Terrain.#subdivisions[1] + 1);
        const textureView = new TextureView(this.texture);

        this.mesh = new TerrainMesh(scenes, textureView, this.terrainPositionAndUvsAndNormalsGPU, terrainIndicesGPU, new Float32Array(positionsCount * 12), new Uint32Array(this.#terrainIndicesLength / 4), 12);

        this.#ready = caches.match(new Request('/terrainTexture.webp')).then(async (cachedtexture) => {
            const textureSizeBytes = Int32Array.BYTES_PER_ELEMENT * (Terrain.#textureSize.width * Terrain.#textureSize.height);
            if (cachedtexture) {
                passEncoder.end();
                var gpuReadBufferPositions = this.terrainPositionAndUvsAndNormalsGPU.createReadCopy(commandEncoder)
                var gpuReadBufferIndices = terrainIndicesGPU.createReadCopy(commandEncoder);
                const bitmap = await createImageBitmap(await cachedtexture.blob());
                this.texture.copyFromExternalImage({ source: bitmap }, {}, Terrain.#textureSize);
                engine.gpu!.device.queue.submit([commandEncoder.finish()]);
            } else {
                const createTextureShader = new CreateTerrainTexture(this.settingsLayout, slopesLayout)
                const createTexturePipeline = createTextureShader.createComputePipeline('main')
                const bindGroup1 = createTextureShader.bindLayouts[2].createBindGroup('writableTexture', (bindGroup) => [
                    {
                        binding: 0,
                        resource: textureView.getTextureBinding(bindGroup),
                    }
                ])
                passEncoder.setPipeline(createTexturePipeline);
                const bindGroupHeightsRead = createTextureShader.bindLayouts[1].createBindGroup('bindGroupHeightsRead', _heightsBindGroupEntries)

                passEncoder.setBindGroup(1, bindGroupHeightsRead.bindGroup);
                passEncoder.setBindGroup(2, bindGroup1.bindGroup);
                passEncoder.dispatchWorkgroups(Terrain.#textureSize.width, Terrain.#textureSize.height);
                passEncoder.end();


                // Get a GPU buffer for reading in an unmapped state.
                const gpuReadBuffer = new ReadBuffer(engine.gpu!, textureSizeBytes, 'terrainReaduBuffer');
                // Encode commands for copying buffer to buffer.
                gpuReadBuffer.copyFromTexture(commandEncoder, { texture: this.texture.texture }, { bytesPerRow: 4 * Terrain.#textureSize.width }, Terrain.#textureSize)

                var gpuReadBufferPositions = this.terrainPositionAndUvsAndNormalsGPU.createReadCopy(commandEncoder);
                var gpuReadBufferIndices = terrainIndicesGPU.createReadCopy(commandEncoder);
                const gpuCommands = commandEncoder.finish();
                engine.gpu!.device.queue.submit([gpuCommands]);
                const c = new OffscreenCanvas(Terrain.#textureSize.width, Terrain.#textureSize.height);
                const ctx = c.getContext("2d");
                if (!ctx)
                    throw (new Error('get 2d context failed'));
                gpuReadBuffer.readAndDestroy(async arrayBuffer => {
                    ctx.putImageData(new ImageData(new Uint8ClampedArray(arrayBuffer), c.width, c.height), 0, 0);
                    const blob = await c.convertToBlob({ type: "image/webp", quality: 1 })
                    TerrainTool.saveTexture(await blob.arrayBuffer(), [Terrain.#textureSize.width, Terrain.#textureSize.height]);
                })
            }

            const commandEncoder2 = engine.gpu!.device.createCommandEncoder({ label: 'terrain_encoder2' });
            const readBuffer2 = this.facet12ArrGPUBuffer.createReadCopy(commandEncoder2);
            engine.gpu!.device.queue.submit([commandEncoder2.finish()]);
            readBuffer2.readAndDestroy(buff => {
                this.mesh.faces = new Float32Array(buff);
            });
            gpuReadBufferPositions.readAndDestroy(readbuff => {
                return gpuReadBufferIndices.readAndDestroy(buff => {
                    this.mesh.set_indices_and_vertices(new Uint32Array(buff), new Float32Array(readbuff));
                    this.updateSwap2(0, readbuff.byteLength, true);
                    this.#serialize();
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
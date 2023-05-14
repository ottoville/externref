import type { Scene } from "../Scene.js";
import { TerrainTool } from "../tools/TerrainTool.js";
import { TerrainMesh } from "../GPU/Meshes/Terrain.js";
import type { Engine } from "../engine.js";
import { Buffer, GPUBufferUsage, type CopySrcBuffer, ReadBuffer, WriteBuffer, CopyDstBuffer, BindStorageBuffer, VertexBuffer } from "../GPU/Buffer/Buffer.js";
import type { BindGroup } from "../GPU/BindGroup.js";
import { TextureUsageEnums } from "../GPU/Texture.js";
import { TextureView } from "../GPU/TextureView.js";
import { RenderTarget } from "../GPU/RenderTargets/RenderTarget.js";
import { CalculatePlaneIndices } from "../GPU/Shaders/calculatePlaneIndices.comp.js";
import { CalculatePlaneHeights } from "../GPU/Shaders/calculatePlaneHeights.comp.js";
import { CalculateNormals } from "../GPU/Shaders/CalculateNormals.comp.js";
import { BGLayout, BufLayout, ShaderStage } from "../GPU/BindGroupLayout.js";
import { CreateGroundFromHeightMap } from "../GPU/Shaders/CreateGroundFromHeightMap.comp.js";
import type { GPU } from '../GPU.js'
import { CreateTerrainTexture } from "../GPU/Shaders/CreateTerrainTexture.comp.js";
import { BindablePipelineLayout } from "../GPU/PipelineLayout.js";
import { IntArray, MeshUniforms, PlaneArray, Slopes } from "../GPU/Shaders/structs/Structs.js";
import { allocate_vec } from "../nodes/DataNode.js";
declare const engine: Engine;


const terrainSize = [10000, 10000] as const;
const subdivisions = [64, 64] as const
export class Terrain {
    /*
TODO
     - No writable storage buffer layouts to vertex/fragment shader

     * */

    // 1000 * 1000: 40 - 50ms when no collision
    static readonly #subdivisions = [64, 64] as const;
    static readonly size = [10000, 10000] as const;
    static readonly #textureSize = { width: 8192, height: 8192 } as const;


    static readonly settings = {
        subdivisions: subdivisions,
        size: terrainSize,
        minmax: [-2, 500] as const,
        maxXZ: [terrainSize[0] / 2.0, terrainSize[1] / 2.0] as const,
        textureSize: { width: 8192, height: 8192 } as const,
        facetSize: subdivisions[0] * subdivisions[1]
    } as const
    settings = Terrain.settings;

    readonly slopeArrGPUBuffer: BindStorageBuffer;
    //TODO: Remove copy_src

    readonly facet12ArrGPUBuffer: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer
    readonly facet12ArrGPUBufferSwap: WriteBuffer;


    readonly mesh: TerrainMesh;

    TerrainHeightsbindGroupTree: BindablePipelineLayout<[
        typeof this.gpu.sizeBindGroupLayout,
        typeof this.gpu.uniformBindGroupLayoutWithTime,
        BGLayout<[BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>]>,
        typeof this.heightsLayout
    ]>;

    readonly #ready: Promise<void>;
    readonly #terrainIndicesLength = Uint32Array.BYTES_PER_ELEMENT * (Terrain.#subdivisions[0] * Terrain.#subdivisions[1] * 6);

    #autosave = 0;
    heightsLayout: BGLayout<[
        BufLayout<ShaderStage.VERTEX, typeof IntArray>,
        BufLayout<ShaderStage.VERTEX, typeof PlaneArray>,
    ]>;

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
                new Float32Array(engine.memory.buffer, engine.rust.vertices_pointer(this.mesh.id) + offset, byteLength / 4)
            )
        });

        const commandEncoder = engine.gpu.device.createCommandEncoder({ label: 'updateSwap2_encoder' });
        b1.copyTo(commandEncoder, this.terrainPositionAndUvsAndNormalsGPU, 0, offset, byteLength)
        let b2: CopySrcBuffer;
        if (!nofaces) {
            const facesByteLength = this.mesh.faces_count * 4 * Float32Array.BYTES_PER_ELEMENT;
            b2 = Buffer.create(engine.gpu, facesByteLength, [GPUBufferUsage.COPY_SRC], 'terrain_b2', b => {
                new Float32Array(b.getMappedRange()).set(new Float32Array(engine.memory.buffer, engine.rust.faces_pointer(this.mesh.id), this.mesh.faces_count * 4))
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
                const CreateGroundFromHeightMapShader = new CreateGroundFromHeightMap(gpu, this.settings);

                const computePipelineP = CreateGroundFromHeightMapShader.createComputePipeline('main')

                const b = await (await fetch('/images/tenerife250.webp')).blob();

                const bitmap = await createImageBitmap(b);
                const texture = gpu.device.createTexture({
                    format: 'rgba8unorm',
                    size: [bitmap.width, bitmap.height],
                    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
                })
                gpu.device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [bitmap.width, bitmap.height]);

                const commandEncoder = gpu.device.createCommandEncoder({ label: 'loadFromTexture_encoder' });
                const passEncoder = commandEncoder.beginComputePass({ label: 'loadFromTexture_encoder_pass_encoder' });
                var terrainPositionAndUvsAndNormalsGPU = Buffer.create(gpu, verticesBufferSize, [GPUBufferUsage.STORAGE, GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC], 'terrainPositionAndUvsAndNormalsGPU')
                const sourceBindGroup = CreateGroundFromHeightMapShader.props.bindGroupLayouts[0].createBindGroup('sourceBindGroup', (bindGroup) => [
                    {
                        binding: 0,
                        resource: terrainPositionAndUvsAndNormalsGPU.getStorageBinding(bindGroup)
                    },
                    {
                        binding: 1,
                        resource: texture.createView()
                    }
                ]);
                passEncoder.setPipeline(await computePipelineP);
                passEncoder.setBindGroup(0, sourceBindGroup.bindGroup);
                passEncoder.dispatchWorkgroups(Terrain.#subdivisions[0] + 1, Terrain.#subdivisions[1] + 1);
                passEncoder.end();
                gpu.device.queue.submit([commandEncoder.finish()]);
            }

            const slopesLayout = new BGLayout(gpu, 'slopesAndFacesBindGroupLayoutReadOnly',
                new BufLayout(
                    {
                        visibility: ShaderStage.COMPUTE,
                        buffer: {
                            type: "read-only-storage",
                            hasDynamicOffset: false,
                            minBindingSize: 32
                        },
                    }, 'slopes', Slopes),
                new BufLayout(
                    {
                        visibility: ShaderStage.COMPUTE,
                        buffer: {
                            type: "read-only-storage",
                            hasDynamicOffset: false,
                            minBindingSize: 32
                        }
                    }, 'facet12', PlaneArray));

            const shaders = {
                calculatePlaneIndices: new CalculatePlaneIndices(gpu, this.settings),
                computePlaneHeights: new CalculatePlaneHeights(gpu, this.settings),
                calculateNormals: new CalculateNormals(this.settings, slopesLayout),
                createTexture: new CreateTerrainTexture(this.settings, slopesLayout)
            }


            const pipelines: [Indices: GPUComputePipeline, Heights: GPUComputePipeline, Normals: GPUComputePipeline, Texture: GPUComputePipeline] = await Promise.all([
                shaders.calculatePlaneIndices.createComputePipeline('main'),
                shaders.computePlaneHeights.createComputePipeline('main'),
                shaders.calculateNormals.createComputePipeline('main'),
                shaders.createTexture.createComputePipeline('main')
            ]);
            const terrain = new Terrain(
                gpu,
                scenes,
                slopesLayout,
                shaders,
                terrainPositionAndUvsAndNormalsGPU,
                pipelines,
                positionsCount);
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

            const indices = this.mesh.indexed.indices;
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
        public gpu: GPU,
        public scenes: Scene[],
        slopesLayout: BGLayout<[BufLayout, BufLayout]>,
        shaders: {
            calculatePlaneIndices: CalculatePlaneIndices;
            computePlaneHeights: CalculatePlaneHeights;
            calculateNormals: CalculateNormals;
            createTexture: CreateTerrainTexture;
        },
        private terrainPositionAndUvsAndNormalsGPU: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer & VertexBuffer,
        [computePipelineIndices, computePlaneHeights, computePipelineNormals, createTexturePipeline]: [Indices: GPUComputePipeline, Heights: GPUComputePipeline, Normals: GPUComputePipeline, Texture: GPUComputePipeline],
        positionsCount: number
    ) {
        this.slopeArrGPUBuffer = Buffer.create(gpu, Int32Array.BYTES_PER_ELEMENT * Terrain.#subdivisions[0] * Terrain.#subdivisions[1], [GPUBufferUsage.STORAGE], 'slopeArrGPUBuffer');
        this.facet12ArrGPUBuffer = Buffer.create(gpu, Float32Array.BYTES_PER_ELEMENT * Terrain.#subdivisions[0] * Terrain.#subdivisions[1] * 4 * 2, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC], 'facet12ArrGPUBuffer');
        this.facet12ArrGPUBufferSwap = new WriteBuffer(gpu, Float32Array.BYTES_PER_ELEMENT * Terrain.#subdivisions[0] * Terrain.#subdivisions[1] * 4 * 2, 'facet12ArrGPUBufferSwap');
        this.texture = new RenderTarget({
            gpu,
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
        this.heightsLayout = new BGLayout(gpu, 'terrainBindGroupLayout',
            new BufLayout(
                {
                    visibility: ShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage",
                        minBindingSize: 32
                    },
                }, 'slopes', IntArray),
            new BufLayout(
                {
                    visibility: ShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage",
                        minBindingSize: 32
                    }
                }, 'facet12', PlaneArray)
        )
        this.TerrainHeightsbindGroupTree = gpu.positionAndTimeBindGroup.addChildBindGroupLayout('terrainPipelineLayout',
            this.heightsLayout.createBindGroup('TerrainHeightsbindGroupTree', bindGroup => [
                {
                    binding: 0,
                    resource: this.slopeArrGPUBuffer.getStorageBinding(bindGroup)
                },
                {
                    binding: 1,
                    resource: this.facet12ArrGPUBuffer.getStorageBinding(bindGroup)
                }
            ]));



        const commandEncoder = gpu.device.createCommandEncoder({ label: 'terrain_encoder' });
        const passEncoder = commandEncoder.beginComputePass({ label: 'terrain_pass_encoder' });


        const terrainPositionAndUvsAndNormalsGPU_bgroup = (bindGroup: BindGroup) => [
            {
                binding: 0,
                resource: this.terrainPositionAndUvsAndNormalsGPU.getStorageBinding(bindGroup)
            }
        ] as const;
        //todo: remove unneeded flags
        const terrainIndicesGPU = Buffer.create(gpu, this.#terrainIndicesLength, [GPUBufferUsage.INDEX, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC], 'terrainIndicesGPUBuffer');

        passEncoder.setPipeline(computePipelineIndices);

        passEncoder.setBindGroup(0,
            shaders.calculatePlaneIndices.props.bindGroupLayouts[0].createBindGroup('terrainIndicesGPUBindgroup',
                (bindGroup) => [
                    {
                        binding: 0,
                        resource: terrainIndicesGPU.getStorageBinding(bindGroup)
                    }
                ]
            ).bindGroup);
        passEncoder.dispatchWorkgroups(...Terrain.#subdivisions);

        passEncoder.setPipeline(computePlaneHeights);
        passEncoder.setBindGroup(0, shaders.computePlaneHeights.props.bindGroupLayouts[0].createBindGroup('terrainPositionAndUvsAndNormalsGPU', terrainPositionAndUvsAndNormalsGPU_bgroup).bindGroup);

        passEncoder.setBindGroup(1, shaders.computePlaneHeights.props.bindGroupLayouts[1].createBindGroup('_heightsBindGroupEntries', _heightsBindGroupEntries).bindGroup)
        passEncoder.dispatchWorkgroups(...Terrain.#subdivisions);

        passEncoder.setPipeline(computePipelineNormals);

        passEncoder.setBindGroup(0, shaders.calculateNormals.props.bindGroupLayouts[0].createBindGroup('terrainPositionAndUvsAndNormalsGPU_bgroup', terrainPositionAndUvsAndNormalsGPU_bgroup).bindGroup)
        passEncoder.setBindGroup(1, slopesLayout.createBindGroup('bindGroupHeightsRead2', _heightsBindGroupEntries).bindGroup)
        passEncoder.dispatchWorkgroups(Terrain.#subdivisions[0] + 1, Terrain.#subdivisions[1] + 1);
        const textureView = new TextureView(this.texture);
        this.mesh = new TerrainMesh(scenes, textureView, this.terrainPositionAndUvsAndNormalsGPU, terrainIndicesGPU, allocate_vec(new Float32Array(positionsCount * 12)), allocate_vec(new Uint32Array(this.#terrainIndicesLength / 4)), 12);

        this.#ready = caches.match(new Request('/terrainTexture.webp')).then(async (cachedtexture) => {
            const textureSizeBytes = Int32Array.BYTES_PER_ELEMENT * (Terrain.#textureSize.width * Terrain.#textureSize.height);
            if (cachedtexture) {
                passEncoder.end();
                var gpuReadBufferPositions = this.terrainPositionAndUvsAndNormalsGPU.createReadCopy(commandEncoder)
                var gpuReadBufferIndices = terrainIndicesGPU.createReadCopy(commandEncoder);
                const bitmap = await createImageBitmap(await cachedtexture.blob());
                this.texture.copyFromExternalImage({ source: bitmap }, {}, Terrain.#textureSize);
                gpu.device.queue.submit([commandEncoder.finish()]);
            } else {
                const bindGroup1 = shaders.createTexture.props.bindGroupLayouts[1].createBindGroup('writableTexture', (bindGroup) => [
                    {
                        binding: 0,
                        resource: textureView.getTextureBinding(bindGroup),
                    }
                ])
                passEncoder.setPipeline(createTexturePipeline);
                const bindGroupHeightsRead = slopesLayout.createBindGroup('bindGroupHeightsRead', _heightsBindGroupEntries)

                passEncoder.setBindGroup(0, bindGroupHeightsRead.bindGroup);
                passEncoder.setBindGroup(1, bindGroup1.bindGroup);
                passEncoder.dispatchWorkgroups(Terrain.#textureSize.width, Terrain.#textureSize.height);
                passEncoder.end();


                // Get a GPU buffer for reading in an unmapped state.
                const gpuReadBuffer = new ReadBuffer(gpu, textureSizeBytes, 'terrainReaduBuffer');
                // Encode commands for copying buffer to buffer.
                gpuReadBuffer.copyFromTexture(commandEncoder, { texture: this.texture.texture }, { bytesPerRow: 4 * Terrain.#textureSize.width }, Terrain.#textureSize)

                var gpuReadBufferPositions = this.terrainPositionAndUvsAndNormalsGPU.createReadCopy(commandEncoder);
                var gpuReadBufferIndices = terrainIndicesGPU.createReadCopy(commandEncoder);
                const gpuCommands = commandEncoder.finish();
                gpu.device.queue.submit([gpuCommands]);
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

            const commandEncoder2 = gpu.device.createCommandEncoder({ label: 'terrain_encoder2' });
            const readBuffer2 = this.facet12ArrGPUBuffer.createReadCopy(commandEncoder2);
            gpu.device.queue.submit([commandEncoder2.finish()]);
            readBuffer2.readAndDestroy(buff => {
                this.mesh.faces = new Float32Array(buff);
            });
            gpuReadBufferPositions.readAndDestroy(readbuff => {
                return gpuReadBufferIndices.readAndDestroy(buff => {
                    this.mesh.indexed.set_indices_and_vertices(new Uint32Array(buff), new Float32Array(readbuff));
                    this.updateSwap2(0, readbuff.byteLength, true);
                    this.#serialize();
                });
            });
        }).catch(err => engine.showError(err))
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
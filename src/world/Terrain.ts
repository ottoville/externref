import type { Scene } from '../Scene.js';
import { TerrainTool } from '../tools/TerrainTool.js';
import { TerrainMesh } from '../GPU/Meshes/Terrain.js';
import type { Engine } from '../engine.js';
import { Buffer, GPUBufferUsage, type CopySrcBuffer, ReadBuffer, WriteBuffer, CopyDstBuffer, BindStorageBuffer, VertexBuffer } from '../GPU/Buffer/Buffer.js';
import type { BindGroup } from '../GPU/BindGroup.js';
import { RenderTarget, Texture, TextureUsageEnums, copyDstTexture, copySrcTexture } from '../GPU/Texture.js';
import { TextureView } from '../GPU/TextureView.js';
import { CalculatePlaneIndices } from '../GPU/Shaders/calculatePlaneIndices.comp.js';
import { CalculatePlaneHeights } from '../GPU/Shaders/calculatePlaneHeights.comp.js';
import { CalculateNormals } from '../GPU/Shaders/CalculateNormals.comp.js';
import { BGLayout, BufLayout, ShaderStage } from '../GPU/BindGroupLayout.js';
import { CreateGroundFromHeightMap } from '../GPU/Shaders/CreateGroundFromHeightMap.comp.js';
import { GPU } from '../GPU.js';
import { CreateTerrainTexture, SlopesLayout } from '../GPU/Shaders/CreateTerrainTexture.comp.js';
import { BindablePipelineLayout } from '../GPU/PipelineLayout.js';
import { IntArray, MeshUniforms, PlaneArray } from '../GPU/Shaders/structs/Structs.js';
import { allocate_vec } from '../nodes/DataNode.js';
declare const engine: Engine;


const terrainSize = [
    10000,
    10000
] as const;
const subdivisions = [
    64,
    64
] as const;
export class Terrain {
    /*
TODO
     - No writable storage buffer layouts to vertex/fragment shader

     * */

    // 1000 * 1000: 40 - 50ms when no collision
    static readonly #subdivisions = [
        64,
        64
    ] as const;
    static readonly size = [
        10000,
        10000
    ] as const;
    static readonly #textureSize = {
        height: 8192, width: 8192,
    } as const;


    static readonly settings = {
        facetSize: subdivisions[0] * subdivisions[1],
        maxXZ: [
            terrainSize[0] / 2.0,
            terrainSize[1] / 2.0
        ] as const,
        minmax: [
            -2,
            500
        ] as const,
        size: terrainSize,
        subdivisions: subdivisions,
        textureSize: {
            height: 8192, width: 8192,
        } as const,
    } as const;
    settings = Terrain.settings;

    readonly slopeArrGPUBuffer: BindStorageBuffer;
    //TODO: Remove copy_src

    readonly facet12ArrGPUBuffer: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer;
    readonly facet12ArrGPUBufferSwap: WriteBuffer;


    readonly mesh: TerrainMesh;

    TerrainHeightsbindGroupTree: BindablePipelineLayout<[
        typeof this.gpu.sizeBindGroupLayout,
        typeof this.gpu.uniformBindGroupLayoutWithTime,
        BGLayout<{
            world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>}>,
        typeof this.heightsLayout
    ]>;

    readonly #ready: Promise<void>;
    readonly #terrainIndicesLength = Uint32Array.BYTES_PER_ELEMENT * (Terrain.#subdivisions[0] * Terrain.#subdivisions[1] * 6);

    #autosave = 0;
    heightsLayout: BGLayout<{
        slopes: BufLayout<ShaderStage.VERTEX, typeof IntArray>,
        facet12: BufLayout<ShaderStage.VERTEX, typeof PlaneArray>,
}>;

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
            return;
        const b1 = Buffer.create(engine.gpu,
            byteLength,
            [GPUBufferUsage.COPY_SRC],
            'terrain_b1',
            (b) => {
                new Float32Array(b.getMappedRange()).set(
                    new Float32Array(engine.memory.buffer,
                        engine.rust.vertices_pointer(this.mesh.id) + offset,
                        byteLength / 4)
                );
            });

        const commandEncoder = engine.gpu.device.createCommandEncoder({
            label: 'updateSwap2_encoder',
        });
        b1.copyTo(commandEncoder,
            this.terrainPositionAndUvsAndNormalsGPU,
            0,
            offset,
            byteLength);
        let b2: CopySrcBuffer;
        if (!nofaces) {
            const facesByteLength = this.mesh.faces_count * 4 * Float32Array.BYTES_PER_ELEMENT;
            b2 = Buffer.create(engine.gpu,
                facesByteLength,
                [GPUBufferUsage.COPY_SRC],
                'terrain_b2',
                b => {
                    new Float32Array(b.getMappedRange()).set(new Float32Array(engine.memory.buffer,
                        engine.rust.faces_pointer(this.mesh.id),
                        this.mesh.faces_count * 4));
                });
            b2.copyTo(commandEncoder,
                this.facet12ArrGPUBuffer,
                0,
                0,
                facesByteLength);
            engine.gpu.device.queue.submit([commandEncoder.finish()]);
            b2.destroy();
        }
        b1.destroy();
        clearTimeout(this.#autosave);
        this.#autosave = setTimeout(() =>
            this.#serialize(),
        10000);
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
        const verticesBufferSize = positionsLength + uvsLength + normalsLength;
        const t = await caches.match(new Request('/terrain')).then(async cachedvertices => {
            if (cachedvertices) {
                const cachedBuffer = await Terrain.fromSave(cachedvertices);
                var terrainPositionAndUvsAndNormalsGPU = Buffer.create(gpu,
                    verticesBufferSize,
                    [
                        GPUBufferUsage.STORAGE,
                        GPUBufferUsage.VERTEX,
                        GPUBufferUsage.COPY_DST,
                        GPUBufferUsage.COPY_SRC
                    ],
                    'terrainPositionAndUvsAndNormalsGPU0',
                    b => {
                        new Uint8Array(b.getMappedRange()).set(new Uint8Array(cachedBuffer));
                    });
            } else {
                const b = await (await fetch('/images/tenerife250.webp')).blob();
                const bitmap = await createImageBitmap(b);

                const CreateGroundFromHeightMapShader = new CreateGroundFromHeightMap(gpu,
                    this.settings,
                    bitmap);

                const CreateGroundFromHeightMapPipelineP = CreateGroundFromHeightMapShader.createComputePipeline('main');


                const texture = gpu.device.createTexture({
                    format: 'rgba8unorm',
                    size: [
                        bitmap.width,
                        bitmap.height
                    ],
                    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                });
                gpu.device.queue.copyExternalImageToTexture({
                    source: bitmap,
                },
                {
                    texture,
                },
                [
                    bitmap.width,
                    bitmap.height
                ]);

                const commandEncoder = gpu.device.createCommandEncoder({
                    label: 'loadFromTexture_encoder',
                });
                const passEncoder = commandEncoder.beginComputePass({
                    label: 'loadFromTexture_encoder_pass_encoder',
                });
                var terrainPositionAndUvsAndNormalsGPU = Buffer.create(gpu,
                    verticesBufferSize,
                    [
                        GPUBufferUsage.STORAGE,
                        GPUBufferUsage.VERTEX,
                        GPUBufferUsage.COPY_DST,
                        GPUBufferUsage.COPY_SRC
                    ],
                    'terrainPositionAndUvsAndNormalsGPU1');
                const sourceBindGroup = CreateGroundFromHeightMapShader.props.bindGroupLayouts[0].createBindGroup('sourceBindGroup',
                    (bindGroup) =>
                        ({
                            pixels: {
                                resource: texture.createView(),
                            },
                            positions: {
                                resource: terrainPositionAndUvsAndNormalsGPU.getStorageBinding(bindGroup),
                            },
                        }));
                passEncoder.setPipeline(await CreateGroundFromHeightMapPipelineP);
                passEncoder.setBindGroup(0,
                    sourceBindGroup.bindGroup);
                passEncoder.dispatchWorkgroups(Terrain.#subdivisions[0] + 1,
                    Terrain.#subdivisions[1] + 1);
                passEncoder.end();
                gpu.device.queue.submit([commandEncoder.finish()]);
            }

            const slopesLayout = new BGLayout(gpu,
                'slopesAndFacesBindGroupLayoutReadOnly',
                {
                    facet12: new BufLayout(
                        {
                            buffer: {
                                hasDynamicOffset: false,
                                minBindingSize: 32,
                                type: 'read-only-storage',
                            },
                            visibility: ShaderStage.COMPUTE,

                        },
                        PlaneArray),
                    slopes: new BufLayout(
                        {
                            buffer: {
                                hasDynamicOffset: false,
                                minBindingSize: 32,
                                type: 'read-only-storage',
                            },
                            visibility: ShaderStage.COMPUTE,
                        },
                        IntArray),
                }
            );

            const shaders = {
                calculateNormals: new CalculateNormals(this.settings,
                    slopesLayout),
                calculatePlaneIndices: new CalculatePlaneIndices(gpu,
                    this.settings),
                computePlaneHeights: new CalculatePlaneHeights(gpu,
                    this.settings),
                createTexture: new CreateTerrainTexture(this.settings,
                    slopesLayout),
            };


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

        });
        return t;
    }

    async #serialize(compress = false) {
        const cacheP = caches.open('save');
        if (!compress) {
            const response = new Response(this.mesh.vertices);
            response.headers.set('content-length',
                (this.mesh.vertices_count * Float32Array.BYTES_PER_ELEMENT * this.mesh.vertices_stride).toString());
            response.headers.set('content-type',
                'application/octet-stream');

            const indices = this.mesh.indexed.indices;
            const response2 = new Response(indices);
            response2.headers.set('content-length',
                indices.byteLength.toString());
            response2.headers.set('content-type',
                'application/octet-stream');


            const cache = await cacheP;
            cache.put(new Request('/terrain'),
                response);
            cache.put(new Request('/indices'),
                response2);

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

    readonly texture:
        RenderTarget<
        'rgba8unorm',
            (typeof TextureUsageEnums)['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC|STORAGE_BINDING'],
            { readonly width: 8192; readonly height: 8192; }> &
        copyDstTexture & copySrcTexture;

    constructor(
        public gpu: GPU,
        public scenes: Scene[],
        slopesLayout: SlopesLayout,
        shaders: {
            calculatePlaneIndices: CalculatePlaneIndices;
            computePlaneHeights: CalculatePlaneHeights;
            calculateNormals: CalculateNormals;
            createTexture: CreateTerrainTexture;
        },
        private terrainPositionAndUvsAndNormalsGPU: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer & VertexBuffer,
        [
            computePipelineIndices,
            computePlaneHeights,
            computePipelineNormals,
            createTexturePipeline]: [Indices: GPUComputePipeline, Heights: GPUComputePipeline, Normals: GPUComputePipeline, Texture: GPUComputePipeline
],
        positionsCount: number
    ) {
        this.slopeArrGPUBuffer = Buffer.create(gpu,
            Int32Array.BYTES_PER_ELEMENT * Terrain.#subdivisions[0] * Terrain.#subdivisions[1],
            [GPUBufferUsage.STORAGE],
            'slopeArrGPUBuffer');
        this.facet12ArrGPUBuffer = Buffer.create(gpu,
            Float32Array.BYTES_PER_ELEMENT * Terrain.#subdivisions[0] * Terrain.#subdivisions[1] * 4 * 2,
            [
                GPUBufferUsage.STORAGE,
                GPUBufferUsage.COPY_DST,
                GPUBufferUsage.COPY_SRC
            ],
            'facet12ArrGPUBuffer');
        this.facet12ArrGPUBufferSwap = new WriteBuffer(gpu,
            Float32Array.BYTES_PER_ELEMENT * Terrain.#subdivisions[0] * Terrain.#subdivisions[1] * 4 * 2,
            'facet12ArrGPUBufferSwap');
        this.texture = Texture.create({
            format: 'rgba8unorm',
            gpu,
            label: 'Terrain',
            size: Terrain.#textureSize,
            usages: TextureUsageEnums['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC|STORAGE_BINDING'],
        });
        const _heightsBindGroupEntries = (bindGroup: BindGroup) =>
            ({
                facet12: {
                    resource: this.facet12ArrGPUBuffer.getStorageBinding(bindGroup),
                },
                slopes: {
                    resource: this.slopeArrGPUBuffer.getStorageBinding(bindGroup),
                },
            });
        this.heightsLayout = new BGLayout(gpu,
            'terrainBindGroupLayout',
            {
                facet12: new BufLayout(
                    {
                        buffer: {
                            minBindingSize: 32,
                            type: 'read-only-storage',
                        },
                        visibility: ShaderStage.VERTEX,
                    },
                    PlaneArray),
                slopes: new BufLayout(
                    {
                        buffer: {
                            minBindingSize: 32,
                            type: 'read-only-storage',
                        },
                        visibility: ShaderStage.VERTEX,
                    },
                    IntArray),
            }
        );
        this.TerrainHeightsbindGroupTree = gpu.positionAndTimeBindGroup.addChildBindGroupLayout('terrainPipelineLayout',
            this.heightsLayout.createBindGroup('TerrainHeightsbindGroupTree',
                bindGroup =>
                    ({
                        facet12: {
                            resource: this.facet12ArrGPUBuffer.getStorageBinding(bindGroup),
                        },
                        slopes: {
                            resource: this.slopeArrGPUBuffer.getStorageBinding(bindGroup),
                        },
                    })));



        const commandEncoder = gpu.device.createCommandEncoder({
            label: 'terrain_encoder',
        });
        const passEncoder = commandEncoder.beginComputePass({
            label: 'terrain_pass_encoder',
        });


        const terrainPositionAndUvsAndNormalsGPU_bgroup = (bindGroup: BindGroup) =>
({
    vertices: {
        resource: this.terrainPositionAndUvsAndNormalsGPU.getStorageBinding(bindGroup),
    },
}) as const;
        //todo: remove unneeded flags
        const terrainIndicesGPU = Buffer.create(gpu,
            this.#terrainIndicesLength,
            [
                GPUBufferUsage.INDEX,
                GPUBufferUsage.STORAGE,
                GPUBufferUsage.COPY_SRC
            ],
            'terrainIndicesGPUBuffer');

        passEncoder.setPipeline(computePipelineIndices);

        passEncoder.setBindGroup(0,
            shaders.calculatePlaneIndices.props.bindGroupLayouts[0].createBindGroup('terrainIndicesGPUBindgroup',
                (bindGroup) =>
                    ({
                        indices: {
                            resource: terrainIndicesGPU.getStorageBinding(bindGroup),
                        },
                    })
            ).bindGroup);
        passEncoder.dispatchWorkgroups(...Terrain.#subdivisions);

        passEncoder.setPipeline(computePlaneHeights);
        passEncoder.setBindGroup(0,
            shaders.computePlaneHeights.props.bindGroupLayouts[0].createBindGroup('terrainPositionAndUvsAndNormalsGPU_Bindgroup',
                terrainPositionAndUvsAndNormalsGPU_bgroup).bindGroup);

        passEncoder.setBindGroup(1,
            shaders.computePlaneHeights.props.bindGroupLayouts[1].createBindGroup('_heightsBindGroupEntries',
                _heightsBindGroupEntries).bindGroup);
        passEncoder.dispatchWorkgroups(...Terrain.#subdivisions);

        passEncoder.setPipeline(computePipelineNormals);

        passEncoder.setBindGroup(0,
            shaders.calculateNormals.props.bindGroupLayouts[0].createBindGroup('terrainPositionAndUvsAndNormalsGPU_bgroup',
                terrainPositionAndUvsAndNormalsGPU_bgroup).bindGroup);
        passEncoder.setBindGroup(1,
            slopesLayout.createBindGroup('bindGroupHeightsRead2',
                _heightsBindGroupEntries).bindGroup);
        passEncoder.dispatchWorkgroups(Terrain.#subdivisions[0] + 1,
            Terrain.#subdivisions[1] + 1);
        const textureView = new TextureView(this.texture);
        this.mesh = new TerrainMesh(scenes,
            textureView,
            this.terrainPositionAndUvsAndNormalsGPU,
            terrainIndicesGPU,
            allocate_vec(new Float32Array(positionsCount * 12)),
            allocate_vec(new Uint32Array(this.#terrainIndicesLength / 4)),
            12);

        this.#ready = caches.match(new Request('/terrainTexture.webp')).then(async (cachedtexture) => {
            const textureSizeBytes = Int32Array.BYTES_PER_ELEMENT * (Terrain.#textureSize.width * Terrain.#textureSize.height);
            if (cachedtexture) {
                passEncoder.end();
                var gpuReadBufferPositions = this.terrainPositionAndUvsAndNormalsGPU.createReadCopy(commandEncoder);
                var gpuReadBufferIndices = terrainIndicesGPU.createReadCopy(commandEncoder);
                const bitmap = await createImageBitmap(await cachedtexture.blob());
                this.texture.copyFromExternalImage({
                    source: bitmap,
                },
                {
                },
                Terrain.#textureSize);
                gpu.device.queue.submit([commandEncoder.finish()]);
            } else {
                const bindGroup1 = shaders.createTexture.props.bindGroupLayouts[1].createBindGroup('writableTexture',
                    (bindGroup) =>
                        ({
                            ground_texture: {
                                resource: textureView.getTextureBinding(bindGroup),
                            },
                        }));
                passEncoder.setPipeline(createTexturePipeline);
                const bindGroupHeightsRead = slopesLayout.createBindGroup('bindGroupHeightsRead',
                    _heightsBindGroupEntries);

                passEncoder.setBindGroup(0,
                    bindGroupHeightsRead.bindGroup);
                passEncoder.setBindGroup(1,
                    bindGroup1.bindGroup);
                passEncoder.dispatchWorkgroups(Terrain.#textureSize.width,
                    Terrain.#textureSize.height);
                passEncoder.end();


                // Get a GPU buffer for reading in an unmapped state.
                const gpuReadBuffer = new ReadBuffer(gpu,
                    textureSizeBytes,
                    'terrainReaduBuffer');
                // Encode commands for copying buffer to buffer.
                gpuReadBuffer.copyFromTexture(commandEncoder,
                    {
                        texture: this.texture.texture,
                    },
                    {
                        bytesPerRow: 4 * Terrain.#textureSize.width,
                    },
                    Terrain.#textureSize);

                var gpuReadBufferPositions = this.terrainPositionAndUvsAndNormalsGPU.createReadCopy(commandEncoder);
                var gpuReadBufferIndices = terrainIndicesGPU.createReadCopy(commandEncoder);
                const gpuCommands = commandEncoder.finish();
                gpu.device.queue.submit([gpuCommands]);
                const c = new OffscreenCanvas(Terrain.#textureSize.width,
                    Terrain.#textureSize.height);
                const ctx = c.getContext('2d');
                if (!ctx)
                    throw (new Error('get 2d context failed'));
                gpuReadBuffer.readAndDestroy(async arrayBuffer => {
                    ctx.putImageData(new ImageData(new Uint8ClampedArray(arrayBuffer),
                        c.width,
                        c.height),
                    0,
                    0);
                    const blob = await c.convertToBlob({
                        quality: 1, type: 'image/webp',
                    });
                    TerrainTool.saveTexture(await blob.arrayBuffer(),
                        [
                            Terrain.#textureSize.width,
                            Terrain.#textureSize.height
                        ]);
                });
            }

            const commandEncoder2 = gpu.device.createCommandEncoder({
                label: 'terrain_encoder2',
            });
            const readBuffer2 = this.facet12ArrGPUBuffer.createReadCopy(commandEncoder2);
            gpu.device.queue.submit([commandEncoder2.finish()]);
            readBuffer2.readAndDestroy(buff => {
                this.mesh.faces = new Float32Array(buff);
            });
            gpuReadBufferPositions.readAndDestroy(readbuff => {
                return gpuReadBufferIndices.readAndDestroy(buff => {
                    this.mesh.indexed.set_indices_and_vertices(new Uint32Array(buff),
                        new Float32Array(readbuff));
                    this.updateSwap2(0,
                        readbuff.byteLength,
                        true);
                    this.#serialize();
                });
            });
        }).catch(err =>
            engine.showError(err,
                gpu));
    }
}
import { Scene } from "../Scene.js";
import { TerrainTool } from "../tools/Terrain.js";
import { TerrainMesh } from "../GPU/RenderPipeLines/TerrainRenderPipeline.js";
import { GPUBufferUsage } from "../GPU.js"
import type { PipelineLayout } from "../GPU/PipelineLayout.js";
import { Engine } from "../engine.js";
import { BindGroupLayout } from "../GPU/BindGroupLayout.js";
declare const engine:Engine;
export class Terrain {
    /*
TODO
     - No writable storage buffer layouts to vertex/fragment shader

     * */

        // 1000 * 1000: 40 - 50ms when no collision
    static readonly subdivisions = [256, 256] as const;
    static readonly size = [10000, 10000] as const;
    static readonly maxXZ=[Terrain.size[0] / 2.0,Terrain.size[1] / 2.0] as const;
    static readonly minmax=[-2, 500] as const;
    static readonly textureSize = [1024, 1024] as const;

    slopeArrGPUBuffer:GPUStorageBuffer;
    //TODO: Remove copy_src
    
    facet12ArrGPUBuffer:GPUStorageBuffer & GPUCopyDSTBuffer & GPUCopySRCBuffer;
    facet12ArrGPUBufferSwap :GPUMapWriteBuffer & GPUCopySRCBuffer;



    public slopeArrBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * Terrain.subdivisions[0] * Terrain.subdivisions[1]);

    public slopeArr = new Int32Array(this.slopeArrBuffer);

    readonly mesh: TerrainMesh;

    TerrainHeightsbindGroupTree : PipelineLayout;
    
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
        const b1 = engine.gpu.createGPUBuffer(byteLength, [GPUBufferUsage.COPY_SRC], true);
        new Float32Array(b1.getMappedRange()).set(
            new Float32Array(engine.memory.buffer, engine.rust.vertices_pointer(this.mesh.ptr)+offset, byteLength/4)
        )
        b1.unmap();
        const commandEncoder = engine.gpu.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            b1, // source buffer
            0, //source offset
            this.terrainPositionAndUvsAndNormalsGPU, //destination buffer
            offset, //destination offset
            byteLength);
        let b2: GPUCopySRCBuffer;
        if (!nofaces) {
            const facesByteLength = this.mesh.faces_count * 4 * Float32Array.BYTES_PER_ELEMENT;
            b2 = engine.gpu.createGPUBuffer(facesByteLength, [GPUBufferUsage.COPY_SRC], true);
           // new Float32Array(b2.getMappedRange()).set(new Float32Array(this.mesh.facesBuffer))
            new Float32Array(b2.getMappedRange()).set(new Float32Array(engine.memory.buffer, engine.rust.faces_pointer(this.mesh.ptr), this.mesh.faces_count * 4))
            b2.unmap();
            commandEncoder.copyBufferToBuffer(
                b2, // source buffer
                0, //source offset
                this.facet12ArrGPUBuffer, //destination buffer
                0, //destination offset
                facesByteLength);
        }
        engine.gpu.device.queue.submit([commandEncoder.finish()]);
        b1.destroy();
        if (!nofaces) {
            b2!.destroy();
        }
        clearTimeout(this.autosave);
        this.autosave = setTimeout(() => this.serialize(), 10000)

    }

    static async loadFromTexture(scenes: Scene[]): Promise<Terrain> {
        const settingsGPU = engine.gpu.createGPUBuffer(48, [GPUBufferUsage.STORAGE, GPUBufferUsage.UNIFORM], true);
        const sourcearrSettings = settingsGPU.getMappedRange();
        new Uint32Array(sourcearrSettings).set(this.size);   // terrain width and height
        new Uint32Array(sourcearrSettings, 8).set(Terrain.subdivisions);
        new Uint32Array(sourcearrSettings, 16).set([Terrain.subdivisions[0]]);       //subdivisions
        new Int32Array(sourcearrSettings, 24).set(Terrain.minmax); //min and max height,
        new Int32Array(sourcearrSettings, 32).set(Terrain.maxXZ); //maxX, maxZ
        new Int32Array(sourcearrSettings, 40).set(Terrain.textureSize); //texture size
        settingsGPU.unmap();



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
                const buffer = await Terrain.fromSave(cachedvertices);

                var terrainPositionAndUvsAndNormalsGPU = engine.gpu.createGPUBuffer(verticesBufferSize, [GPUBufferUsage.STORAGE, GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC], true)
                new Uint8Array(terrainPositionAndUvsAndNormalsGPU.getMappedRange()).set(new Uint8Array(buffer));
                terrainPositionAndUvsAndNormalsGPU.unmap();

            } else {
                const bytesPerRow=Terrain.subdivisions[0] * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT;
                const b = await (await fetch('/images/tenerife250.webp')).blob();

                const bitmap = await createImageBitmap(b);
                const texture = engine.gpu.device.createTexture({
                    format: 'rgba8unorm',
                    size:[Terrain.subdivisions[0],Terrain.subdivisions[1]],
                    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT
                })
                engine.gpu.device.queue.copyExternalImageToTexture({source:bitmap},{texture},[bitmap.width,bitmap.height]);

                const sourcePixels = engine.gpu.createGPUBuffer((Terrain.subdivisions[0] * Terrain.subdivisions[1] * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT), [GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE])
                const commandEncoder = engine.gpu.createCommandEncoder();
                commandEncoder.copyTextureToBuffer({texture},{buffer:sourcePixels, bytesPerRow:bytesPerRow},[Terrain.subdivisions[0],Terrain.subdivisions[1]])

                const computePipeline = engine.gpu.createComputePipeline('terrain/CreateGroundFromHeightMap.comp.wgsl');

                const bindGroupSettings = computePipeline.createBindGroup(0, [{
                    binding: 0,
                    resource: {
                        buffer: settingsGPU
                    }
                }]);
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setBindGroup(0, bindGroupSettings);
                var terrainPositionAndUvsAndNormalsGPU = engine.gpu.createGPUBuffer(verticesBufferSize, [GPUBufferUsage.STORAGE, GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC])
                    const sourceBindGroup = computePipeline.createBindGroup(1, [
                    {
                        binding: 0,
                        resource: {
                            buffer: terrainPositionAndUvsAndNormalsGPU
                        }
                    },
                    {
                        binding: 1,
                        resource: {
                            buffer: sourcePixels
                        }
                    }
                ]);
                passEncoder.setPipeline(computePipeline);
                passEncoder.setBindGroup(1, sourceBindGroup);
                passEncoder.dispatch(Terrain.subdivisions[0] + 1, Terrain.subdivisions[1] + 1);
                passEncoder.endPass();
                engine.gpu.device.queue.submit([commandEncoder.finish()]);
            }
            return new Terrain(scenes, settingsGPU, terrainPositionAndUvsAndNormalsGPU);

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
        public settingsGPU: GPUUniformBuffer & GPUStorageBuffer,
        private terrainPositionAndUvsAndNormalsGPU: GPUStorageBuffer & GPUVertexBuffer & GPUCopyDSTBuffer & GPUCopySRCBuffer
    ) {
        this.slopeArrGPUBuffer = engine.gpu.createGPUBuffer(Int32Array.BYTES_PER_ELEMENT * Terrain.subdivisions[0] * Terrain.subdivisions[1], [GPUBufferUsage.STORAGE]);
        this.facet12ArrGPUBuffer = engine.gpu.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisions[0] * Terrain.subdivisions[1] * 4 * 2, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC]);
        this.facet12ArrGPUBufferSwap = engine.gpu.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisions[0] * Terrain.subdivisions[1] * 4 * 2, [GPUBufferUsage.MAP_WRITE, GPUBufferUsage.COPY_SRC]);
        this.texture = engine.gpu.device.createTexture({
            dimension: '2d',
            format: "rgba8unorm",
            mipLevelCount: 1,
            sampleCount: 1,
            size: Terrain.textureSize,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
        });
        const _heightsBindGroupEntries: [storageBindGroupLayout, storageBindGroupLayout] = [
            {
                binding: 0,
                resource: {
                    buffer: this.slopeArrGPUBuffer
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: this.facet12ArrGPUBuffer
                }
            }
        ];
        const heightsBindGroupEntries:[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry] = [
            {
                binding: 0,
                resource: {
                    buffer: this.slopeArrGPUBuffer
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: this.facet12ArrGPUBuffer
                }
            },
            {
                binding: 2,
                resource: {
                    buffer: this.settingsGPU
                }
            }
        ];
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
        this.TerrainHeightsbindGroupTree = engine.gpu.positionBindGroupTimeWGSL.addChildBindGroup('terrain', heightsLayout.createBindGroup(heightsBindGroupEntries));
        
        const computePipelineIndices = engine.gpu.createComputePipeline('terrain/calculatePlaneIndices.comp.wgsl');

        const positionsCount =  ((size:number) => {
            while(size%4 !== 0)
                size++;
            return size;
        })( (Terrain.subdivisions[0] + 1) * (Terrain.subdivisions[1] + 1));
               

        const commandEncoder = engine.gpu.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();

        const settingsLayout=engine.gpu.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "uniform"
                }
            }]
        });
        const writableStorageLayout=engine.gpu.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            }]
            
        });
        const heightsLayout2 = engine.gpu.device.createBindGroupLayout({
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
            
        });
        const normalsLayout=engine.gpu.device.createPipelineLayout({bindGroupLayouts:[settingsLayout,writableStorageLayout, heightsLayout2]})
        const computePipelineNormals = engine.gpu.createComputePipeline('terrain/calculateNormals.comp.wgsl', normalsLayout)
        const computePlaneHeights = engine.gpu.createComputePipeline('terrain/calculatePlaneHeights.comp.wgsl');

        const bgroup = [
            {
                binding: 0,
                resource: {
                    buffer: this.terrainPositionAndUvsAndNormalsGPU
                }
            }
        ];
        const bindGroupHeightsRead = engine.gpu.device.createBindGroup({
            layout: heightsLayout2,
            entries: _heightsBindGroupEntries
        });
        //todo: remove unneeded flags
        const terrainIndicesGPU = engine.gpu.createGPUBuffer(this.#terrainIndicesLength, [GPUBufferUsage.INDEX, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);


        passEncoder.setPipeline(computePipelineIndices);
        passEncoder.setBindGroup(0, computePipelineIndices.createBindGroup(0, [{
            binding: 0,
            resource: {
                buffer: this.settingsGPU
            }
        }]));
        passEncoder.setBindGroup(1, computePipelineIndices.createBindGroup(1,
            [{
                binding: 0,
                resource: {
                    buffer: terrainIndicesGPU
                }
            }
            ]
        ));
        passEncoder.dispatch(...Terrain.subdivisions);

        passEncoder.setPipeline(computePlaneHeights);
        passEncoder.setBindGroup(0, computePlaneHeights.createBindGroup(0, [{
            binding: 0,
            resource: {
                buffer: this.settingsGPU
            }
        }]));
        passEncoder.setBindGroup(1, computePlaneHeights.createBindGroup(1, bgroup));
        passEncoder.setBindGroup(2, engine.gpu.device.createBindGroup({
            layout: computePlaneHeights.getBindGroupLayout(2),
            entries: _heightsBindGroupEntries
        }));
        passEncoder.dispatch(...Terrain.subdivisions);

        passEncoder.setPipeline(computePipelineNormals);
        passEncoder.setBindGroup(0, computePipelineNormals.createBindGroup(settingsLayout, [{
            binding: 0,
            resource: {
                buffer: this.settingsGPU
            }
        }]))
        passEncoder.setBindGroup(1, engine.gpu.device.createBindGroup({
            layout: writableStorageLayout,
            entries: bgroup
        }))
        passEncoder.setBindGroup(2, bindGroupHeightsRead)
        passEncoder.dispatch(Terrain.subdivisions[0] + 1, Terrain.subdivisions[1] + 1);

        this.mesh = new TerrainMesh(scenes, this.texture.createView(), this.terrainPositionAndUvsAndNormalsGPU, terrainIndicesGPU, new Float32Array(positionsCount*12), new Uint32Array(this.#terrainIndicesLength / 4), 12);

        caches.match(new Request('/terrainTexture.webp')).then(async (cachedtexture) => {
            const textureSizeBytes = Int32Array.BYTES_PER_ELEMENT * (Terrain.textureSize[0] * Terrain.textureSize[1]);
            const gpuBuffer = engine.gpu.createGPUBuffer(textureSizeBytes, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC], cachedtexture !== undefined);
            const bufferView = {
                buffer: gpuBuffer,
                bytesPerRow: Terrain.textureSize[0] * 4,
                offset: 0,
            };
            const destinationTextureView={
                texture: this.texture,
                origin: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                mipLevel: 0,
            };
            if (cachedtexture) {
                passEncoder.endPass();
                var [gpuReadBufferPositions, gpuReadBufferIndices] = engine.gpu.createCopy(commandEncoder, this.terrainPositionAndUvsAndNormalsGPU, terrainIndicesGPU)

                const bitmap = await createImageBitmap(await cachedtexture.blob());
                const imgcanvas=document.createElement('canvas');
                imgcanvas.width=bitmap.width;
                imgcanvas.height=bitmap.height;
                const imgctx = imgcanvas.getContext('2d');
                if (!imgctx)
                    throw (new Error('Unable to get 2d canvas'));
                imgctx.drawImage(bitmap, 0, 0);
                //let pixels = imgctx.getImageData(0, 0, cacheimg.width, cacheimg.height).data;
                // const padding = pixels.byteLength % 4;

                new Uint8ClampedArray(gpuBuffer.getMappedRange()).set(imgctx.getImageData(0, 0, bitmap.width, bitmap.height).data);
                gpuBuffer.unmap();

                commandEncoder.copyBufferToTexture(bufferView, destinationTextureView, Terrain.textureSize);
                engine.gpu.device.queue.submit([commandEncoder.finish()]);

            } else {    
                const createTexturePipeline = engine.gpu.createComputePipeline("terrain/createTerrainTexture.comp.wgsl",engine.gpu.device.createPipelineLayout({bindGroupLayouts: [settingsLayout,heightsLayout2, writableStorageLayout]}) );
                const bindGroup1 = createTexturePipeline.createBindGroup(writableStorageLayout, [
                    {
                        binding: 0,
                        resource: {
                            buffer: gpuBuffer
                        }
                    }
                ])
                console.time('Webgpu paint')
                passEncoder.setPipeline(createTexturePipeline);
                passEncoder.setBindGroup(1, bindGroupHeightsRead);
                passEncoder.setBindGroup(2, bindGroup1);
                passEncoder.dispatch(...Terrain.textureSize);
                passEncoder.endPass();

                console.timeEnd('Webgpu paint');


                // Get a GPU buffer for reading in an unmapped state.
                const gpuReadBuffer = engine.gpu.createGPUBuffer(textureSizeBytes, [GPUBufferUsage.COPY_DST, GPUBufferUsage.MAP_READ]);
                // Encode commands for copying buffer to buffer.
                commandEncoder.copyBufferToBuffer(
                    gpuBuffer,
                    0,
                    gpuReadBuffer,
                    0,
                    textureSizeBytes
                );

                commandEncoder.copyBufferToTexture(bufferView,destinationTextureView, Terrain.textureSize);
                var [gpuReadBufferPositions, gpuReadBufferIndices] = engine.gpu.createCopy(commandEncoder, this.terrainPositionAndUvsAndNormalsGPU, terrainIndicesGPU)
                const gpuCommands = commandEncoder.finish();
                engine.gpu.device.queue.submit([gpuCommands]);
                gpuReadBuffer.mapAsync(GPUMapMode.READ).then(() => {
                    // Read buffer.
                    const arrayBuffer = gpuReadBuffer.getMappedRange();

                    const c = document.createElement('canvas');
                    c.width=Terrain.textureSize[0];
                    c.height=Terrain.textureSize[1];
                    const ctx = c.getContext("2d");
                    if (!ctx)
                        throw ('get 2d context failed');
                    ctx.putImageData(new ImageData(new Uint8ClampedArray(arrayBuffer), c.width, c.height), 0, 0);
                    c.toBlob(async blob => {
                        if(blob) {
                            TerrainTool.saveTexture(await blob.arrayBuffer(), Terrain.textureSize);
                         }                        
                        
                    },"image/webp", 1);
                    gpuReadBuffer.destroy();

                })
                //resultMatrixBuffer.destroy();

            }
            engine.gpu.GPU2CPU(async (buff) => {
                await buff.mapAsync(GPUMapMode.READ);
                this.mesh.faces=new Float32Array(buff.getMappedRange());
            }, this.facet12ArrGPUBuffer)
    
            gpuReadBufferPositions.readAndDestroy(readbuff => {
                this.mesh.set_vertices(new Float32Array(readbuff));
                this.updateSwap2(0, readbuff.byteLength, true);
                this.serialize();
            });
            gpuReadBufferIndices.readAndDestroy(buff => {
                this.mesh.indices=new Uint32Array(buff);
            });
        })
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
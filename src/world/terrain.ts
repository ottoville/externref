import { Scene } from "../Scene.js";
import { TerrainTool } from "../tools/Terrain.js";
import { TerrainMesh } from "../GPU/RenderPipeLines/TerrainRenderPipeline.js";

export class Terrain {
    /*

     - No writable storage buffer layouts to vertex/fragment shader
     - Bind groups indexing

     * */

    static subdivisionsX = 260;
    static subdivisionsY = 260;

    width = 10000;
    height = 10000;

    #maxX = this.width / 2.0;
    #maxZ = this.height / 2.0;
    // #minZ = -this.#maxZ;
    //#minX = -this.#maxX;

    #minY = -2;
    #maxY = 255

    slopeArrGPUBuffer = this.scene.gpu.createGPUBuffer(Int32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY, [GPUBufferUsage.STORAGE]);
    //TODO: Remove copy_src
    facet12ArrGPUBuffer = this.scene.gpu.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY * 4 * 2, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC]);
    facet12ArrGPUBufferSwap = this.scene.gpu.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY * 4 * 2, [GPUBufferUsage.MAP_WRITE, GPUBufferUsage.COPY_SRC]);



    public slopeArrBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY);

    public slopeArr = new Int32Array(this.slopeArrBuffer);

    mesh: TerrainMesh;
    settingsGPU = this.scene.gpu.createGPUBuffer(40, [GPUBufferUsage.STORAGE], true);
    #heightsBindGroupEntries: [storageBindGroupLayout, storageBindGroupLayout] = [
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
    heightsBindGroupEntries: [GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry] = [
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
    heightsLayout = this.scene.gpu.createBindGroupLayout({
        entries: [{
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
        }]
    })
    TerrainHeightsbindGroupTree = this.scene.gpu.positionBindGroupTimeWGSL.addChildBindGroup(this.scene.gpu.createBindGroup(this.heightsLayout, this.heightsBindGroupEntries));

    //TerrainHeightsbindGroupPositionTree = this.TerrainHeightsbindGroupTree.addChildBindGroup(this.scene.gpu.BindGroupPosition, true)


    public static async fromHeightMap(url: string): Promise<SharedArrayBuffer> {
        const b = await (await fetch(url)).blob();

        let bitmap = await createImageBitmap(b);
        const buffer = new SharedArrayBuffer(Terrain.subdivisionsX * Terrain.subdivisionsY * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT);
        console.log('bitmap.width', bitmap.width)
        const align = (Terrain.subdivisionsX - bitmap.width) / 2

        const partcount = 2;
        let readycount = 0;
        const workers: Worker[] = [];
        //self.postMessage({ type: 'setProgress', data: { progress: 41 } });
        await new Promise(function initWorker(res, rej) {
            const worker = new Worker('/js/workers/webworkers/bitmapWorker.js');
            workers.push(worker);
            /* progress 42 and 43 are reserved for this */
            // self.postMessage({ type: 'setProgress', data: { progress: 41 + (2 * (workers.length / partcount)) } });
            worker.postMessage({
                subdivisionsX: Terrain.subdivisionsX,
                subdivisionsY: Terrain.subdivisionsY,
                bitmap,
                buffer,
                partcount,
                partnumber: workers.length - 1,
                align
            }, [bitmap]);
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
                            res(null)
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
    }
    public static async fromSave(cachedvertices: Response): Promise<ArrayBuffer> {
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


    readonly #terrainPositionsLength = Float32Array.BYTES_PER_ELEMENT * (Terrain.subdivisionsX + 1) * (Terrain.subdivisionsY + 1) * 4;
    readonly #terrainNormalsLength = Float32Array.BYTES_PER_ELEMENT * (Terrain.subdivisionsX + 1) * (Terrain.subdivisionsY + 1) * 4;

    readonly #terrainIndicesLength = Uint32Array.BYTES_PER_ELEMENT * (Terrain.subdivisionsX * Terrain.subdivisionsY * 6);

    readonly indicesBuffer: SharedArrayBuffer = new SharedArrayBuffer(this.#terrainIndicesLength);


    readonly #terrainUvsLength = Float32Array.BYTES_PER_ELEMENT * (Terrain.subdivisionsX + 1) * (Terrain.subdivisionsY + 1) * 4;
    readonly terrainPositionAndUvsAndNormalsGPU: GPUVertexBuffer & GPUCopyDSTBuffer;

    //readonly terrainPositionAndUvsAndNormalsCPUSwap = new SharedArrayBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength);
    //readonly terrainPositionAndUvsAndNormalsCPUSwapView = new Float32Array(this.terrainPositionAndUvsAndNormalsCPUSwap);

    #indices: Uint32Array = new Uint32Array(this.indicesBuffer);
    autosave = 0;
    updateSwap2(offset = 0, length: number, terrainPositionAndUvsAndNormalsCPUSwap: ArrayBuffer, nofaces = false) {
        const b1 = this.scene.gpu.createGPUBuffer(length, [GPUBufferUsage.COPY_SRC], true);
        new Float32Array(b1.getMappedRange()).set(new Float32Array(terrainPositionAndUvsAndNormalsCPUSwap, offset, length / 4))
        b1.unmap();
        const commandEncoder = this.scene.gpu.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            b1, // source buffer
            0, //source offset
            this.terrainPositionAndUvsAndNormalsGPU, //destination buffer
            offset, //destination offset
            length);
        let b2: GPUCopySRCBuffer;
        if (!nofaces) {
            b2 = this.scene.gpu.createGPUBuffer(this.mesh.facesBuffer.byteLength, [GPUBufferUsage.COPY_SRC], true);
            new Float32Array(b2.getMappedRange()).set(new Float32Array(this.mesh.facesBuffer))
            b2.unmap();
            commandEncoder.copyBufferToBuffer(
                b2, // source buffer
                0, //source offset
                this.facet12ArrGPUBuffer, //destination buffer
                0, //destination offset
                this.mesh.facesBuffer.byteLength);
        }
        this.scene.gpu.device.queue.submit([commandEncoder.finish()]);
        b1.destroy();
        if (!nofaces) {
            b2!.destroy();
        }
        clearTimeout(this.autosave);
        this.autosave = setTimeout(() => this.serialize(), 10000)

    }

    static async loadFromTexture(scene: Scene): Promise<Terrain> {
        const t = await caches.match(new Request('/terrain')).then(async cachedvertices => {
            if (cachedvertices) {
                const buffer = await Terrain.fromSave(cachedvertices);
                return new Terrain(scene, buffer);
            } else {
                const buffer = await Terrain.fromHeightMap('/images/tenerife250.webp');
                return new Terrain(scene, buffer, 'terrain/CreateGroundFromHeightMap.comp.wgsl');
            }
        })
        return t;
    }

    async serialize(compress = false) {
        const cacheP = caches.open('save');
        if (!compress) {
            const response = new Response(this.mesh.verticesView());
            response.headers.set('content-length', this.mesh.verticesBuffesSize.toString());
            response.headers.set('content-type', 'application/octet-stream');


            const response2 = new Response(this.#indices.buffer);
            response2.headers.set('content-length', this.#indices.buffer.byteLength.toString());
            response2.headers.set('content-type', 'application/octet-stream');


            const cache = await cacheP;
            cache.put(new Request('/terrain'), response);
            cache.put(new Request('/indices'), response2);

        } else {
            const c = new OffscreenCanvas((Terrain.subdivisionsX + 1) * 3, (Terrain.subdivisionsY + 1));
            const ctx = c.getContext("2d");
            if (!ctx)
                throw ('get 2d context failed');
            //disabled for now
            /*
            ctx.putImageData(new ImageData(new Uint8ClampedArray(this.#vertices.buffer), c.width, c.height), 0, 0);
            let blob = await c.convertToBlob({ type: "image/webp", quality: 1 });
            const response = new Response(blob);
            response.headers.set('content-length', blob.size.toString());
            (await cacheP).put(new Request('/terrain.webp'), response);*/
        }
    }
    textureSize = [5120, 5120] as const;
    textureExtent = {
        width: this.textureSize[0],
        height: this.textureSize[1],
    };
    texture = this.scene.gpu.device.createTexture({
        dimension: '2d',
        format: "rgba8unorm",
        mipLevelCount: 1,
        sampleCount: 1,
        size: this.textureExtent,
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.SAMPLED
    });




    static instance: Terrain;
    constructor(public scene: Scene, readonly buffer: ArrayBuffer | SharedArrayBuffer, algorithm?: string) {

        Terrain.instance = this;
        const sourcePixels = scene.gpu.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.STORAGE], true);
        const sourcearrSettings = this.settingsGPU.getMappedRange();
        new Uint32Array(sourcearrSettings).set([10000, 10000]);   // terrain width and height
        new Uint32Array(sourcearrSettings, 8).set([Terrain.subdivisionsX, Terrain.subdivisionsY,   //buffer width and height
        Terrain.subdivisionsX,        //subdivisions
        ]);
        new Int32Array(sourcearrSettings, 20).set([this.#minY, this.#maxY]); //min and max height,
        new Int32Array(sourcearrSettings, 32).set([this.#maxX, this.#maxZ]); //maxX, maxZ
        new Uint32Array(sourcePixels.getMappedRange()).set(new Uint32Array(buffer));

        this.settingsGPU.unmap();
        sourcePixels.unmap();

        const computePipelineIndices = scene.gpu.createComputePipeline('terrain/calculatePlaneIndices.comp.wgsl');
        const bindGroupSettings = computePipelineIndices.createBindGroup(0, [{
            binding: 0,
            resource: {
                buffer: this.settingsGPU
            }
        }]);

        const commandEncoder = scene.gpu.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setBindGroup(0, bindGroupSettings);

        if (algorithm) {
            var terrainPositionAndUvsAndNormalsGPUTemp = this.scene.gpu.createGPUBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);

            this.terrainPositionAndUvsAndNormalsGPU = this.scene.gpu.createGPUBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST])

            const computePipeline = scene.gpu.createComputePipeline(algorithm);
            const sourceBindGroup = computePipeline.createBindGroup(1, [
                {
                    binding: 0,
                    resource: {
                        buffer: terrainPositionAndUvsAndNormalsGPUTemp
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
            passEncoder.dispatch(Terrain.subdivisionsX + 1, Terrain.subdivisionsY + 1);
        } else {
            var terrainPositionAndUvsAndNormalsGPUTemp = this.scene.gpu.createGPUBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC], true);
            new Uint8Array(terrainPositionAndUvsAndNormalsGPUTemp.getMappedRange()).set(new Uint8Array(buffer));
            terrainPositionAndUvsAndNormalsGPUTemp.unmap();

            this.terrainPositionAndUvsAndNormalsGPU = this.scene.gpu.createGPUBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST], true)
            new Uint8Array(this.terrainPositionAndUvsAndNormalsGPU.getMappedRange()).set(new Uint8Array(buffer));
            this.terrainPositionAndUvsAndNormalsGPU.unmap();
        }

        const computePipelineNormals = scene.gpu.createComputePipeline('terrain/calculateNormals.comp.wgsl')
        const computePlaneHeights = scene.gpu.createComputePipeline('terrain/calculatePlaneHeights.comp.wgsl');

        const bgroup = [
            {
                binding: 0,
                resource: {
                    buffer: terrainPositionAndUvsAndNormalsGPUTemp
                }
            }
        ];
        const bindGroupPositions = computePlaneHeights.createBindGroup(1, bgroup);
        const bindGroupHeights = scene.gpu.device.createBindGroup({
            layout: computePlaneHeights.getBindGroupLayout(2),
            entries: this.#heightsBindGroupEntries
        });

        const bindGroupPositionsRead = scene.gpu.device.createBindGroup({
            layout: computePipelineNormals.getBindGroupLayout(1),
            entries: bgroup
        });

        const bindGroupHeightsRead = scene.gpu.device.createBindGroup({
            layout: computePipelineNormals.getBindGroupLayout(2),
            entries: this.#heightsBindGroupEntries
        });

        //todo: remove unneeded flags
        const terrainIndicesGPU = scene.gpu.createGPUBuffer(this.#terrainIndicesLength, [GPUBufferUsage.INDEX, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);


        passEncoder.setPipeline(computePipelineIndices);
        passEncoder.setBindGroup(1, computePipelineIndices.createBindGroup(1,
            [{
                binding: 0,
                resource: {
                    buffer: terrainIndicesGPU
                }
            }
            ]
        ));
        passEncoder.dispatch(Terrain.subdivisionsX, Terrain.subdivisionsY);

        passEncoder.setPipeline(computePlaneHeights);
        passEncoder.setBindGroup(1, bindGroupPositions);
        passEncoder.setBindGroup(2, bindGroupHeights);
        passEncoder.dispatch(Terrain.subdivisionsX, Terrain.subdivisionsY);

        passEncoder.setPipeline(computePipelineNormals);
        passEncoder.setBindGroup(1, bindGroupPositionsRead)
        passEncoder.setBindGroup(2, bindGroupHeightsRead)
        passEncoder.dispatch(Terrain.subdivisionsX + 1, Terrain.subdivisionsY + 1);
        passEncoder.endPass();

        const [gpuReadBufferPositions, gpuReadBufferIndices] = scene.gpu.createCopy(commandEncoder, terrainPositionAndUvsAndNormalsGPUTemp, terrainIndicesGPU)



        caches.match(new Request('/terrainTexture.webp')).then(async (cachedtexture) => {
            if (cachedtexture) {
                const cacheimg = new Image();
                cacheimg.src = URL.createObjectURL(await cachedtexture.blob());

                var gpuBuffer = await cacheimg.decode().then(async () => {
                    const imgcanvas = new OffscreenCanvas(cacheimg.width, cacheimg.height);
                    const imgctx = imgcanvas.getContext('2d');
                    if (!imgctx)
                        throw (new Error('Unable to get 2d canvas'));
                    imgctx.drawImage(cacheimg, 0, 0);
                    //let pixels = imgctx.getImageData(0, 0, cacheimg.width, cacheimg.height).data;
                    // const padding = pixels.byteLength % 4;
                    const gpuBuffer = scene.gpu.createGPUBuffer(cacheimg.width * cacheimg.height * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC], true);
                    new Uint8ClampedArray(gpuBuffer.getMappedRange()).set(imgctx.getImageData(0, 0, cacheimg.width, cacheimg.height).data);
                    gpuBuffer.unmap();
                    return gpuBuffer;
                });
            } else {
                const resultMatrixBufferSize = Int32Array.BYTES_PER_ELEMENT * (5120 * 5120);
                const resultMatrixBuffer = this.scene.gpu.createGPUBuffer(resultMatrixBufferSize, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);

                const createTexturePipeline = this.scene.gpu.createComputePipeline("terrain/createTerrainTexture.comp.wgsl");

                const bindGroupSettings = createTexturePipeline.createBindGroup(0, [{
                    binding: 0,
                    resource: {
                        buffer: this.settingsGPU
                    }
                }]);
                const bindGroup0 = createTexturePipeline.createBindGroup(1, this.#heightsBindGroupEntries);

                const bindGroup1 = createTexturePipeline.createBindGroup(2, [
                    {
                        binding: 0,
                        resource: {
                            buffer: resultMatrixBuffer
                        }
                    }
                ])
                console.time('Webgpu paint')
                const commandEncoder = this.scene.gpu.createCommandEncoder();

                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(createTexturePipeline);
                passEncoder.setBindGroup(0, bindGroupSettings);
                passEncoder.setBindGroup(1, bindGroup0);
                passEncoder.setBindGroup(2, bindGroup1);
                passEncoder.dispatch(5120, 5120);
                passEncoder.endPass();

                console.timeEnd('Webgpu paint');
                // Get a GPU buffer for reading in an unmapped state.
                const gpuReadBuffer = this.scene.gpu.createGPUBuffer(resultMatrixBufferSize, [GPUBufferUsage.COPY_DST, GPUBufferUsage.MAP_READ]);
                // Encode commands for copying buffer to buffer.
                commandEncoder.copyBufferToBuffer(
                    resultMatrixBuffer,
                    0,
                    gpuReadBuffer,
                    0,
                    resultMatrixBufferSize
                );
                // Submit GPU commands.
                const gpuCommands = commandEncoder.finish();
                this.scene.gpu.device.queue.submit([gpuCommands]);
                //resultMatrixBuffer.destroy();

                gpuReadBuffer.mapAsync(GPUMapMode.READ).then(() => {
                    // Read buffer.
                    const arrayBuffer = gpuReadBuffer.getMappedRange()
                    TerrainTool.saveTexture(arrayBuffer);
                    //  Terrain.terrainWorker.message<ArrayBuffer, Transferable[]>(WorkerReturn.Promise, 'saveTexture', arrayBuffer, [arrayBuffer]);
                    gpuReadBuffer.destroy();

                })
                var gpuBuffer = resultMatrixBuffer;

            }

            const commandEncoder = scene.gpu.device.createCommandEncoder({});

            const bufferView = {
                buffer: gpuBuffer,
                bytesPerRow: this.textureSize[0] * 4,
                rowsPerImage: 0,
                offset: 0,
            };

            commandEncoder.copyBufferToTexture(bufferView,
                {
                    texture: this.texture,
                    origin: {
                        x: 0,
                        y: 0,
                        z: Math.max(-1, 0)
                    },
                    mipLevel: 0,
                }, this.textureExtent);

            scene.gpu.device.queue.submit([commandEncoder.finish()]);

            bufferView.buffer.destroy();
        })

        const gpuCommands = commandEncoder.finish();
        scene.gpu.device.queue.submit([gpuCommands]);
        const positionsCount = (Terrain.subdivisionsX + 1) * (Terrain.subdivisionsY + 1)
        this.mesh = new TerrainMesh(scene, this.texture.createView(), this.terrainPositionAndUvsAndNormalsGPU, terrainIndicesGPU, positionsCount, new Uint32Array(this.indicesBuffer), 12);


        scene.gpu.GPU2CPU(async (buff) => {
            await buff.mapAsync(GPUMapMode.READ);
            new Float32Array(this.mesh.facesBuffer).set(new Float32Array(buff.getMappedRange()));
        }, this.facet12ArrGPUBuffer)


        terrainPositionAndUvsAndNormalsGPUTemp.destroy();
        gpuReadBufferPositions.readAndDestroy(async (readbuff) => {
            this.mesh.update_vertices(new Float32Array(readbuff));
            /*this.mesh.updateVertices(buff => {
                new Uint8Array(buff).set(new Uint8Array(readbuff));
            })*/

            //this.terrainPositionAndUvsAndNormalsCPUSwapView.set(new Float32Array(buff));
            this.updateSwap2(0, readbuff.byteLength, readbuff, true);
            this.serialize();
        });
        gpuReadBufferIndices.readAndDestroy(async (buff) => {
            this.mesh.setIndices(new Uint32Array(buff));
        });
    }
    /*
    #ratioX = Terrain.subdivisionsX / this.width;
    #ratioY = Terrain.subdivisionsY / this.height;
    getHeightAtCoordinates(x: number, z: number): number {
        let facet: Float32Array;
        let col = ((x + this.#maxX) * this.#ratioX) | 0;
        let row = (-(z + this.#maxZ) * this.#ratioY + Terrain.subdivisionsY) | 0;
        debugger;
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
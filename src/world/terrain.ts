import type { GPU } from "../GPU.js";
import { Scene } from "../Scene.js";
import { TerrainTool } from "../tools/Terrain.js";
import { TerrainMesh } from "../GPU/RenderPipeLines/TerrainRenderPipeline.js";


export interface TerrainPipelineLayoutPosition extends GPUPipelineLayout {

}
export interface TerrainPipelineLayoutPositionTime extends GPUPipelineLayout {

}

export class Terrain {
    /*

     - No writable storage buffer layouts to vertex/fragment shader
     - Bind groups indexing

     * */

    static subdivisionsX: number = 250;
    static subdivisionsY: number = 250;

    width = 10000;
    height = 10000;

    #maxX = this.width / 2.0;
    #maxZ = this.height / 2.0;
    #minZ = -this.#maxZ;
    #minX = -this.#maxX;

    #minY = -2;
    #maxY = 255

    slopeArrGPUBuffer = this.scene.gpu.createGPUBuffer(Int32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY, [GPUBufferUsage.STORAGE]);
    //TODO: Remove copy_src
    facet12ArrGPUBuffer = this.scene.gpu.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY * 4 * 2, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST, GPUBufferUsage.COPY_SRC]);
    facet12ArrGPUBufferSwap = this.scene.gpu.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY * 4 * 2, [GPUBufferUsage.MAP_WRITE, GPUBufferUsage.COPY_SRC]);



    public slopeArrBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY);

    public slopeArr = new Int32Array(this.slopeArrBuffer);


    static heightLayouts: Map<GPU, BindGroupLayoutTwoBinding> = new Map();
    mesh: TerrainMesh;
    //terraMesh: TerraMesh;
    static getHeightsLayout(scene: GPU): BindGroupLayoutTwoBinding {
        let layout: BindGroupLayoutTwoBinding | undefined;
        if (layout = Terrain.heightLayouts.get(scene)) {
            return layout;
        }
        layout = scene.createBindGroupLayout(
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                type: "readonly-storage-buffer"
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                type: "readonly-storage-buffer"
            });
        Terrain.heightLayouts.set(scene, layout);
        return layout;
    }
    heightsBindGroupEntries: [GPUBindGroupEntry, GPUBindGroupEntry] = [
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

    //TerrainHeightsbindGroupTree = this.scene.TerraCameras[0].baseBindGroup.addChildBindGroup(this.scene.gpuscene.createBindGroup(Terrain.getHeightsLayout(this.scene.gpuscene), ...this.heightsBindGroupEntries));
    TerrainHeightsbindGroupTree = this.scene.gpu.rootlayout.addChildBindGroup(this.scene.gpu.createBindGroup(Terrain.getHeightsLayout(this.scene.gpu), ...this.heightsBindGroupEntries));
    
    TerrainHeightsbindGroupPositionTree = this.TerrainHeightsbindGroupTree.addChildBindGroup(this.scene.gpu.BindGroup, true)


    public static async fromHeightMap(url: string): Promise<SharedArrayBuffer> {
        let b = await (await fetch(url)).blob();

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

        //return new Terrain(vdata, GPUScene.instance);
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
    public createTexture(): Promise<GPUBuffer> {
        return new Promise(async (tres) => {

            const resultMatrixBufferSize = Int32Array.BYTES_PER_ELEMENT * (2 + 5120 * 5120);
            const resultMatrixBuffer = this.scene.gpu.createGPUBuffer(resultMatrixBufferSize, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);

            const createTexturePipeline = this.scene.gpu.createComputePipeline("createTerrainTexture.comp", this.scene.gpu.device.createPipelineLayout({
                bindGroupLayouts: [Terrain.getHeightsLayout(this.scene.gpu), this.scene.gpu.singleWritableStorageLayout]
            }));

            const bindGroup1 = createTexturePipeline.createBindGroup(this.scene.gpu.singleWritableStorageLayout, [
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
            passEncoder.setBindGroup(0, this.TerrainHeightsbindGroupTree.sharedBindgroup!);
            passEncoder.setBindGroup(1, bindGroup1);
            passEncoder.dispatch(5120, 5120);
            passEncoder.endPass();

            console.timeEnd('Webgpu paint');
            // Get a GPU buffer for reading in an unmapped state.
            const gpuReadBuffer = this.scene.gpu.createGPUBuffer(resultMatrixBufferSize - 8, [GPUBufferUsage.COPY_DST, GPUBufferUsage.MAP_READ]);
            // Encode commands for copying buffer to buffer.
            commandEncoder.copyBufferToBuffer(
                resultMatrixBuffer,
                8,
                gpuReadBuffer,
                0,
                resultMatrixBufferSize - 8
            );
            // Submit GPU commands.
            const gpuCommands = commandEncoder.finish();
            this.scene.gpu.device.defaultQueue.submit([gpuCommands]);
            //resultMatrixBuffer.destroy();
            tres(resultMatrixBuffer);

            await gpuReadBuffer.mapAsync(GPUMapMode.READ);
            // Read buffer.
            let arrayBuffer = gpuReadBuffer.getMappedRange()
            TerrainTool.saveTexture(arrayBuffer);
            //  Terrain.terrainWorker.message<ArrayBuffer, Transferable[]>(WorkerReturn.Promise, 'saveTexture', arrayBuffer, [arrayBuffer]);
            gpuReadBuffer.destroy()
        });
    }

    readonly #terrainPositionsLength = Float32Array.BYTES_PER_ELEMENT * (Terrain.subdivisionsX + 1) * (Terrain.subdivisionsY + 1) * 3;
    readonly #terrainNormalsLength = Float32Array.BYTES_PER_ELEMENT * (Terrain.subdivisionsX + 1) * (Terrain.subdivisionsY + 1) * 3;

    readonly #terrainIndicesLength = Uint32Array.BYTES_PER_ELEMENT * (250 * 250 * 6);

    readonly indicesBuffer: SharedArrayBuffer = new SharedArrayBuffer(this.#terrainIndicesLength);


    readonly #terrainUvsLength = Float32Array.BYTES_PER_ELEMENT * (Terrain.subdivisionsX + 1) * (Terrain.subdivisionsY + 1) * 2;
    readonly terrainPositionAndUvsAndNormalsGPU: GPUVertexBuffer & GPUCopyDSTBuffer;

    readonly terrainPositionAndUvsAndNormalsCPUSwap = new SharedArrayBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength);
    readonly terrainPositionAndUvsAndNormalsCPUSwapView = new Float32Array(this.terrainPositionAndUvsAndNormalsCPUSwap);
    readonly #positionsView: Float32Array[] = [];
    readonly #normalsViewGPU: Float32Array[] = [];

    readonly verticesPositionStride = 8;


    #indices: Uint32Array = new Uint32Array(this.indicesBuffer);
    autosave = 0;
    updateSwap2(offset = 0, length: number, nofaces=false) {
        const b1 = this.scene.gpu.createGPUBuffer(length, [GPUBufferUsage.COPY_SRC], true);
        new Float32Array(b1.getMappedRange()).set(new Float32Array(this.terrainPositionAndUvsAndNormalsCPUSwap, offset, length / 4))
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
            b2 = this.scene.gpu.createGPUBuffer(this.mesh.faces.byteLength, [GPUBufferUsage.COPY_SRC], true);
            new Float32Array(b2.getMappedRange()).set(new Float32Array(this.mesh.facesBuffer))
            b2.unmap();
            commandEncoder.copyBufferToBuffer(
                b2, // source buffer
                0, //source offset
                this.facet12ArrGPUBuffer, //destination buffer
                0, //destination offset
                this.mesh.faces.byteLength);
        }
        this.scene.gpu.device.defaultQueue.submit([commandEncoder.finish()]);
        b1.destroy();
        if (!nofaces) {
            b2!.destroy();
        }
        clearTimeout(this.autosave);
        this.autosave =setTimeout(() => this.serialize(),10000)
        
    }

    static async loadFromTexture(scene: Scene): Promise<[Terrain, Promise<GPUBuffer>]> {
        /*
const t = await caches.match(new Request('/terrain.webp')).then(async cachedvertices => {
    if (cachedvertices) {
        console.log('cachedvertices');
        const buffer = await Terrain.fromSave(cachedvertices, GPUScene.instance);
        return new Terrain(buffer, 'CreateGroundFromSave.comp', GPUScene.instance);
    } else {
        const buffer = await Terrain.fromHeightMap('/images/tenerife250.webp', GPUScene.instance);
        return new Terrain(buffer, 'CreateGroundFromHeightMap.comp', GPUScene.instance);
    }
})*/
        const t = await caches.match(new Request('/terrain')).then(async cachedvertices => {
            if (cachedvertices) {
                const buffer = await Terrain.fromSave(cachedvertices);
                return new Terrain(scene, buffer);
            } else {
                const buffer = await Terrain.fromHeightMap('/images/tenerife250.webp');
                return new Terrain(scene, buffer, 'CreateGroundFromHeightMap.comp');
            }
        })

        try {

            const cachedtexture = await caches.match(new Request('/terrainTexture.webp'));
            if (cachedtexture) {
                let cacheimg = new Image();
                cacheimg.src = URL.createObjectURL(await cachedtexture.blob());

                return [t, cacheimg.decode().then(async () => {
                    let imgcanvas = new OffscreenCanvas(cacheimg.width, cacheimg.height);
                    let imgctx = imgcanvas.getContext('2d');
                    if (!imgctx)
                        throw (new Error('Unable to get 2d canvas'));
                    imgctx.drawImage(cacheimg, 0, 0);
                    //let pixels = imgctx.getImageData(0, 0, cacheimg.width, cacheimg.height).data;
                    // const padding = pixels.byteLength % 4;
                    const gpuBuffer = scene.gpu.createGPUBuffer(cacheimg.width * cacheimg.height * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC], true);
                    new Uint8ClampedArray(gpuBuffer.getMappedRange()).set(imgctx.getImageData(0, 0, cacheimg.width, cacheimg.height).data);
                    gpuBuffer.unmap();
                    return gpuBuffer;
                })];
            }
            //progelem.value = 40;
            //  blazor.invokeMethod('setProgress', 30);

            // const ground = t.terraMesh;
            return [t, t.createTexture()];
            /* let obj = {
                 width: 10000,
                 height: 10000,
                 indices: new Uint32Array(ground.indices!),
                 positions: new Float32Array(ground.positions),
                 uvs: new Float32Array(ground.uvs || [])
             };
             let trans2 = (await DB).transaction('maps', 'readwrite');
             trans2.objectStore('maps').add(obj);*/


        } catch (e) {
            console.error(e);
            throw (new Error(e));
        }
    }

    async serialize(compress = false) {
        const cacheP = caches.open('save');
        if (!compress) {

            const response = new Response(this.terrainPositionAndUvsAndNormalsCPUSwapView);
            response.headers.set('content-length', this.terrainPositionAndUvsAndNormalsCPUSwapView.buffer.byteLength.toString());
             response.headers.set('content-type', 'application/octet-stream');


            const response2 = new Response(this.#indices.buffer);
            response2.headers.set('content-length', this.#indices.buffer.byteLength.toString());
            response2.headers.set('content-type', 'application/octet-stream');
            

            const cache = await cacheP;
            cache.put(new Request('/terrain'), response);
            cache.put(new Request('/indices'), response2);

        } else {
            let c = new OffscreenCanvas((Terrain.subdivisionsX + 1) * 3, (Terrain.subdivisionsY + 1));
            let ctx = c.getContext("2d");
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
        depth: 1,
    };
    texture = this.scene.gpu.device.createTexture({
        dimension: '2d',
        format: "rgba8unorm",
        mipLevelCount: 1,
        sampleCount: 1,
        size: this.textureExtent,
        usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.SAMPLED
    });
    constructor(public scene: Scene, readonly buffer: ArrayBuffer | SharedArrayBuffer, algorithm?: string) {
        for (
            let i = 0,
            verticesAmount = this.terrainPositionAndUvsAndNormalsCPUSwap.byteLength / (8 * 4),
            byteStride = 4 * 8;
            i < verticesAmount; i++) {
            this.#positionsView.push(new Float32Array(this.terrainPositionAndUvsAndNormalsCPUSwap, i * byteStride, 3));
            this.#normalsViewGPU.push(new Float32Array(this.terrainPositionAndUvsAndNormalsCPUSwap, i * byteStride + 5 * 4, 3));
        }

        const facet12ArrCPUBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY * 4 * 2);        

        const sourceGPU = scene.gpu.createGPUBuffer(4 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + buffer.byteLength, [GPUBufferUsage.STORAGE], true);
        const sourcearr = sourceGPU.getMappedRange();
        new Float32Array(sourcearr).set([10000, 10000]);   // terrain width and height
        new Uint32Array(sourcearr).set([250, 250,   //buffer width and height
            250,        //subdivisions
        ], 2);
        new Int32Array(sourcearr).set([this.#minY, this.#maxY, this.#maxX, this.#maxZ], 5); //min and max height, maxX, maxZ
        new Uint32Array(sourcearr).set(new Uint32Array(buffer), 9);
        sourceGPU.unmap();

        // const gpuReadBufferPositions = this.scene.gpuscene.createGPUBuffer(this.#terrainPositionsLength, GPUBufferUsage.MAP_READ, GPUBufferUsage.COPY_DST);
        //  const gpuReadBufferIndices = this.scene.gpuscene.createGPUBuffer(this.#terrainIndicesLength, GPUBufferUsage.MAP_READ, GPUBufferUsage.COPY_DST);
        const commandEncoder = scene.gpu.createCommandEncoder();
        if (algorithm) {
            var terrainPositionAndUvsAndNormalsGPUTemp = this.scene.gpu.createGPUBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);

            this.terrainPositionAndUvsAndNormalsGPU = this.scene.gpu.createGPUBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST])

            const computePipeline = scene.gpu.createComputePipeline(algorithm)
            const sourceBindGroup = computePipeline.createBindGroup(0, [
                {
                    binding: 0,
                    resource: {
                        buffer: sourceGPU
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: terrainPositionAndUvsAndNormalsGPUTemp
                    }
                }
            ]);
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, sourceBindGroup);
            passEncoder.dispatch(250 + 1, 250 + 1);
            passEncoder.endPass();
        } else {
            var terrainPositionAndUvsAndNormalsGPUTemp = this.scene.gpu.createGPUBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC],true);
            new Uint8Array(terrainPositionAndUvsAndNormalsGPUTemp.getMappedRange()).set(new Uint8Array(buffer));
            terrainPositionAndUvsAndNormalsGPUTemp.unmap();


            this.terrainPositionAndUvsAndNormalsGPU = this.scene.gpu.createGPUBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST],true)
            new Uint8Array(this.terrainPositionAndUvsAndNormalsGPU.getMappedRange()).set(new Uint8Array(buffer));
            this.terrainPositionAndUvsAndNormalsGPU.unmap();
        }


        const computePipelineIndices = scene.gpu.createComputePipeline('calculatePlaneIndices.comp')
        const computePipelineNormals = scene.gpu.createComputePipeline('calculateNormals.comp')
        const computePlaneHeights = scene.gpu.createComputePipeline('calculatePlaneHeights.comp');
        const bindGroupPositions = computePlaneHeights.createBindGroup(0,
            [
                {
                    binding: 0,
                    resource: {
                        buffer: terrainPositionAndUvsAndNormalsGPUTemp
                    }
                }
            ]
        );
        const bindGroupHeights = scene.gpu.device.createBindGroup({
            layout: computePlaneHeights.getBindGroupLayout(1),
            entries: this.heightsBindGroupEntries
        });
        const bindGroupPositionsRead = scene.gpu.device.createBindGroup({
            layout: computePipelineNormals.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: terrainPositionAndUvsAndNormalsGPUTemp
                    }
                }
            ]
        });
        const bindGroupHeightsRead = scene.gpu.device.createBindGroup({
            layout: computePipelineNormals.getBindGroupLayout(1),
            entries: this.heightsBindGroupEntries
        });

        //todo: remove unneeded flags
        const terrainIndicesGPU = scene.gpu.createGPUBuffer(this.#terrainIndicesLength, [GPUBufferUsage.INDEX, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);

        const bindGroupIndices = computePipelineIndices.createBindGroup(0,
            [{
                binding: 0,
                resource: {
                    buffer: terrainIndicesGPU
                }
            }
            ]
        );

        const passEncoder = commandEncoder.beginComputePass();


        passEncoder.setPipeline(computePipelineIndices);
        passEncoder.setBindGroup(0, bindGroupIndices);
        passEncoder.dispatch(250, 250);



        passEncoder.endPass();

        //Todo: Move to same passencoder when browser supports it?
        const passEncoder2 = commandEncoder.beginComputePass();
        passEncoder2.setPipeline(computePlaneHeights);
        passEncoder2.setBindGroup(0, bindGroupPositions);
        passEncoder2.setBindGroup(1, bindGroupHeights);
        passEncoder2.dispatch(250, 250);


        passEncoder2.endPass();

        const passEncoder3 = commandEncoder.beginComputePass();
        passEncoder3.setPipeline(computePipelineNormals);
        passEncoder3.setBindGroup(0, bindGroupPositionsRead)
        passEncoder3.setBindGroup(1, bindGroupHeightsRead)
        passEncoder3.dispatch(250 + 1, 250 + 1);
        passEncoder3.endPass();

        /* commandEncoder.finishWithCopy(async (gpuReadBufferPositions, gpuReadBufferIndices) => {
 
         }, gpuBufferPositions, terrainIndicesGPU);*/
        const [gpuReadBufferPositions, gpuReadBufferIndices] = scene.gpu.createCopy(commandEncoder, terrainPositionAndUvsAndNormalsGPUTemp, terrainIndicesGPU)

        const gpuCommands = commandEncoder.finish();
        scene.gpu.device.defaultQueue.submit([gpuCommands]);


        scene.gpu.GPU2CPU(async (buff) => {
            await buff.mapAsync(GPUMapMode.READ);
            new Float32Array(facet12ArrCPUBuffer).set(new Float32Array(buff.getMappedRange()));
        }, this.facet12ArrGPUBuffer)


        terrainPositionAndUvsAndNormalsGPUTemp.destroy();
        gpuReadBufferPositions.readAndDestroy(async (buff) => {
            this.terrainPositionAndUvsAndNormalsCPUSwapView.set(new Float32Array(buff));
            this.updateSwap2(0, buff.byteLength,true);
            this.serialize();
        });
        gpuReadBufferIndices.readAndDestroy(async (buff) => {
            this.mesh.indices = new Uint32Array(buff);
        });
        this.mesh = new TerrainMesh(scene, this.texture.createView(), this.terrainPositionAndUvsAndNormalsGPU, terrainIndicesGPU, this.terrainPositionAndUvsAndNormalsCPUSwap, this.indicesBuffer, 8, this.#terrainIndicesLength / 4, facet12ArrCPUBuffer);
        this.mesh.boundingBox.box.set([this.#minX, this.#minY, this.#minZ, this.#maxX, this.#maxY, this.#maxZ]);

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
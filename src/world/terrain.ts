import type { Drawable } from "../drawables/Drawable.js";
import { GPUScene, BindGroupDrawable, BindGroupLayoutTwoBinding } from "../GPUScene.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine";
import { worldPosition } from "../traits/worldPosition.js";
import { WorkerReturn, WorkerThread } from "../WorkerThread.js";
import { TerraScene } from "../TerraScene.js";
import { boundable, Bounding } from "../traits/Boundable.js";
import { TerrainTool } from "../tools/Terrain.js";
import { SetParentAction } from "../lib/babylon/index.js";


export interface TerrainPipelineLayoutPosition extends GPUPipelineLayout {

}
export interface TerrainPipelineLayoutPositionTime extends GPUPipelineLayout {

}

export class Terrain implements boundable {
    /*

     - No writable storage buffer layouts to vertex/fragment shader
     - Bind groups indexing

     * */

    

    static subdivisionsX: number = 250;
    static subdivisionsY: number = 250;

    #width =10000;
    #height = 10000;
   
    #maxX = this.#width / 2.0;
    #maxZ = this.#height / 2.0;
    #minZ = -this.#maxZ;
    #minX = -this.#maxX;

    #minY = -2;
    #maxY = 255

   /* public boundingBox = {
        min: {
            x: this.#minX,
            y: this.#minY,
            z: this.#minZ
        },
        max: {
            x: this.#maxX,
            y: this.#maxY,
            z: this.#maxZ
        }
    }*/

    slopeArrGPUBuffer = this.scene.gpuscene.createGPUBuffer(Int32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY, [GPUBufferUsage.STORAGE]);
    facet12ArrGPUBuffer = this.scene.gpuscene.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY * 4 * 2, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST]);
  //  facet2ArrGPUBuffer = this.scene.gpuscene.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY * 4, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST);

    public slopeArrBuffer: SharedArrayBuffer;
    public facet1ArrBuffer: SharedArrayBuffer;
    public facet2ArrBuffer: SharedArrayBuffer;

    public slopeArr: Int32Array;
    public facet1Arr: Float32Array;
    public facet2Arr: Float32Array;

    #ratioX = Terrain.subdivisionsX / this.#width;
    #ratioY = Terrain.subdivisionsY / this.#height;

    static heightLayouts: Map<GPUScene, BindGroupLayoutTwoBinding> = new Map();
    //terraMesh: TerraMesh;
    static getHeightsLayout(scene: GPUScene): BindGroupLayoutTwoBinding {
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

    //TerrainHeightsbindGroupTree = this.scene.gpuscene.baseBindGroup.addChildBindGroup(this.scene.gpuscene.createBindGroup(Terrain.getHeightsLayout(this.scene.gpuscene), ...this.heightsBindGroupEntries));
    TerrainHeightsbindGroupTree = this.scene.gpuscene.baseBindGroup.addChildBindGroup(this.scene.gpuscene.createBindGroup(Terrain.getHeightsLayout(this.scene.gpuscene), ...this.heightsBindGroupEntries));

   // TerrainHeightsbindGroupPositionTree = this.TerrainHeightsbindGroupTree.addChildBindGroup(this.scene.gpuscene.createBindGroup(Terrain.getHeightsLayout(this.scene.gpuscene), ...this.heightsBindGroupEntries), this.scene.gpuscene.singleVertexUniformLayout)//new BindGroupDrawable(this.scene.gpuscene.createBindGroup(Terrain.getHeightsLayout(this.scene.gpuscene),...this.heightsBindGroupEntries),        this.TerrainHeightsbindGroupTree);
    TerrainHeightsbindGroupPositionTree = this.TerrainHeightsbindGroupTree.addChildLayout(this.scene.gpuscene.singleVertexUniformLayout)//new BindGroupDrawable(this.scene.gpuscene.createBindGroup(Terrain.getHeightsLayout(this.scene.gpuscene),...this.heightsBindGroupEntries),        this.TerrainHeightsbindGroupTree);



    public static async fromHeightMap(url: string, gpuscene: GPUScene): Promise<SharedArrayBuffer> {
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

        //@ts-ignore
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
    public createTexture(engine: WebGPUEngine): Promise<GPUBuffer> {
        return new Promise(async (tres, trej) => {

            const resultMatrixBufferSize = Int32Array.BYTES_PER_ELEMENT * (2 + 5120 * 5120);
            const resultMatrixBuffer = this.scene.gpuscene.createGPUBuffer(resultMatrixBufferSize, [GPUBufferUsage.STORAGE , GPUBufferUsage.COPY_SRC]);
                
            const computePipeline = GPUScene.instance.createComputePipeline("createTerrainTexture.comp", this.scene.gpuscene.device.createPipelineLayout({
                bindGroupLayouts: [Terrain.getHeightsLayout(GPUScene.instance), GPUScene.instance.singleWritableStorageLayout]
            }));

            const bindGroup1 = computePipeline.createBindGroup(GPUScene.instance.singleWritableStorageLayout, [
                {
                    binding: 0,
                    resource: {
                        buffer: resultMatrixBuffer
                    }
                }
            ])
            console.time('Webgpu paint')
            const commandEncoder = this.scene.gpuscene.createCommandEncoder();

            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, this.TerrainHeightsbindGroupTree.sharedBindgroup!);
            passEncoder.setBindGroup(1, bindGroup1);
            passEncoder.dispatch(5120 , 5120 );
            passEncoder.endPass();

            console.timeEnd('Webgpu paint');
            // Get a GPU buffer for reading in an unmapped state.
            const gpuReadBuffer = this.scene.gpuscene.createGPUBuffer(resultMatrixBufferSize - 8, [GPUBufferUsage.COPY_DST, GPUBufferUsage.MAP_READ]);
            // Encode commands for copying buffer to buffer.
            commandEncoder.copyBufferToBuffer(
                resultMatrixBuffer ,
                8 ,
                gpuReadBuffer ,
                0 ,
                resultMatrixBufferSize - 8 
            );
            // Submit GPU commands.
            const gpuCommands = commandEncoder.finish();
            this.scene.gpuscene.device.defaultQueue.submit([gpuCommands]);
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

   // readonly verticesBuffer: SharedArrayBuffer = new SharedArrayBuffer(this.#terrainPositionsLength);
    readonly indicesBuffer: SharedArrayBuffer = new SharedArrayBuffer(this.#terrainIndicesLength);
   // readonly normalsBuffer: SharedArrayBuffer = new SharedArrayBuffer(this.#terrainPositionsLength);

    
    
    readonly #terrainUvsLength = Float32Array.BYTES_PER_ELEMENT * (Terrain.subdivisionsX + 1) * (Terrain.subdivisionsY + 1) * 2;
    readonly #terrainPositionAndUvsAndNormalsGPU = this.scene.gpuscene.createGPUBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST])
    readonly #terrainPositionAndUvsAndNormalsGPUSwap = this.scene.gpuscene.createGPUBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);


    readonly #terrainPositionAndUvsAndNormalsCPUSwap = new SharedArrayBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength);
    readonly #terrainPositionAndUvsAndNormalsCPUSwapView = new Float32Array(this.#terrainPositionAndUvsAndNormalsCPUSwap);
    readonly #positionsView: Float32Array[] = [];
    readonly #normalsView: Float32Array[] = [];

    readonly verticesPositionBuffer = this.#terrainPositionAndUvsAndNormalsCPUSwap;
    readonly verticesPositionStride = 8;

    bounding: Bounding = new Bounding(this.scene, this);

    #indices: Uint32Array = new Uint32Array(this.indicesBuffer);
    
    //#vertices: Float32Array = new Float32Array(this.verticesBuffer);
    //#normals: Float32Array = new Float32Array(this.normalsBuffer);


    async updateSwap(offset = 0, length?: number) {
        await this.#terrainPositionAndUvsAndNormalsGPUSwap.mapAsync(GPUMapMode.WRITE, offset, length);
        const swaparraybuff = this.#terrainPositionAndUvsAndNormalsGPUSwap.getMappedRange();
        const swaparray = new Float32Array(swaparraybuff);
        swaparray.set(this.#terrainPositionAndUvsAndNormalsCPUSwapView);       
        this.#terrainPositionAndUvsAndNormalsGPUSwap.unmap();
        const commandEncoder = this.scene.gpuscene.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.#terrainPositionAndUvsAndNormalsGPUSwap, // source buffer
            offset, //source offset
            this.#terrainPositionAndUvsAndNormalsGPU, //destination buffer
            0, //destination offset
            length || this.#terrainPositionAndUvsAndNormalsCPUSwapView.byteLength);
        this.scene.gpuscene.device.defaultQueue.submit([commandEncoder.finish()]);
    }



    async serialize(compress = false) {
        const cacheP = caches.open('save');
        if (!compress) {

            //disabled fow now
           /* const response = new Response(this.#vertices.buffer);
            response.headers.set('content-length', this.#vertices.buffer.byteLength.toString());
            response.headers.set('content-type', 'application/octet-stream');
            */

            /*const response2 = new Response(this.#indices.buffer);
            response2.headers.set('content-length', this.#vertices.buffer.byteLength.toString());
            response2.headers.set('content-type', 'application/octet-stream');
            */
            const cache = await cacheP;
             //disabled fow now
          //  cache.put(new Request('/terrain'), response);
          //  cache.put(new Request('/indices'), response2);

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
    constructor(readonly buffer: ArrayBuffer | SharedArrayBuffer, algorithm: string, private scene: TerraScene) {

        for (
            let i = 0,
            verticesAmount = this.#terrainPositionAndUvsAndNormalsCPUSwap.byteLength / (8 * 4),
            byteStride = 4 * 8;
                i < verticesAmount; i++) {
            this.#positionsView.push(new Float32Array(this.#terrainPositionAndUvsAndNormalsCPUSwap, i * byteStride, 3));
            this.#normalsView.push(new Float32Array(this.#terrainPositionAndUvsAndNormalsCPUSwap, i * byteStride + 5*4, 3));
        }


        this.bounding.boundingBox.set([this.#minX, this.#minY, this.#minZ, this.#maxX, this.#maxY, this.#maxZ]);

        const decorator = () =>
        { }

        const sourceGPU = scene.gpuscene.createGPUBuffer(4 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + buffer.byteLength, [GPUBufferUsage.STORAGE], true);
        const sourcearr = sourceGPU.getMappedRange();
        new Float32Array(sourcearr).set([10000, 10000]);   // terrain width and height
        new Uint32Array(sourcearr).set([250, 250,   //buffer width and height
            250,        //subdivisions
        ], 2);
        new Int32Array(sourcearr).set([this.#minY, this.#maxY, this.#maxX, this.#maxZ], 5); //min and max height, maxX, maxZ
        new Uint32Array(sourcearr).set(new Uint32Array(buffer), 9);
        sourceGPU.unmap();

        const terrainPositionAndUvsAndNormalsGPUTemp = this.scene.gpuscene.createGPUBuffer(this.#terrainPositionsLength + this.#terrainUvsLength + this.#terrainNormalsLength, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);
       // const gpuReadBufferPositions = this.scene.gpuscene.createGPUBuffer(this.#terrainPositionsLength, GPUBufferUsage.MAP_READ, GPUBufferUsage.COPY_DST);
      //  const gpuReadBufferIndices = this.scene.gpuscene.createGPUBuffer(this.#terrainIndicesLength, GPUBufferUsage.MAP_READ, GPUBufferUsage.COPY_DST);


        const computePipeline = scene.gpuscene.createComputePipeline(algorithm)

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
            }/*,
            {
                binding: 2,
                resource: {
                    buffer: gpuBufferPositions
                }
            }*/
        ]);

        const computePipelineIndices = scene.gpuscene.createComputePipeline('calculatePlaneIndices.comp')

        const computePlaneHeights = scene.gpuscene.createComputePipeline('calculatePlaneHeights.comp');
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
        const bindGroupHeights = GPUScene.instance.device.createBindGroup({
            layout: computePlaneHeights.getBindGroupLayout(1),
            entries: this.heightsBindGroupEntries
        });


        
        const terrainIndicesGPU = scene.gpuscene.createGPUBuffer(this.#terrainIndicesLength, [GPUBufferUsage.INDEX, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);

        const bindGroupIndices = computePipelineIndices.createBindGroup(0,
             [
                {
                    binding: 0,
                    resource: {
                        buffer: terrainIndicesGPU
                    }
                }
            ]
        );
        const commandEncoder = scene.gpuscene.createCommandEncoder();

        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, sourceBindGroup);
        
        passEncoder.dispatch(250 + 1, 250 + 1);


        passEncoder.setPipeline(computePipelineIndices);
        passEncoder.setBindGroup(0, bindGroupIndices);

        passEncoder.dispatch(250, 250);
        passEncoder.endPass();

        //Todo: Move to same passencoder when browser supports it?
        const passEncoder2 = commandEncoder.beginComputePass();
        passEncoder2.setPipeline(computePlaneHeights);
        passEncoder2.setBindGroup(0, bindGroupPositions);
        passEncoder2.setBindGroup(1, bindGroupHeights);
        passEncoder2.dispatch(250, 250)
        passEncoder2.endPass();


       /* commandEncoder.finishWithCopy(async (gpuReadBufferPositions, gpuReadBufferIndices) => {

        }, gpuBufferPositions, terrainIndicesGPU);*/
        const [gpuReadBufferPositions, gpuReadBufferIndices] = scene.gpuscene.createCopy(commandEncoder, terrainPositionAndUvsAndNormalsGPUTemp, terrainIndicesGPU)
      /*  commandEncoder.copyBufferToBuffer(
            gpuBufferPositions,
            0,
            gpuReadBufferPositions,
            0,
            this.#terrainPositionsLength
        );
        commandEncoder.copyBufferToBuffer(
            terrainIndicesGPU,
            0,
            gpuReadBufferIndices,
            0,
            this.#terrainIndicesLength
        );*/
        const gpuCommands = commandEncoder.finish();
        scene.gpuscene.device.defaultQueue.submit([gpuCommands]);
        terrainPositionAndUvsAndNormalsGPUTemp.destroy();
        (async () => {
            await gpuReadBufferPositions.readAndDestroy(async (buff) => {
                this.#terrainPositionAndUvsAndNormalsCPUSwapView.set(new Float32Array(buff));
            });
            await gpuReadBufferIndices.readAndDestroy(async (buff) => {
                this.#indices.set(new Uint32Array(buff));
                let p1p2x = 0.0;                    // p1p2 vector x coordinate
                let p1p2y = 0.0;                    // p1p2 vector y coordinate
                let p1p2z = 0.0;                    // p1p2 vector z coordinate
                let p3p2x = 0.0;                    // p3p2 vector x coordinate
                let p3p2y = 0.0;                    // p3p2 vector y coordinate
                let p3p2z = 0.0;                    // p3p2 vector z coordinate

                let faceNormalx = 0.0;              // facet normal x coordinate
                let faceNormaly = 0.0;              // facet normal y coordinate
                let faceNormalz = 0.0;              // facet normal z coordinate
                let length = 0.0;                   // facet normal length before normalization
                let v1: Float32Array;
                let v2: Float32Array;
                let v3: Float32Array;
                let v1n: Float32Array;
                let v2n: Float32Array;
                let v3n: Float32Array;

               /* let v1x = 0;                        // vector1 x index in the positions array
                let v1y = 0;                        // vector1 y index in the positions array
                let v1z = 0;                        // vector1 z index in the positions array
                let v2x = 0;                        // vector2 x index in the positions array
                let v2y = 0;                        // vector2 y index in the positions array
                let v2z = 0;                        // vector2 z index in the positions array
                let v3x = 0;                        // vector3 x index in the positions array
                let v3y = 0;                        // vector3 y index in the positions array
                let v3z = 0;                        // vector3 z index in the positions array
                */
                let index = 0;

                // Loop : 1 indice triplet = 1 facet
                var nbFaces = (this.#indices.length / 3) | 0;
                //todo use simd
                for (index = 0; index < nbFaces; index++) {
                    // get the indexes of the coordinates of each vertex of the facet
                    v1 = this.#positionsView[this.#indices[index * 3]];
                    v1n = this.#normalsView[this.#indices[index * 3]];
                   /* v1x = this.#indices[index * 3] * 3;
                    v1y = v1x + 1;
                    v1z = v1x + 2;*/
                     v2 = this.#positionsView[this.#indices[index * 3 + 1]];
                    v2n = this.#normalsView[this.#indices[index * 3 + 1]];
                    /*v2x = this.#indices[index * 3 + 1] * 3;
                    v2y = v2x + 1;
                    v2z = v2x + 2;*/
                    v3 = this.#positionsView[this.#indices[index * 3 + 2]];
                    v3n = this.#normalsView[this.#indices[index * 3 + 2]];
                    /*
                    v3x = this.#indices[index * 3 + 2] * 3;
                    v3y = v3x + 1;
                    v3z = v3x + 2;*/

                    p1p2x = v1[0] - v2[0];          // compute two vectors per facet : p1p2 and p3p2
                    p1p2y = v1[1] - v2[1];
                    p1p2z = v1[2] - v2[2];

                    p3p2x = v3[0] - v2[0];
                    p3p2y = v3[1] - v2[1];
                    p3p2z = v3[2] - v2[2];

                    // compute the face normal with the cross product
                    faceNormalx = p1p2y * p3p2z - p1p2z * p3p2y;
                    faceNormaly = p1p2z * p3p2x - p1p2x * p3p2z;
                    faceNormalz = p1p2x * p3p2y - p1p2y * p3p2x;
                    // normalize this normal and store it in the array facetData
                    length = Math.sqrt(faceNormalx * faceNormalx + faceNormaly * faceNormaly + faceNormalz * faceNormalz);
                    length = (length === 0) ? 1.0 : length;
                    faceNormalx /= length;
                    faceNormaly /= length;
                    faceNormalz /= length;

                    // compute the normals anyway
                    v1n[0] += faceNormalx;                         // accumulate all the normals per face
                    v1n[1] += faceNormaly;
                    v1n[2] += faceNormalz;
                    v2n[0] += faceNormalx;
                    v2n[1] += faceNormaly;
                    v2n[2] += faceNormalz;
                    v3n[0] += faceNormalx;
                    v3n[1] += faceNormaly;
                    v3n[2] += faceNormalz;
                }
                this.#normalsView.forEach(normal => {
                    length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[2] + normal[2] * normal[2]);
                    length = (length === 0) ? 1.0 : length;
                    normal[0] /= length;
                    normal[1] /= length;
                    normal[2] /= length;
                })
              /*  for (index = 0; index < arr.length / 3; index++) {
                    faceNormalx = arr[index * 3];
                    faceNormaly = arr[index * 3 + 1];
                    faceNormalz = arr[index * 3 + 2];

                    length = Math.sqrt(faceNormalx * faceNormalx + faceNormaly * faceNormaly + faceNormalz * faceNormalz);
                    length = (length === 0) ? 1.0 : length;
                    faceNormalx /= length;
                    faceNormaly /= length;
                    faceNormalz /= length;

                    arr[index * 3] = faceNormalx;
                    arr[index * 3 + 1] = faceNormaly;
                    arr[index * 3 + 2] = faceNormalz;
                }*/
                
                this.updateSwap()

            });
            /*await gpuReadBufferPositions.readAndDestroy(async (buff) => {
                console.log(new Float32Array(buff));
                this.#vertices.set(new Float32Array(buff));
                gpuBufferPositions.destroy();
            });*/
            this.serialize();
        })();

        const m = scene.gpuscene.lightsBindGroup.addDrawable({
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
                        arrayStride: 4 * 8,
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
        }, null, this.#terrainIndicesLength/4, 1)
        m.setVertexBuffer(0, this.#terrainPositionAndUvsAndNormalsGPU);
        m.setIndexBuffer(terrainIndicesGPU);
      //  this.terraMesh = new TerraMesh('ground', vdata.positions, vdata.indices, undefined, vdata.uvs);
       // this.terraMesh = new TerraMesh('ground', new Float32Array([1,2,3,4,5,6,7,8,9]));


        this.slopeArrBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY)
        this.facet1ArrBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY * 4);
        this.facet2ArrBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY * 4);
        this.slopeArr = new Int32Array(this.slopeArrBuffer);
        this.facet1Arr = new Float32Array(this.facet1ArrBuffer);
        this.facet2Arr = new Float32Array(this.facet2ArrBuffer);
        console.log('terrain bounding');
    }

    //BABYLON 4103
    //ARRAY 2800 -> 1897 -> 1720 -> 1708 -> 1631
    //Dataview 6100
    //pure array  848 -> 763


    getHeightAtCoordinates(x: number, z: number): number {
        let facet: Float32Array;
        let col = ((x + this.#maxX) * this.#ratioX) | 0;
        let row = (-(z + this.#maxZ) * this.#ratioY + Terrain.subdivisionsY) | 0;
        debugger;
        console.log(col, row);
        let pos: number = row * Terrain.subdivisionsX + col;
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
                return this.getHeightAtCoordinates(Math.min(Math.max(x, this.#minX + 1), this.#maxX - 1), Math.min(Math.max(z, this.#minZ + 1), this.#maxZ - 1))
            }
            throw (e);
        }
        return -(facet[0] * x + facet[2] * z + facet[3]) / facet[1];
    }
}
import { UITAB, UITABClassLike } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
import { WorkerReturn, WorkerThread } from "../WorkerThread.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine.js";
import type { WorldScene } from "../world/scene.js";
import { worldPosition, has3DPosition } from "../traits/worldPosition.js";
import { canvasListener } from "../traits/canvasListener.js";
import { addTrait, Trait, Traitable } from "../traits/trait.js";
import type { GPU } from "../GPU.js";
import type { Drawable } from "../GPU/Drawable.js";
import { TerraNode } from "../TerraNode.js";
import type { TerraScene } from "../TerraScene.js";
import { Sea } from "../world/water.js";

const terrainWorker=  new WorkerThread('../webworkers/terrainWorker.js');

export interface TerrainTool extends canvasListener, Traitable {

}

@addTrait(canvasListener)
export class TerrainTool extends TerraNode implements has3DPosition  {

    public static instance: UITAB | null = null;

   // private engine: WebGPUEngine;
    private helper: Drawable;

    tempFacet1Buffer: (GPUCopySRCBuffer & GPUMapWriteBuffer) | null = null;
    tempFacet2Buffer: (GPUCopySRCBuffer & GPUMapWriteBuffer) | null = null;

    worldPosition: worldPosition;

    traits: Trait[];
    constructor(
        public scene: TerraScene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        public sea: Sea,
        ...traits: Trait[]
    ) {
        super(scene);
        this.traits = this.initTraits(traits);

        terrainWorker.message(WorkerReturn.Promise, 'init',
            {
                positionsAndNormals: terrain.verticesPositionBuffer,
                indices: terrain.indicesBuffer,
                subdivisionsX: Terrain.subdivisionsX,
                subdivisionsY: Terrain.subdivisionsY,
                boundingBox: terrain.bounding.boundingBox,
                slopeArr: terrain.slopeArrBuffer,
                facet1Arr: terrain.facet1ArrBuffer,
                facet2Arr: terrain.facet2ArrBuffer
            });

       // this.engine = sceneDeprecated.getEngine() as WebGPUEngine;

        this.worldPosition = new worldPosition(this);

        const helperPipeline = terrain.TerrainHeightsbindGroupPositionTree.addRenderPipeline({
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
                module: scene.gpuscene.shaderModules.get("helper2.vert")!,
                entryPoint: "main",
            },
            fragmentStage: {
                module: scene.gpuscene.shaderModules.get("helper2.frag")!,
                entryPoint: "main"
            }
        }, [this.bufferOffset]);

        this.helper = helperPipeline.addDrawable([scene.gpuscene.renderPassScreen],4,0, 8, 0, 0)
        /*
         *         this.helper = terrain.TerrainHeightsbindGroupPositionTree.addDrawable({
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
                module: GPUScene.instance.shaderModules.get("helper2.vert")!,
                entryPoint: "main",
            },
            fragmentStage: {
                module: GPUScene.instance.shaderModules.get("helper2.frag")!,
                entryPoint: "main"
            }
        }, [
            GPUScene.instance.device.createBindGroup({
                layout: GPUScene.instance.singleVertexUniformLayout,
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.worldPosition.worldPositionGPUBuffer
                        }
                    }
                ],
            })
        ], 4, 8,0,0);*/


        this.addListener("pointermove", this.mouseListener, { lazy: 15 });

        let commandEncoder2: TerraGPUCommandEncoder;
        let updateFacet: GPUCommandBuffer[];
        let query: { data: any }[] = [];
        terrainWorker.subscribe('SubHeights', async (v) => {
            // TODO: Update only partial of data
            //disabled for now
           /* if (!this.tempFacet1Buffer || !this.tempFacet2Buffer) {
                this.tempFacet1Buffer = GPUScene.instance.createGPUBuffer(this.terrain.facet1Arr.byteLength, //v.data.length
                    GPUBufferUsage.COPY_SRC ,GPUBufferUsage.MAP_WRITE);
                this.tempFacet2Buffer = GPUScene.instance.createGPUBuffer(this.terrain.facet2Arr.byteLength,GPUBufferUsage.COPY_SRC , GPUBufferUsage.MAP_WRITE);
                commandEncoder2 = GPUScene.instance.createCommandEncoder();
                commandEncoder2.copyBufferToBuffer(
                    this.tempFacet1Buffer, 0,
                    this.terrain.facet1ArrGPUBuffer,
                    0, // v.data.srcOffset,
                    this.terrain.facet1Arr.byteLength);
                commandEncoder2.copyBufferToBuffer(
                    this.tempFacet2Buffer, 0,
                    this.terrain.facet2ArrGPUBuffer,
                    0,
                    this.terrain.facet2Arr.byteLength);
                updateFacet = [commandEncoder2.finish()];
            }
            query.push(v.data);
            if (query.length == 1) {
                while (query.length) {
                    try {
                        await Promise.all([
                            this.tempFacet1Buffer.mapWriteAsync().then(facet1 => {
                                //new Float32Array(facet1).set(new Float32Array(this.terrain.facet1ArrBuffer, v.data.srcOffset, v.data.length/4))
                                new Float32Array(facet1).set(this.terrain.facet1Arr)
                                this.tempFacet1Buffer!.unmap();
                            }),
                            this.tempFacet2Buffer.mapWriteAsync().then(facet2 => {
                                new Float32Array(facet2).set(this.terrain.facet2Arr)
                                this.tempFacet2Buffer!.unmap();
                            })
                        ]);
                        GPUScene.instance.device.defaultQueue.submit(updateFacet);
                        query.shift();
                    } catch (e) {
                        console.error(e);
                        debugger;
                        query = [];
                    }
                }
            }*/



            /*let width = v.data.endX - v.data.offsetX;
            gl.bindTexture(gl.TEXTURE_2D, this.glTexture2);
            (<WebGL2RenderingContext><any>gl).texSubImage2D(gl.TEXTURE_2D, 0, v.data.offsetX, v.data.offsetY, width, 1, gl.RGBA, gl.FLOAT, this.terrain.facet1Arr, v.data.srcOffset)

            gl.bindTexture(gl.TEXTURE_2D, this.glTexture3);
            (<WebGL2RenderingContext><any>gl).texSubImage2D(gl.TEXTURE_2D, 0, v.data.offsetX, v.data.offsetY, width, 1, gl.RGBA, gl.FLOAT, this.terrain.facet2Arr, v.data.srcOffset)
            gl.bindTexture(gl.TEXTURE_2D, null);*/
        });
        let boundingBox = this.terrain.bounding.boundingBox;
        // let boundingInfo = this.terrain.subMeshes[0].getBoundingInfo();
        terrainWorker.subscribe('bounding', (v) => {


           // this.terrain.terraMesh.lastColliderWorldVertices = null;


            /*  this.terrain.subMeshes[0]._lastColliderWorldVertices = null;
              boundingInfo.boundingBox.minimum.y = v.data.boundingBox.minY
              boundingInfo.boundingBox.maximum.y = v.data.boundingBox.maxY
              boundingInfo.boundingBox.minimumWorld.y = v.data.boundingBox.minY
              boundingInfo.boundingBox.maximumWorld.y = v.data.boundingBox.maxY
  
              boundingInfo.boundingSphere.radius = v.data.boundingSphereRadius
              boundingInfo.boundingSphere.radiusWorld = v.data.boundingSphereRadius*/
            //disabled for now;
            /*
            //@ts-ignore
            mainboundingInfo.boundingBox.minimum.y = v.data.boundingBox.minY
             //@ts-ignore
            mainboundingInfo.boundingBox.maximum.y = v.data.boundingBox.maxY
             //@ts-ignore
            mainboundingInfo.boundingBox.minimumWorld.y = v.data.boundingBox.minY;
             //@ts-ignore
            mainboundingInfo.boundingBox.maximumWorld.y = v.data.boundingBox.maxY;
             //@ts-ignore
            mainboundingInfo.boundingSphere.radius = v.data.boundingSphereRadius
             //@ts-ignore
            mainboundingInfo.boundingSphere.radiusWorld = v.data.boundingSphereRadius*/
        });

        
    }
    static saveTexture(arrayBuffer: ArrayBuffer) {
        terrainWorker.message<ArrayBuffer, Transferable[]>(WorkerReturn.Promise, 'saveTexture', arrayBuffer, [arrayBuffer]);
    }
    private direction = 0;
    private mouseinterval: number = 0;
    pointerdownf = (evt: PointerEvent): void => {
        if (evt.button !== 0) {
            /*let avarages = {
                test1: [],
                test2: []
            };
            let timed;
            for (let i = 0; i < 20; i++) {
                timed = new Date().getTime();
                this.terrain.intersects(this.ray);
                avarages['test1'].push(new Date().getTime() - timed)
                timed = new Date().getTime();
                this.terrain.intersects2(this.ray);
                avarages['test2'].push(new Date().getTime() - timed)
            }
            console.log(avarages);
            for (let key in avarages) {
                avarages[key].shift(); avarages[key].shift(); avarages[key].shift();
                console.log(key, avarages[key].reduce((a, b) => a + b, 0) / 17)
            }*/
            return;
        }
        this.addListener("pointerup", this.pointerupf, { once: true });
        this.camera.detachControl(this.scene.gpuscene.renderPassScreen.canvas);
       /*  //@ts-ignore
        const normalbuffer: GPUBuffer = this.terrain.terraMesh._geometry!._vertexBuffers["normal"]._buffer.getBuffer()!.underlyingResource;
        //@ts-ignore
        const vertexbuffer: GPUBuffer = this.terrain.terraMesh._geometry!._vertexBuffers["position"]._buffer.getBuffer()!.underlyingResource;

        const tempNormalBuffer = GPUScene.instance.device.createBuffer({
            //@ts-ignore
            size: this.terrain.terraMesh._geometry!._vertexBuffers["normal"]._buffer.getBuffer()!.capacity, // also this.terrain.normals.byteLength
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE
        });
        const tempVertexBuffer = GPUScene.instance.device.createBuffer({
            //@ts-ignore
            size: this.terrain.terraMesh._geometry!._vertexBuffers["position"]._buffer.getBuffer()!.capacity, // also this.terrain.normals.byteLength
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE
        });
        const commandEncoder = GPUScene.instance.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            tempNormalBuffer, 0,
            normalbuffer, 0,
            //@ts-ignore
            this.terrain.terraMesh.normals!.byteLength);
        commandEncoder.copyBufferToBuffer(
            tempVertexBuffer, 0,
            vertexbuffer, 0,
            //@ts-ignore
            this.terrain.terraMesh.positions.byteLength);
        const updateNormals = [commandEncoder.finish()];
        */

        let busy = false;

        this.mouseinterval = setInterval(() => {
            terrainWorker.message(WorkerReturn.Promise, 'elevateFaces', { radius: 50, height: 5, direction: this.direction }).then(async e => {
                if (busy)
                    return;
                busy = true;
                let NormalsRange = <{ normalsMin: number, normalsMax: number }><any>e;

                /*await Promise.all([tempNormalBuffer.mapWriteAsync().then(normalsArrBuffer => {
                    //@ts-ignore
                    new Float32Array(normalsArrBuffer).set(this.terrain.terraMesh.normals!);
                    tempNormalBuffer.unmap();
                }),
                    tempVertexBuffer.mapWriteAsync().then(positionsArrBuffer => {
                    //@ts-ignore
                    new Float32Array(positionsArrBuffer).set(this.terrain.terraMesh.positions);
                    tempVertexBuffer.unmap();

                })]);
                GPUScene.instance.device.defaultQueue.submit(updateNormals);*/
                busy = false;
                let range = <{ min: number, max: number }><any>e;
                console.log('update normals ', NormalsRange.normalsMin, NormalsRange.normalsMax - NormalsRange.normalsMin);
                console.log('update normals ', range.min, range.max - range.min);
                this.terrain.updateSwap();



                /* gl.bindBuffer(gl.ARRAY_BUFFER, normalbuffer);
                if (this.terrain.normalsView !== null)
                    gl.bufferSubData(gl.ARRAY_BUFFER, NormalsRange.normalsMin, this.terrain.normalsView, NormalsRange.normalsMin, NormalsRange.normalsMax - NormalsRange.normalsMin)
                gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
                gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexbuffer);
                let range = <{ min: number, max: number }><any>e;
                gl.bufferSubData(this.gl.ARRAY_BUFFER, range.min, this.terrain.positionsView, range.min, range.max - range.min);
               */
            });
            //this.elevateFaces(this.pickinfo, 50, 5);
        }, 100);
    }
    pointerupf = (evt: PointerEvent): void => {
        this.camera.attachControl(this.scene.gpuscene.renderPassScreen.canvas, true);
        clearInterval(this.mouseinterval);
    }
    destroy = (): void => {
        this.traits.forEach(trait => trait.destroy());
        console.log('call super.deactivate');
        terrainWorker.unsubscribe('heights');
        this.helper.destroy();
        
    };

    mouseListener = (evt: PointerEvent): void => {
        let viewport = this.camera.viewport.toGlobal(this.scene.canvasSize.width, this.scene.canvasSize.height);

        if (this.tempFacet1Buffer && this.tempFacet2Buffer) {
          /*  this.tempFacet1Buffer.destroy();
            this.tempFacet2Buffer.destroy();
            this.tempFacet1Buffer = null;
            this.tempFacet2Buffer = null;*/
        }
      //  console.log('send', evt.clientX, evt.clientY);
        terrainWorker.message<{ x: number, y: number }, any>(WorkerReturn.Promise, 'mousemove',
            {
                x: evt.clientX,
                y: evt.clientY,
                viewportWidth: viewport.width,
                viewportHeight: viewport.height,
                view: this.camera.getViewMatrix().toArray(),
                projection: this.camera.getProjectionMatrix().toArray()
            }).then(async (flatPos) => {
                this.worldPosition.setTranslationX(flatPos.x)
                this.worldPosition.setTranslationZ(flatPos.y)
                //this.worldPosition.translation[0] = flatPos.x;
               // this.worldPosition.translation[2] = flatPos.y;
               // this.worldPosition.updatePositionBuffer();
            });
    }
    raise = (): void => {
        this.direction = 1;
        //let canvas = this.scene.getEngine().getRenderingCanvas();
        
        this.removeListener("pointerdown", this.pointerdownf);
        console.log('add pointerdown listener');
        this.addListener("pointerdown", this.pointerdownf);

    }
    lower = (): void => {
        this.direction = -1;
        //let canvas = this.scene.getEngine().getRenderingCanvas();
        this.removeListener("pointerdown", this.pointerdownf);
        console.log('add pointerdown listener');
        this.addListener("pointerdown", this.pointerdownf);
    }
}

//export const TerrainTool = applyMixins<typeof BaseTerrainTool>(BaseTerrainTool, [worldPosition, canvasListener]);


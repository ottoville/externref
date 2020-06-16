import { UITAB, UITABClassLike } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
import { WorkerReturn } from "../WorkerThread.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine.js";
import type { WorldScene } from "../world/scene.js";
import { UIMesh } from "../UIMesh.js";
import { worldPosition } from "../traits/worldPosition.js";
import { canvasListener } from "../traits/canvasListener.js";
import { addTrait, Trait, Traitable } from "../traits/trait.js";
import { GPUCanvas } from "../GPUCanvas.js";



export interface TerrainTool extends worldPosition, canvasListener, Traitable {

}

@addTrait(worldPosition)
@addTrait(canvasListener)
export class TerrainTool  {

    public static instance: UITAB | null = null;

    private engine: WebGPUEngine;
    private helper: UIMesh;

    tempFacet1Buffer: GPUBuffer | null = null;
    tempFacet2Buffer: GPUBuffer | null = null;

    #shaderModules: Map<string, GPUShaderModule>
    traits: Trait[];
    constructor(
        public scene: WorldScene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        shaderModules: Map<string, GPUShaderModule>,
        ...traits: Trait[]
    ) {
        this.traits = this.initTraits(traits);

        this.#shaderModules = shaderModules;
        this.engine = scene.getEngine() as WebGPUEngine;;


        const timeLayout = GPUCanvas.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    type: 'uniform-buffer'
                }
            ]
        });
        console.log([this.scene.uniformBindGroupLayout, this.terrain.bindGroupLayout, UIMesh.positionLayout, timeLayout]);
        this.helper = new UIMesh({
            layout: GPUCanvas.device.createPipelineLayout({
                bindGroupLayouts: [this.scene.uniformBindGroupLayout, this.terrain.bindGroupLayout, UIMesh.positionLayout, timeLayout]
            }),
            //@ts-ignore
            sampleCount: this.engine._mainPassSampleCount,
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
                module: this.#shaderModules.get("helper2.vert")!,
                entryPoint: "main",
            },
            fragmentStage: {
                module: this.#shaderModules.get("helper2.frag")!,
                entryPoint: "main"
            },
            vertexState: {
                vertexBuffers:
                    [{
                        arrayStride: 4 * 3,
                        stepMode: "vertex" as GPUInputStepMode,
                        attributes: [{
                            // position
                            shaderLocation: 0,
                            offset: 0,
                            format: "float3" as GPUVertexFormat
                        }]
                    }]
            },
            // layout: pipelineLayout,
        }, new Set([
            GPUCanvas.device.createBindGroup({
                layout: UIMesh.positionLayout,
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.worldPositionGPUBuffer
                        }
                    }
                ],
            }), GPUCanvas.device.createBindGroup({
                layout: timeLayout,
                entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.scene.timeBuffer
                    }
                }],
            })
        ]), 4, 8);
        this.helper.setVertexBuffer(0, new Float32Array([
            -0.5, 1.5, 2,
            -0.5, 1.5, -2,
            0.5, 1.5, 3,
            0.5, 1.5, -3,
        ]).buffer);
        // this.helper._internalAbstractMeshDataInfo._visibility = 1;
        console.log('add pointermove listener');
        this.addListener("pointermove", this.mouseListener, { lazy: 15 });

        let commandEncoder2: GPUCommandEncoder;
        let updateFacet: GPUCommandBuffer[];
        let query: { data: any }[] = [];
        Terrain.terrainWorker.subscribe('SubHeights', async (v) => {
            // TODO: Update only partial of data
            if (!this.tempFacet1Buffer || !this.tempFacet2Buffer) {
                this.tempFacet1Buffer = GPUCanvas.device.createBuffer({
                    size: this.terrain.facet1Arr.byteLength, //v.data.length
                    usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE
                });
                this.tempFacet2Buffer = GPUCanvas.device.createBuffer({
                    size: this.terrain.facet2Arr.byteLength,
                    usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE
                });
                commandEncoder2 = GPUCanvas.device.createCommandEncoder();
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
                        GPUCanvas.device.defaultQueue.submit(updateFacet);
                        query.shift();
                    } catch (e) {
                        console.error(e);
                        debugger;
                        query = [];
                    }
                }
            }

            /*let width = v.data.endX - v.data.offsetX;
            gl.bindTexture(gl.TEXTURE_2D, this.glTexture2);
            (<WebGL2RenderingContext><any>gl).texSubImage2D(gl.TEXTURE_2D, 0, v.data.offsetX, v.data.offsetY, width, 1, gl.RGBA, gl.FLOAT, this.terrain.facet1Arr, v.data.srcOffset)

            gl.bindTexture(gl.TEXTURE_2D, this.glTexture3);
            (<WebGL2RenderingContext><any>gl).texSubImage2D(gl.TEXTURE_2D, 0, v.data.offsetX, v.data.offsetY, width, 1, gl.RGBA, gl.FLOAT, this.terrain.facet2Arr, v.data.srcOffset)
            gl.bindTexture(gl.TEXTURE_2D, null);*/
        });
        let mainboundingInfo = this.terrain.getBoundingInfo();
        // let boundingInfo = this.terrain.subMeshes[0].getBoundingInfo();
        Terrain.terrainWorker.subscribe('bounding', (v) => {


            this.terrain.lastColliderWorldVertices = null;


            /*  this.terrain.subMeshes[0]._lastColliderWorldVertices = null;
              boundingInfo.boundingBox.minimum.y = v.data.boundingBox.minY
              boundingInfo.boundingBox.maximum.y = v.data.boundingBox.maxY
              boundingInfo.boundingBox.minimumWorld.y = v.data.boundingBox.minY
              boundingInfo.boundingBox.maximumWorld.y = v.data.boundingBox.maxY
  
              boundingInfo.boundingSphere.radius = v.data.boundingSphereRadius
              boundingInfo.boundingSphere.radiusWorld = v.data.boundingSphereRadius*/

            mainboundingInfo.boundingBox.minimum.y = v.data.boundingBox.minY
            mainboundingInfo.boundingBox.maximum.y = v.data.boundingBox.maxY
            mainboundingInfo.boundingBox.minimumWorld.y = v.data.boundingBox.minY;
            mainboundingInfo.boundingBox.maximumWorld.y = v.data.boundingBox.maxY;

            mainboundingInfo.boundingSphere.radius = v.data.boundingSphereRadius
            mainboundingInfo.boundingSphere.radiusWorld = v.data.boundingSphereRadius
        });

        
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
        this.camera.detachControl(GPUCanvas.canvas);
        const normalbuffer: GPUBuffer = this.terrain._geometry!._vertexBuffers["normal"]._buffer.getBuffer()!.underlyingResource;
        const vertexbuffer: GPUBuffer = this.terrain._geometry!._vertexBuffers["position"]._buffer.getBuffer()!.underlyingResource;

        const tempNormalBuffer = GPUCanvas.device.createBuffer({
            size: this.terrain._geometry!._vertexBuffers["normal"]._buffer.getBuffer()!.capacity, // also this.terrain.normals.byteLength
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE
        });
        const tempVertexBuffer = GPUCanvas.device.createBuffer({
            size: this.terrain._geometry!._vertexBuffers["position"]._buffer.getBuffer()!.capacity, // also this.terrain.normals.byteLength
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE
        });
        const commandEncoder = GPUCanvas.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            tempNormalBuffer, 0,
            normalbuffer, 0,
            this.terrain.normals!.byteLength);
        commandEncoder.copyBufferToBuffer(
            tempVertexBuffer, 0,
            vertexbuffer, 0,
            this.terrain.positions.byteLength);
        const updateNormals = [commandEncoder.finish()];


        let busy = false;

        this.mouseinterval = setInterval(() => {
            Terrain.terrainWorker.message(WorkerReturn.Promise, 'elevateFaces', { radius: 50, height: 5, direction: this.direction }).then(async e => {
                if (busy)
                    return;
                busy = true;
                let NormalsRange = <{ normalsMin: number, normalsMax: number }><any>e;
                await Promise.all([tempNormalBuffer.mapWriteAsync().then(normalsArrBuffer => {
                    new Float32Array(normalsArrBuffer).set(this.terrain.normals!);
                    tempNormalBuffer.unmap();
                }),
                tempVertexBuffer.mapWriteAsync().then(positionsArrBuffer => {
                    new Float32Array(positionsArrBuffer).set(this.terrain.positions);
                    tempVertexBuffer.unmap();

                })]);
                GPUCanvas.device.defaultQueue.submit(updateNormals);
                busy = false;
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
        this.camera.attachControl(GPUCanvas.canvas, true);
        clearInterval(this.mouseinterval);
    }
    destroy = (): void => {
        this.traits.forEach(trait => trait.destroy());
        console.log('call super.deactivate');
        //super.deactivate();
        Terrain.terrainWorker.unsubscribe('heights');
        //this.removeListener("pointerdown", this.pointerdownf);
       // this.helper._internalAbstractMeshDataInfo._visibility = 0;
        this.helper.destroy();
        
        //this.removeListener("pointermove", this.mouseListener);
      /*  (function () {
            this._options.samplers = [];
            this._textures = {}
            return this;
        }).bind(this.helpermaterial)();*/
    };

    mouseListener = (evt: PointerEvent): void => {
        let viewport = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight());
        let boundingInfo = this.terrain.subMeshes[0].getBoundingInfo();
        if (this.tempFacet1Buffer && this.tempFacet2Buffer) {
          /*  this.tempFacet1Buffer.destroy();
            this.tempFacet2Buffer.destroy();
            this.tempFacet1Buffer = null;
            this.tempFacet2Buffer = null;*/
        }
        Terrain.terrainWorker.message<{ x: number, y: number }, any>(WorkerReturn.Promise, 'mousemove',
            {
                x: evt.clientX,
                y: evt.clientY,
                viewportWidth: viewport.width,
                viewportHeight: viewport.height,
                view: this.camera.getViewMatrix().toArray(),
                projection: this.camera.getProjectionMatrix().toArray()
            }).then(async (flatPos) => {
                this.translation[0] = flatPos.x;
                this.translation[2] = flatPos.y;
                this.updatePositionBuffer();
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


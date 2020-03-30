import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
import { WorkerReturn } from "../WorkerThread.js";
import { Mesh } from "../lib/babylon/Meshes/mesh.js";
import { ShaderMaterial } from "../lib/babylon/Materials/shaderMaterial.js";
import type { Scene } from "../lib/babylon/scene.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import { Material } from "../lib/babylon/Materials/material.js";
import type { Effect, IEffectCreationOptions } from "../lib/babylon/Materials/effect.js";
import type { SubMesh } from "../lib/babylon/Meshes/subMesh.js";
import { TerraMesh } from "../TerraMesh.js";
import { WebGPUShaderProcessingContext } from "../lib/babylon/Engines/WebGPU/webgpuShaderProcessingContext.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine.js";
import { TerraEffect } from "../TerraEffect.js";
import { WebGPUDataBuffer } from "../lib/babylon/Meshes/WebGPU/webgpuDataBuffer.js";
import type { WebGPUPipelineContext } from "../lib/babylon/Engines/WebGPU/webgpuPipelineContext.js";


//@ts-ignore
export class TerrainTool extends UITAB {

    //private ray = BABYLON.Ray.Zero();
    //private pickinfo: BABYLON.PickingInfo;
    //private vertexData = new BABYLON.VertexData();
    private helper = new TerraMesh("Helper", new Uint32Array([0, 1, 2, 3]), new Float32Array([
        -0.5, 0, -2,
        0.5, 0, -3,
        0.5, 0, 3,
        //-0.5, 0, 2,
    ]));
    private helpermaterial: ShaderMaterial;
    private timed = new Date().getTime();
    private glTexture: WebGLTexture | null = null;
    private glTexture2: WebGLTexture | null = null;
    private glTexture3: WebGLTexture | null = null;
    private gl: WebGLRenderingContext;
    private uniformsV2: Map<WebGLUniformLocation, { x: number, y: number }> = new Map();
    private setTime = () => {
        this.helpermaterial.setFloat("time", (this.timed - new Date().getTime()) / 1000);
    }
    public canvas: HTMLCanvasElement;
    // private helperIndices = new Uint16Array([0, 1, 2, 3]);
    private GPUuniformBuffer: GPUBuffer;
    constructor(
        private scene: Scene,
        private terrain: Terrain,
        private camera: ArcRotateCamera,
    ) {
        super();
        this.canvas = <any>scene.getEngine().getRenderingCanvas();
        //this.helper.subMeshes[0]._materialEffect = 
        let engine = scene.getEngine() as WebGPUEngine;
        let ctx = new WebGPUShaderProcessingContext();
        ctx.availableUBOs = {
            'slopeArr': { setIndex: 0, bindingIndex: 0 },
            'facet1Arr': { setIndex: 1, bindingIndex: 1 },
            'facet2Arr': { setIndex: 2, bindingIndex: 2 }
        }
        ctx.orderedUBOsAndSamplers = [[{ name: 'slopeArr', isSampler: false }, { name: 'facet1Arr', isSampler: false }, { name: 'facet2Arr', isSampler: false }, { name: 'uniforms', isSampler: false }]]
        let pipeline = engine.createPipelineContext(ctx);
        Promise.all([fetch('/shaders/helper.vert'), fetch('/shaders/helper.frag')]).then(async shaders => {
            let shaderssource = await Promise.all(shaders.map(shader => shader.text()));
            engine._preparePipelineContext(pipeline, shaderssource[0], shaderssource[1], true, true, '', [], 'helper');
            //@ts-ignore;
            let compiledshader = engine._compiledShaders['helper'];
            let effect = new TerraEffect("./shaders/helper",
                {
                    attributes: ['position'],
                    uniformsNames: ['flatPos', 'world', 'worldViewProjection', 'time'],
                    uniformBuffersNames: ['slopeArr', 'facet1Arr', 'facet2Arr'],
                    samplers: [],
                    defines: null,
                    fallbacks: null,
                    onCompiled: null,
                    onError: null
                }, engine, null, null, null, null, null, null, null, 'helper', compiledshader.sources);

            //@ts-ignore
            let device: GPUDevice = (engine as WebGPUEngine)._device;
            let vertices = new Float32Array([
                -0.5, 0, -2,
                0.5, 0, -3,
                0.5, 0, 3,
                //-0.5, 0, 2,
            ]);
            let indices = new Uint16Array([0, 1, 2, 3]);

            const [GPUvertexBuffer, vertexBuffer] = device.createBufferMapped({
                size: vertices.byteLength,
                //@ts-ignore
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            GPUvertexBuffer.unmap();
            const [GPUslopeBuffer, slopeBuffer] = device.createBufferMapped({
                size: 250 * 250 * Uint16Array.BYTES_PER_ELEMENT,
                //@ts-ignore
                usage: GPUBufferUsage.STORAGE,
            });
            GPUslopeBuffer.unmap();
            const [GPUfacet1Buffer, facet1Buffer] = device.createBufferMapped({
                size: 250 * 250 * Float32Array.BYTES_PER_ELEMENT,
                //@ts-ignore
                usage: GPUBufferUsage.STORAGE,
            });
            GPUfacet1Buffer.unmap();
            const [GPUfacet2Buffer, facet2Buffer] = device.createBufferMapped({
                size: 250 * 250 * Float32Array.BYTES_PER_ELEMENT,
                //@ts-ignore
                usage: GPUBufferUsage.STORAGE,
            });
            GPUfacet2Buffer.unmap();
            const [GPUuniformBuffer, uniformBuffer] = device.createBufferMapped({
                size: (2 * 4) + 4,
                //@ts-ignore
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            GPUuniformBuffer.unmap();
            this.GPUuniformBuffer = GPUuniformBuffer;

            //@ts-ignore
            //engine._uniformsBuffers['slopeArr'] = new WebGPUDataBuffer(GPUslopeBuffer);
            //@ts-ignore
            //engine._uniformsBuffers['facet1Arr'] = new WebGPUDataBuffer(GPUfacet1Buffer);
            //@ts-ignore
            //engine._uniformsBuffers['facet2Arr'] = new WebGPUDataBuffer(GPUfacet2Buffer);
            //@ts-ignore
           // engine._uniformsBuffers['uniforms'] = new WebGPUDataBuffer(GPUuniformBuffer);

           /* let uniformsBindGroupLayout = device.createBindGroupLayout({
                bindings: [{
                    binding: 0,
                    //@ts-ignore
                    visibility: GPUShaderStage.VERTEX,
                    type: "uniform-buffer"
                }]
            });*/

            //@ts-ignore
            effect._pipelineContext.vertexInputs = {
                vertexStartSlot: 0,
                vertexBuffers: [GPUvertexBuffer],
                vertexOffsets: [0]
            }
            effect._pipelineContext.renderPipeline = device.createRenderPipeline({
                //@ts-ignore
                vertexStage: {
                    module: device.createShaderModule({
                        //@ts-ignore
                        code: engine._compileRawShaderToSpirV(shaderssource[0], "vertex"),
                    }),
                    entryPoint: "main",
                },
                //@ts-ignore
                fragmentStage: {
                    module: device.createShaderModule({
                        //@ts-ignore
                        code: engine._compileRawShaderToSpirV(shaderssource[1], "fragment"),
                    }),
                    entryPoint: "main"
                },

                primitiveTopology: 'triangle-list',
                colorStates: [{
                    format: "bgra8unorm",
                }],
                depthStencilState: {
                    depthWriteEnabled: false,
                    depthCompare: "less",
                    format: "depth24plus-stencil8",
                },
                vertexState: {
                    vertexBuffers: [{
                        arrayStride: 4 * 3,
                        stepMode: "vertex" as GPUInputStepMode,
                        attributes: [{
                            // position
                            shaderLocation: 0,
                            offset: 0,
                            format: "float3"
                        }]
                    }],
                },
                rasterizationState: {
                    cullMode: 'back',
                }
            });
            const [GPUuniformBuffer1, uniformBuffer1] = device.createBufferMapped({
                size: (16 * 4) + (16 * 4) + (4 * 4),
                //@ts-ignore
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            GPUuniformBuffer1.unmap();
            const uniformBindGroup1 = device.createBindGroup({
                //@ts-ignore
                layout: effect._pipelineContext.renderPipeline.getBindGroupLayout(0 /* index */),
                bindings: [{
                    binding: 0,
                    resource: {
                        buffer: GPUuniformBuffer1,
                    }
                }],
            });
            const uniformBindGroup2 = device.createBindGroup({
                //@ts-ignore
                layout: effect._pipelineContext.renderPipeline.getBindGroupLayout(1 /* index */),
                bindings: [{
                    binding: 0,
                    resource: {
                        buffer: GPUslopeBuffer,
                    }
                }, {
                    binding: 1,
                    resource: {
                        buffer: GPUfacet1Buffer,
                    }
                }, {
                    binding: 2,
                    resource: {
                        buffer: GPUfacet2Buffer,
                    }
                }, {
                    binding: 3,
                    resource: {
                        buffer: GPUuniformBuffer,
                    }
                }],
            });
            effect._pipelineContext.bindGroups = [uniformBindGroup1, uniformBindGroup2];
            //IS this needed?
            /*effect._pipelineContext.bindGroupLayouts = [
                //@ts-ignore
                effect._pipelineContext.renderPipeline.getBindGroupLayout(0 )
            ]*/

            this.helper.isUnIndexed = true;
            //@ts-ignore
            this.helper.subMeshes[0]._materialEffect = effect;
            //@ts-ignore
            this.helpermaterial._effect = effect;
        });

        /*let effect=scene.getEngine().createEffect("./shaders/helper", <IEffectCreationOptions>{
            attributes: ["position", "normal", "uv"],
            uniformsNames: ["worldViewProjection"],
            uniformBuffersNames: [],
            samplers: ['facet1Arr', 'facetArr', 'slopeArr'],
            defines:''
        }, scene.getEngine());*/

        /* this.helper.setIndices(this.helperIndices);
         this.helper.setVerticesData(VertexBuffer.PositionKind, new Float32Array([
             -0.5, 0, -2,
             0.5, 0, -3,
             0.5, 0, 3,
             -0.5, 0, 2,
         ]));*/

        this.helpermaterial = new ShaderMaterial("shader", this.scene, "./shaders/helper",
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "flatPos"]
            });
        this.helpermaterial.fillMode = Material.TriangleFanDrawMode;
        this.helpermaterial.isReady = () => true;
        this.gl = scene.getEngine()._gl;
        this.helper.alwaysSelectAsActiveMesh = true
    }
    private direction = 0;

    activate = (): void => {
        let engine = this.scene.getEngine();
        this.helper.visibility = 1;
        this.addListener("pointermove", this.mouseListener, { lazy: 15 });
        this.scene.registerBeforeRender(this.setTime);

        /*******/
       /* let gl = this.gl;
        this.glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
       

        this.glTexture2 = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture2);



        this.glTexture3 = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture3);

        gl.bindTexture(gl.TEXTURE_2D, null);*/
        let me = this;
        (function () {
            this._options.samplers.push('slopeArr', 'facet1Arr', 'facet2Arr');
            this._textures = {
                slopeArr: {
                    getInternalTexture: () => ({ //https://github.com/BabylonJS/Babylon.js/blob/f287a1ea59027b97cb917850a5079c2e03d8fce4/src/Materials/Textures/internalTexture.ts
                        _source: 3,
                        _webGLTexture: me.glTexture
                    }),
                    isReady: () => true
                },
                facet1Arr: {
                    getInternalTexture: () => ({
                        _source: 3,
                        _webGLTexture: me.glTexture2
                    }),
                    isReady: () => true
                },
                facet2Arr: {
                    getInternalTexture: () => ({
                        _source: 3,
                        _webGLTexture: me.glTexture3
                    }),
                    isReady: () => true
                }
            }
            return this;
        }).bind(this.helpermaterial)();
        Terrain.terrainWorker.subscribe('SubHeights', (v) => {
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
        this.helper.material = this.helpermaterial;
        this.helpermaterial.bindOnlyWorldMatrix = (function (world: Matrix) {

            var scene = this.getScene();

            if (!this._effect) {
                return;
            }
            if (this._options.uniforms.indexOf("world") !== -1) {
                let effect = (<Effect>this._effect);
                this._effect.setMatrix("world", world);
                //if (effect._cacheMatrix("world", world)) {
                //engine.setMatrices(effect.getUniform("world"), world.toArray() as Float32Array);
                // gl.uniformMatrix4fv(effect.getUniform("world"), false, world.toArray() as Float32Array);
                // }
            }

            if (this._options.uniforms.indexOf("worldView") !== -1) {
                world.multiplyToRef(scene.getViewMatrix(), this._cachedWorldViewMatrix);
                this._effect.setMatrix("worldView", this._cachedWorldViewMatrix);
            }

            if (this._options.uniforms.indexOf("worldViewProjection") !== -1) {
                if (typeof (this._cachedWorldViewProjectionMatrix) == 'undefined')
                    this._cachedWorldViewProjectionMatrix = new Matrix();
                world.multiplyToRef(scene.getTransformMatrix(), this._cachedWorldViewProjectionMatrix);
                this._effect.setMatrix("worldViewProjection", this._cachedWorldViewProjectionMatrix);

            }
        }).bind(this.helpermaterial);
        //@ts-ignore
        this.helper._processRendering = (subMesh: SubMesh, effect: Effect, fillMode: number, batch: any, hardwareInstancedRendering: boolean,
            onBeforeDraw: (isInstance: boolean, world: Matrix, effectiveMaterial?: Material) => void, effectiveMaterial?: Material): Mesh => {


            // Draw
            if (onBeforeDraw) {
                //@ts-ignore
                onBeforeDraw(false, this.helper._effectiveMesh.getWorldMatrix(), effectiveMaterial);
            }
            this.uniformsV2.forEach((value, uniform) => {
                //gl.uniform2f(uniform, value.x, value.y);
            });
            this.uniformsV2.clear();

            engine.applyStates();
            engine._drawCalls.addCount(1, false);
            return this.helper;

            //return this;

        }
    };
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
        this.camera.detachControl(this.canvas);
        this.mouseinterval = setInterval(() => {
            let gl = (<WebGL2RenderingContext><any>this.gl);
            //@ts-ignore
            let normalbuffer = this.terrain._geometry._vertexBuffers[BABYLON.VertexBuffer.NormalKind]._buffer.getBuffer().underlyingResource;
            //@ts-ignore
            let vertexbuffer: WebGLBuffer = this.terrain._geometry._vertexBuffers[BABYLON.VertexBuffer.PositionKind]._buffer.getBuffer().underlyingResource;
            Terrain.terrainWorker.message(WorkerReturn.Promise, 'elevateFaces', { radius: 50, height: 5, direction: this.direction }).then(e => {
                let NormalsRange = <{ normalsMin: number, normalsMax: number }><any>e;
                gl.bindBuffer(gl.ARRAY_BUFFER, normalbuffer);
                if (this.terrain.normalsView !== null)
                    gl.bufferSubData(gl.ARRAY_BUFFER, NormalsRange.normalsMin, this.terrain.normalsView, NormalsRange.normalsMin, NormalsRange.normalsMax - NormalsRange.normalsMin)
                gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
                gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexbuffer);
                let range = <{ min: number, max: number }><any>e;
                gl.bufferSubData(this.gl.ARRAY_BUFFER, range.min, this.terrain.positionsView, range.min, range.max - range.min);
                gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
            });
            //this.elevateFaces(this.pickinfo, 50, 5);
        }, 100);
    }
    pointerupf = (evt: PointerEvent): void => {
        this.camera.attachControl(this.canvas, true);
        clearInterval(this.mouseinterval);
    }
    deactivate = (): void => {
        super.deactivate();
        Terrain.terrainWorker.unsubscribe('heights');
        //this.removeListener("pointerdown", this.pointerdownf);
        this.helper.visibility = 0;
        //this.removeListener("pointermove", this.mouseListener);
        this.scene.unregisterBeforeRender(this.setTime);
        this.gl.deleteTexture(this.glTexture);
        this.gl.deleteTexture(this.glTexture2);
        this.gl.deleteTexture(this.glTexture3);
        (function () {
            this._options.samplers = [];
            this._textures = {}
            return this;
        }).bind(this.helpermaterial)();
    };
    mouseListener = (evt: PointerEvent): void => {
        let engine = this.scene.getEngine();
        let viewport = this.camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        let boundingInfo = this.terrain.subMeshes[0].getBoundingInfo();
        Terrain.terrainWorker.message(WorkerReturn.Promise, 'mousemove',
            {
                x: evt.clientX,
                y: evt.clientY,
                viewportWidth: viewport.width,
                viewportHeight: viewport.height,
                view: this.camera.getViewMatrix().toArray(),
                projection: this.camera.getProjectionMatrix().toArray()
            }).then((flatPos: { x: number, y: number }) => {
                //let uniformlocation;
                this.GPUuniformBuffer.setSubData(0, new Float32Array([flatPos.x, flatPos.y]))
                /*if (uniformlocation = this.helpermaterial._effect.getUniform("flatPos")) {
                    this.uniformsV2.set(uniformlocation, <{ x: number, y: number }><any>flatPos);
                    debugger;
                }*/
                
            });
    }
    raise = (): void => {
        this.direction = 1;
        //let canvas = this.scene.getEngine().getRenderingCanvas();
        this.removeListener("pointerdown", this.pointerdownf);
        this.addListener("pointerdown", this.pointerdownf);

    }
    lower = (): void => {
        this.direction = -1;
        //let canvas = this.scene.getEngine().getRenderingCanvas();
        this.removeListener("pointerdown", this.pointerdownf);
        this.addListener("pointerdown", this.pointerdownf);
    }
}
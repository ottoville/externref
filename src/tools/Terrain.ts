import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
import { WorkerReturn } from "../WorkerThread.js";
import { Mesh } from "../lib/babylon/Meshes/mesh";
import { ShaderMaterial } from "../lib/babylon/Materials/shaderMaterial";
import type { Scene } from "../lib/babylon/scene";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera";
import type { Effect, IEffectCreationOptions } from "../lib/babylon/Materials/effect";
import type { SubMesh } from "../lib/babylon/Meshes/subMesh";
import { TerraMesh } from "../TerraMesh.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine";
import { TerraEffect } from "../TerraEffect.js";
import { StandardMaterial, StandardMaterialDefines } from "../lib/babylon/Materials/standardMaterial";
import { MaterialHelper } from "../lib/babylon/Materials/materialHelper";
import type { WebGPUPipelineContext } from "../lib/babylon/Engines/WebGPU/webgpuPipelineContext.js";


//@ts-ignore
export class TerrainTool extends UITAB {

    //private ray = BABYLON.Ray.Zero();
    //private pickinfo: BABYLON.PickingInfo;
    //private vertexData = new BABYLON.VertexData();
    private helpermaterial: ShaderMaterial;
    private timed = new Date().getTime();
    private glTexture: WebGLTexture | null = null;
    private glTexture2: WebGLTexture | null = null;
    private glTexture3: WebGLTexture | null = null;
    private gl: WebGLRenderingContext;
    private settingTime = false;
    private setTime = async () => {
        if (this.settingTime)
            return;
        this.settingTime = true;
        let arr = await this.timeBufferStorage.mapWriteAsync();
        new Float32Array(arr).set([(this.timed - new Date().getTime()) % 100000 / 1000]); // %100000 is to keep float minimal to greater precise
        this.timeBufferStorage.unmap();
        this.device.defaultQueue.submit(this.updateTime);
        this.settingTime = false;
    }
    public canvas: HTMLCanvasElement;
    private engine: WebGPUEngine;
    private helper = new TerraMesh("TerrainHelper", new Float32Array([
        -0.5, 1.5, 2,
        -0.5, 1.5, -2,
        0.5, 1.5, 3,
        0.5, 1.5, -3,
    ]));
    timeBufferStorage: GPUBuffer;
    updateTime: GPUCommandBuffer[];



    constructor(
        private scene: Scene,
        private terrain: Terrain,
        private camera: ArcRotateCamera,
        private device: GPUDevice
    ) {
        super();
        const engine = scene.getEngine() as WebGPUEngine;
        this.engine = engine;

        this.helper.visibility = 0;
        this.helper.isUnIndexed = true;
        let options = { height: 20, width: 20, depth: 20, sideOrientation: Mesh._GetDefaultSideOrientation(undefined) };
        this.helper._originalBuilderSideOrientation = options.sideOrientation;

        this.helper.geometry.getVertexBuffer("position").create();

        
        //this.myBox = this.helper;
        this.helper.material = new StandardMaterial("boxmaterial", scene);
        this.helper.subMeshes[0].materialDefines = new StandardMaterialDefines();

        
        let defines = this.helper.subMeshes[0]._materialDefines as StandardMaterialDefines;
        defines.markAsProcessed();
        this.helper.alwaysSelectAsActiveMesh = true;


        var samplers = ["diffuseSampler", "ambientSampler", "opacitySampler", "reflectionCubeSampler",
            "reflection2DSampler", "emissiveSampler", "specularSampler", "bumpSampler", "lightmapSampler",
            "refractionCubeSampler", "refraction2DSampler", "boneSampler"];

        var uniformBuffers = ["Material", "Scene"];

        
        MaterialHelper.PrepareUniformsAndSamplersList(<IEffectCreationOptions>{
            uniformsNames: [],
            uniformBuffersNames: uniformBuffers,
            samplers: samplers,
            defines: defines,
        });
        
        var join = defines.toString();
        TerraEffect._loadShader2("helper2", "Vertex"),
            TerraEffect._loadShader2("helper2", "Fragment")

        let effect = new TerraEffect("helper2", <IEffectCreationOptions>{
            preprocessed: true,
            attributes: [],
            uniformsNames: [],
            uniformBuffersNames: uniformBuffers,
            samplers: samplers,
            defines: join,
            fallbacks: null,
            onCompiled: (this.helper.material as StandardMaterial).onCompiled,
            onError: (this.helper.material as StandardMaterial).onError,
            //@ts-ignore
            indexParameters: { maxSimultaneousLights: (this.helper.material as StandardMaterial)._maxSimultaneousLights, maxSimultaneousMorphTargets: defines.NUM_MORPH_INFLUENCERS }

        }, this.engine, undefined, this.engine, undefined, undefined, undefined, undefined, undefined, undefined, [
                TerraEffect._loadShader2("helper2", "Vertex"), TerraEffect._loadShader2("helper2", "Fragment")
        ]);
        
            //@ts-ignore
        (this.helper.material as StandardMaterial)._rebuildInParallel = false;
            scene.resetCachedMaterial();
            //@ts-ignore
        this.helper.subMeshes[0].setEffect(effect as Effect, defines);

        effect.onCompiled.then(async () => {
            const stages = effect._pipelineContext.stages;
            effect._pipelineContext.renderPipeline = device.createRenderPipeline({
                //@ts-ignore
                sampleCount: this.engine._mainPassSampleCount,
                primitiveTopology: 'triangle-strip',
                rasterizationState: {
                    cullMode: 'none',
                },
                depthStencilState: {
                    depthWriteEnabled: false,
                    depthCompare: "less",
                    format: "depth24plus-stencil8",
                },
                colorStates: [{
                    format: "bgra8unorm",
                }],

                ...stages,
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
            });
            effect._pipelineContext.leftOverUniforms.push({
                type: 'mat4',
                name: 'world',
                length: 0
            })
            effect._pipelineContext.buildUniformLayout();

            await terrain.inited;
            let timeBuffer = device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            this.timeBufferStorage = device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE
            });
            const commandEncoder = device.createCommandEncoder();
            commandEncoder.copyBufferToBuffer(
                this.timeBufferStorage, 0,
                timeBuffer, 0,
                4);
            this.updateTime = [commandEncoder.finish()];

            effect._pipelineContext.bindGroups = [
                device.createBindGroup({
                    layout: effect._pipelineContext.renderPipeline.getBindGroupLayout(0),
                    entries: [{
                        binding: 0,
                        resource: {
                            //@ts-ignore
                            buffer: scene.getSceneUniformBuffer()._buffer.underlyingResource
                        }
                    }],
                }),
                device.createBindGroup({
                    layout: effect._pipelineContext.renderPipeline.getBindGroupLayout(1),
                    entries: [
                        {
                        binding: 0,
                        resource: {
                            //@ts-ignore
                            buffer: effect._pipelineContext.uniformBuffer.getBuffer().underlyingResource, //leftover
                        }
                        },
                        {
                            binding: 1,
                            resource: {
                                buffer: terrain.slopeArrGPUBuffer
                            }
                        },
                        {
                            binding: 2,
                            resource: {
                                buffer: terrain.facet1ArrGPUBuffer
                            }
                        },
                        {
                            binding: 3,
                            resource: {
                                buffer: terrain.facet2ArrGPUBuffer
                            }
                        }
                    ],
                }),
                device.createBindGroup({
                    layout: effect._pipelineContext.renderPipeline.getBindGroupLayout(2),
                    entries: [{
                        binding: 0,
                        resource: {
                            buffer: timeBuffer
                        }
                    }],
                })
            ];
        });

        //@ts-ignore
        (this.helper.material as StandardMaterial).bindForSubMesh = function (world: Matrix, mesh: Mesh, subMesh: SubMesh): void {

        };

        const verticesBuffer: GPUBuffer = this.helper.geometry.getVertexBuffer("position").getBuffer().underlyingResource;
        this.helper._draw = function (subMesh: SubMesh, fillMode: number, instancesCount?: number): Mesh {
           
            if (!this._geometry || !this._geometry.getVertexBuffers() || (!this._unIndexed && !this._geometry.getIndexBuffer())) {
                return this;
            }

            if (this._internalMeshDataInfo._onBeforeDrawObservable) {
                this._internalMeshDataInfo._onBeforeDrawObservable.notifyObservers(this);
            }

            //@ts-ignore
            engine._currentIndexBuffer = null;
            //@ts-ignore
            const renderPass = engine._bundleEncoder || engine._currentRenderPass!;

            renderPass.setPipeline(effect._pipelineContext.renderPipeline);

            renderPass.setVertexBuffer(0, verticesBuffer);
             //@ts-ignore
            const bindGroups = engine._getBindGroupsToRender();
             //@ts-ignore
            engine._setRenderBindGroups(bindGroups);
            if (engine._alphaState.alphaBlend && engine._alphaState._isBlendConstantsDirty) {
                // TODO WebGPU. should use renderPass.
                 //@ts-ignore
                engine._currentRenderPass!.setBlendColor(engine._alphaState._blendConstants as any);
            }

            renderPass.draw(subMesh.verticesCount, 8, subMesh.verticesStart, 0);
            return this;
        }

        this.canvas = this.engine.getRenderingCanvas();



    }
    private direction = 0;

    activate = (): void => {
        this.helper._internalAbstractMeshDataInfo._visibility = 1;
        this.addListener("pointermove", this.mouseListener, { lazy: 15 });
        this.scene.registerBeforeRender(this.setTime);

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
         /*   let gl = (<WebGL2RenderingContext><any>this.gl);
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
            });*/
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
        this.helper._internalAbstractMeshDataInfo._visibility = 0;
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
        let viewport = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight());
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
                this.helper.position.x = flatPos.x;
                this.helper.position.z = flatPos.y;
                (this.helper.subMeshes[0].effect._pipelineContext as WebGPUPipelineContext).uniformBuffer.updateMatrix('world', this.helper.getWorldMatrix());
                //this.GPUuniformBuffer.setSubData(0, new Float32Array([flatPos.x, flatPos.y]))
                //let transformmatrix = this.scene.getTransformMatrix();
               // this.GPUuniformBuffer.setSubData((2 * 4) + 4, transformmatrix.m as Float32Array);


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
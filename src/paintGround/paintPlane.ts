import { paintGround } from "./paintGround.js";
import { UITAB } from "../UITAB.js";
import type { Terrain } from "../world/terrain.js";

import type { PTResultF } from "../types/interfaces/index.js";
import { VertexBuffer } from "../lib/babylon/Meshes/buffer.js";
import { StandardMaterial, StandardMaterialDefines } from "../lib/babylon/Materials/standardMaterial.js";
import { MeshBuilder } from "../lib/babylon/Meshes/meshBuilder.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
import { Vector2, Vector3 } from "../lib/babylon/Maths/math.vector.js";
import type { WorldScene } from "../world/scene.js";
import { TerraMesh } from "../TerraMesh.js";
import { SubMesh } from "../lib/babylon/Meshes/subMesh.js";
import { TerraEffect } from "../TerraEffect.js";
import type { Effect, IEffectCreationOptions } from "../lib/babylon/Materials/effect.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine.js";
import { WebGPUPipelineContext } from "../lib/babylon/Engines/WebGPU/webgpuPipelineContext.js";
import { Matrix } from "../lib/babylon/Maths/math.vector";

export class paintPlane extends paintGround {

    private forceSharedVertices = true;
    private tempplane: TerraMesh | null = null;
    private startingPoint: Vector2 = Vector2.Zero();
    private planeorgpos: Vector3 = Vector3.Zero();
    private * createTiledGround(width: number): Generator<{ positions: number[], indices: number[] }, { positions: number[], indices: number[] }> {
        const positions:number[] = [0,40,0, 0,40,1];
        const indices: number[] = [0,1];
        let row = 0;
        let backwards = false;
        while (true) {
            if (row != 0) {
                if (!backwards)
                    indices.push((positions.push(0, 40, row + 1) - 3) / 3)
                else
                    indices.push((positions.push(width, 40, row + 1) - 3) / 3)
            }
            for (let i = 1; i <= width; i++) {
                if (!backwards) {
                    if(row==0)
                        indices.push((positions.push(i, 40, row) - 3) / 3)
                    else 
                        indices.push(indices[indices.length - i * 4]);
                    indices.push((positions.push(i, 40, row + 1) - 3) / 3);
                } else {
                    indices.push(indices[indices.length - i * 4]);
                    indices.push((positions.push(width - i, 40, row + 1) - 3) / 3)

                }
            }
            row++;
            backwards = !backwards
            yield { positions: positions, indices: indices };
        }
    }
    constructor(
        public canvas: HTMLElement,
        protected scene: WorldScene,
        protected camera: ArcRotateCamera,
        protected ground: Terrain,
        protected sea: Mesh,
        uitab: UITAB,
        private engine: WebGPUEngine,
        private device: GPUDevice
    ) {
        super(canvas, scene, camera, ground, sea, uitab);
    };
    #positionBuffer: GPUBuffer = null;
    #indexBuffer: GPUBuffer = null;
    #verticesCount: number = 0;
    public activate(callback: PTResultF, options: { forceSharedVertices?: boolean }) {
        //this.tempplane = MeshBuilder.CreateTiledGround("tgd2", { xmin: -0.5, xmax: 0.5, zmin: -0.5, zmax: 0.5, subdivisions: { w: 10, h: 10 }, precision: { w: 0, h: 0 }, updatable: true });
        let generator = this.createTiledGround(2);

        for (let i = 0; i < 1; i++) {
            generator.next();
        }
        let values = generator.next().value;
        this.tempplane = new TerraMesh("tempplane", new Float32Array(values.positions), new Uint32Array(values.indices));
        //this.tempplane = new TerraMesh("tempplane", new Float32Array([-5000, 50, -5000, 5000, 50, 5000, 5000, 50, -5000]), new Uint32Array([0, 1, 2]));
        this.tempplane._internalAbstractMeshDataInfo._visibility = 0;
        this.tempplane.geometry.getVertexBuffer("position").create();
        this.tempplane.alwaysSelectAsActiveMesh = true;
        const material = new StandardMaterial("tempplane", this.scene);
        this.tempplane.material = material;
        material.isReadyForSubMesh = () => true;
        let effect = new TerraEffect("paintPlane", <IEffectCreationOptions>{
            preprocessed: true,
            attributes: [],
            uniformsNames: [],
            uniformBuffersNames: [],
            samplers: [],
            defines: '',
            fallbacks: null,
            onCompiled: null,
            onError: null
        }, this.engine, undefined, this.engine, undefined, undefined, undefined, undefined, undefined, "paintPlane", [
               TerraEffect._loadShader2("plane.vert"), TerraEffect._loadShader2("plane.frag")
        ]);
        //@ts-ignore
        this.tempplane.subMeshes[0]._materialEffect = effect as Effect;
        this.tempplane.position.x = 0;
        this.tempplane.position.y = 100;
        this.tempplane.position.z = 0;
        effect.onCompiled.then(async () => {



            //this.tempplane = new TerraMesh("tempplane", new Float32Array([0, 4, 0, 0, 4, 1]), new Uint32Array([0, 3]));
                       
            material.bindForSubMesh = (world: Matrix, mesh: Mesh, subMesh: SubMesh): void => {
            };
            
            

            const stages = effect._pipelineContext.stages;
            effect._pipelineContext.renderPipeline = this.device.createRenderPipeline({
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


            effect._pipelineContext.bindGroups = [
                this.device.createBindGroup({
                    layout: effect._pipelineContext.renderPipeline.getBindGroupLayout(0),
                    entries: [{
                        binding: 0,
                        resource: {
                            //@ts-ignore
                            buffer: scene.getSceneUniformBuffer()._buffer.underlyingResource
                        }
                    }],
                }),
                this.device.createBindGroup({
                    layout: effect._pipelineContext.renderPipeline.getBindGroupLayout(1),
                    entries: [
                        {
                            binding: 0,
                            resource: {
                                //@ts-ignore
                                buffer: effect._pipelineContext.uniformBuffer.getBuffer().underlyingResource, //leftover
                            }
                        }
                    ],
                })
            ];
            this.tempplane._internalAbstractMeshDataInfo._visibility = 1;
            this.#positionBuffer = this.tempplane.geometry.getVertexBuffer("position").getBuffer().underlyingResource;
            this.#indexBuffer = this.tempplane._geometry.getIndexBuffer().underlyingResource
            const engine = this.engine;
            this.tempplane._draw = (subMesh: SubMesh, fillMode: number, instancesCount?: number): Mesh => {

                if (!this.tempplane._geometry || !this.tempplane._geometry.getVertexBuffers() || (!this.tempplane._unIndexed && !this.tempplane._geometry.getIndexBuffer()) || !effect._pipelineContext) {
                    return this.tempplane;
                }
                //@ts-ignore
                if (this.tempplane._internalMeshDataInfo._onBeforeDrawObservable) {
                    //@ts-ignore
                    this.tempplane._internalMeshDataInfo._onBeforeDrawObservable.notifyObservers(this.tempplane);
                }

                //@ts-ignore
                engine._currentIndexBuffer = null;
                //@ts-ignore
                const renderPass = engine._bundleEncoder || engine._currentRenderPass!;

                renderPass.setPipeline(effect._pipelineContext.renderPipeline);
                renderPass.setIndexBuffer(this.#indexBuffer, 0);
                renderPass.setVertexBuffer(0, this.#positionBuffer);
                //@ts-ignore
                const bindGroups = engine._getBindGroupsToRender();
                //@ts-ignore
                engine._setRenderBindGroups(bindGroups);
                if (engine._alphaState.alphaBlend && engine._alphaState._isBlendConstantsDirty) {
                    // TODO WebGPU. should use renderPass.
                    //@ts-ignore
                    engine._currentRenderPass!.setBlendColor(engine._alphaState._blendConstants as any);
                }
                console.log('drawIndexed');
                //renderPass.draw(3, 1, 0, 0);
                renderPass.drawIndexed(values.indices.length,1, 0, 0, 0);
                return this.tempplane;
            }
        }).catch(e => {
            console.error(e);
        });

        console.log('activate super paintPlane');
        super.activate(callback, options);
        if (typeof (options.forceSharedVertices) !== 'undefined')
            this.forceSharedVertices = options.forceSharedVertices;
    }
    public deactivate() {
        super.deactivate();
       // if (this.tempplane)
       //     this.tempplane.dispose();
    }
    
    onMainPointerDown(startingPoint: Vector2) {
       
        this.startingPoint = startingPoint;
        if (!this.tempplane)
            throw (new Error('templane object has not been initalized'))
        this.tempplane.position.x = startingPoint.x - 0.5
        this.tempplane.position.z = startingPoint.y - 1;
        

        console.log(this.tempplane.position);
        
      //  this.tempplane.scaling.z = 10;
      //  this.tempplane.scaling.x = 10;
        //this.tempplane.rotation.y = Math.PI / 2;

        //this.tempplane.material = new StandardMaterial("planeMat2", this.scene);
        (this.tempplane.subMeshes[0].effect._pipelineContext as WebGPUPipelineContext).uniformBuffer.updateMatrix('world', this.tempplane.getWorldMatrix());
        return;
        this.tempplane.material.wireframe = true;
        if (this.forceSharedVertices) {
            let uvdata: Nullable<FloatArray>;
            if (uvdata = this.tempplane.getVerticesData(VertexBuffer.UVKind)) {
                for (let uv = 0; uv < uvdata.length; uv++) {
                    uvdata[uv] = 0;
                }
                this.tempplane.updateVerticesData(VertexBuffer.UVKind, uvdata);
            }
        }
    }
    onMainPointerUp(end_position: Vector2, height: number): void {
        let meshCenter: Vector2 = end_position.subtract(this.startingPoint).divide(new Vector2(2, 2));
        let pos = this.startingPoint.add(meshCenter);
       // if (!this.tempplane)
         //   throw (new Error('templane object has not been initalized'))
       /* let generator = this.createTiledGround(~~height);

        for (let i = 0; i < 29; i++) {
            generator.next();
        }
        let values = generator.next().value

        this.tempplane.positionsBuffer = new SharedArrayBuffer(values.positions.length * 4);
        this.tempplane.positions = new Float32Array(this.tempplane.positionsBuffer);
        this.tempplane.positions.set(values.positions)

        this.tempplane.indicesBuffer = new SharedArrayBuffer(values.indices.length * 4);
        this.tempplane.indices = new Uint32Array(this.tempplane.indicesBuffer);
        this.tempplane.indices.set(values.indices);

       // this.tempplane.updateVerticesData("position", this.tempplane.positions);

        this.#verticesCount = values.indices.length;
        let [VGPU, VARR] = this.device.createBufferMapped({ size: values.positions.length * 4, usage: GPUBufferUsage.VERTEX });
        this.#positionBuffer = VGPU;
        new Float32Array(VARR).set(values.positions);
        VGPU.unmap()

        let [IGPU, IARR] = this.device.createBufferMapped({ size: values.indices.length * 4, usage: GPUBufferUsage.INDEX });
        this.#indexBuffer = IGPU;
        new Float32Array(IARR).set(values.indices);
        IGPU.unmap()
        */

        //this.tempplane.position = new Vector3(pos.x, 0.2, pos.y);
        this.tempplane.position.y = 30;
        this.tempplane.scaling.x = height / 2;
        this.tempplane.rotation.y = this.ang360.rad - Math.PI;
        console.log('onMainPointerUp');
       // console.log(values);
        this.planeorgpos = this.tempplane.position.clone();
        (this.tempplane.subMeshes[0].effect._pipelineContext as WebGPUPipelineContext).uniformBuffer.updateMatrix('world', this.tempplane.getWorldMatrix());

    }
    onAreaDraw(width: number): void {
        if (!this.tempplane)
            throw (new Error('templane object has not been initalized'))
        
       /* let brad = Math.PI / 2 - this.ang.rad;
        let halfw = width / 2;
        let addX = Math.cos(brad) * halfw
        let addZ = Math.sin(brad) * halfw;

        if (this.ang360.deg < 180)
            addX = addX * -1
        if (this.ang360.deg > 270 || this.ang360.deg < 90)
            addZ = addZ * -1
        //if (this.forceSharedVertices)
        //    this.tempplane.forceSharedVertices();*/
        this.tempplane.scaling.z = width / 2;
        //this.tempplane.position.x = this.planeorgpos.x + addX;
        //this.tempplane.position.z = this.planeorgpos.z + addZ;
        (this.tempplane.subMeshes[0].effect._pipelineContext as WebGPUPipelineContext).uniformBuffer.updateMatrix('world', this.tempplane.getWorldMatrix());
        return;
        let positions = this.tempplane.getVerticesData(VertexBuffer.PositionKind);
        if (positions == null) {
            throw ('getVerticesData returned null');
        }
        var numberOfVertices = positions.length / 3;
        var rotmax = rotateMatrix(this.ang360.rad, "y");
        for (var i = 0; i < numberOfVertices; i++) {
            let posX = (positions[i * 3]) * this.tempplane.scaling.x
            let posZ = (positions[i * 3 + 2]) * this.tempplane.scaling.z
            let translated = translate(posX, 0, posZ, rotmax);
            positions[i * 3 + 1] = this.ground.getHeightAtCoordinates(this.tempplane.position.x + translated.x, this.tempplane.position.z + translated.z)
            console.log(positions[i * 3 + 1]);
        }
        this.tempplane.updateVerticesData(VertexBuffer.PositionKind, positions);

    }
}
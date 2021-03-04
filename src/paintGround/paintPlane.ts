import { paintGround } from "./paintGround.js";
import type { Terrain } from "../world/terrain.js";
import type { PTResultF } from "../types/interfaces/index.js";
import { hasCanvasListener } from "../traits/canvasListener.js";
import { TerraNodeGPU } from "../TerraNode.js";
import { Sea } from "../world/water.js";
import type { Scene } from "../Scene.js";
import { ArcRotateCamera } from "../ArcRotateCamera.js";
import type { RenderPipeline } from "../GPU/RenderPipeline.js";
import type { GPU } from "../GPU.js";
import type { Engine } from "../engine.js";
import { TerraVector2 } from "../Math.js";



class PlaneMesh extends TerraNodeGPU {
    Drawable = this.renderPipeline.addDrawableIndexed(undefined, new Set([this.engine.gpu.renderPassScreen]), this, undefined, 0, 1, 0);
}

const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function getRenderPipeline(scene: Scene, ground: Terrain):[RenderPipeline, number, number]{
    let renderPipeline: RenderPipeline | undefined = renderPipelines.get(scene.gpu);
    const bufferOffsetBytes = allocateMemory(scene.engine);
    if (renderPipeline) {
        renderPipeline.dynamicBindGroupOffset = [bufferOffsetBytes];
        return [renderPipeline, 0, bufferOffsetBytes];
    }
    const vertex = scene.engine.gpu.shaderModules.get('plane.vert.wgsl')
    if (!vertex)
        throw ('Missing vertex shader')
    const fragment = scene.engine.gpu.shaderModules.get('color.frag.wgsl')
    if (!fragment)
        throw ('Missing fragment shader')
    //const [vertex, fragment] = await Promise.all(['/shaders/wgsl/simple.vert.wgsl', '/shaders/wgsl/simple.frag.wgsl'].map(async u => scene.gpu.device.createShaderModule({ code: await (await fetch(u)).text() })));
    //const bindGroupLayout = scene.gpu.addBindGroup(scene.lights.uniformBindGroupLightsWGSL);

    renderPipeline = ground.TerrainHeightsbindGroupPositionTree.addRenderPipeline({
        primitiveTopology: 'triangle-strip',
        rasterizationState: {
            cullMode: 'none',
        },
        colorStates: [{
            format: "bgra8unorm",
        }],
        vertexStage: {
            module: vertex,
            entryPoint: "main",
        },
        fragmentStage: {
            module: fragment,
            entryPoint: "main"
        },
        vertexState: {
            indexFormat: 'uint32',
            vertexBuffers:
                [{
                    arrayStride: 4 * 2,
                    stepMode: "vertex" as GPUInputStepMode,
                    attributes: [{
                        // position
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x2"
                    }]
                }]
        },
    }, [bufferOffsetBytes]);
    renderPipelines.set(scene.gpu, renderPipeline);
    return [renderPipeline, 0, bufferOffsetBytes]
}
function allocateMemory(engine: Engine) {
    const bufferOffsetBytes = engine.gpu.DataSlots.pop();
    if (typeof (bufferOffsetBytes) == 'undefined')
        throw ('Out of memory');
    return bufferOffsetBytes;
}
export class paintPlane extends paintGround {
    onEnd() {
        this.#mesh.update((scaling) => {
            scaling[2] = 0;
        });
        console.log('scaled to 0')
    }
    #mesh = new PlaneMesh(this.scene.engine, ...getRenderPipeline(this.scene, this.ground));
    #startingPoint = new TerraVector2(2);
    private * createTiledGround(width: number): Generator<{ positions: number[], indices: number[] }, null, { positions: number[], indices: number[] }> {
        const positions: number[] = [0, 0, 0, 1];
        const indices: number[] = [0, 1];
        let row = 0;
        let backwards = false;
        while (true) {
            if (row != 0) {
                if (!backwards)
                    indices.push((positions.push(0, row + 1) - 2) >> 1)
                else
                    indices.push((positions.push(width, row + 1) - 2) >> 1)
            }
            for (let i = 1; i <= width; i++) {
                if (!backwards) {
                    if (row == 0)
                        indices.push((positions.push(i, row) - 2) >> 1)
                    else
                        indices.push(indices[indices.length - i * 4]!);
                    indices.push((positions.push(i, row + 1) - 2) >> 1);
                } else {
                    indices.push(indices[indices.length - i * 4]!);
                    indices.push((positions.push(width - i, row + 1) - 2) >> 1)

                }
            }
            row++;
            backwards = !backwards
            yield { positions: positions, indices: indices };
        }
    }
    constructor(
        protected scene: Scene,
        protected camera: ArcRotateCamera,
        protected ground: Terrain,
        protected sea: Sea,
        uitab: hasCanvasListener,
    ) {
        super(scene, camera, ground, sea, uitab);
        this.#mesh.Drawable.setVertexBuffer(0, new Float32Array([0, 0, 0]));
    };

    public activate(callback: PTResultF) {
        super.activate(callback);
    }
    public destroy() {
        super.destroy();
        this.#mesh.Drawable.destroy();
        this.#columns = 0;
        this.#rows = 0;
        this.scene.engine.gpu.DataSlots.push(this.#mesh.bufferOffsetBytes);
    }

    onMainPointerDown(startingPoint: TerraVector2) {
        this.#startingPoint = startingPoint;
    }
    #columns = 0;
    #rows = 0;
    #rowGenerator: Generator<{ positions: number[], indices: number[] }, null, { positions: number[], indices: number[] }> | null = null;

    onMainPointerUp(height: number): void {
        this.#rowGenerator = null;
        this.#rows = 0;
        this.#columns = Math.floor(height / 10);

        this.#mesh.translation[0] = this.#startingPoint[0] - 0.5
        this.#mesh.translation[1] = 5;
        this.#mesh.translation[2] = this.#startingPoint[1] - 1;

       // const rotQ = Quaternion.RotationYawPitchRoll(this.ang360.rad - Math.PI, 0, 0)
        //Quaternion.RotationYawPitchRollToRef(this.ang360.rad - Math.PI, 0, 0, rotQ);
        // Produces a quaternion from Euler angles in the z-y-x orientation (Tait-Bryan angles)

        const halfYaw = (this.ang360.rad - Math.PI) * 0.5;
        this.#mesh.update((scaling, rotation) => {
            scaling[0] = height / this.#columns;
            rotation.set([0, Math.sin(halfYaw), 0, Math.cos(halfYaw)]);
        });
    }

    async onAreaDraw(width: number): Promise<void> {
        let newValues: { positions: number[], indices: number[] } | null = null;
        if (!this.#rowGenerator) {
            this.#rowGenerator = this.createTiledGround(this.#columns);
        }
        
        const newRows = Math.max(1,Math.floor(width / 10));
        if (newRows > this.#rows) {
            do {
                newValues = this.#rowGenerator.next().value;
            } while (++this.#rows < newRows);
        }
        this.#mesh.update((scaling) => {
            scaling[2] = width / this.#rows;
        })

        if (newValues) {
            this.#mesh.Drawable.setVertexBuffer(0, new Float32Array(newValues.positions));
            this.#mesh.Drawable.setIndexBuffer(new Uint32Array(newValues.indices));
            this.#mesh.verticesCount = newValues.indices.length;
           // this.#mesh.Drawable.indexCount = newValues.indices.length;
        }
    }
}
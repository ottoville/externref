import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
import { WorkerReturn, WorkerThread } from "../WorkerThread.js";
import { canvasListener } from "../traits/canvasListener.js";
import type { DrawableSimple } from "../GPU/Drawable.js";
import { TerraNodeGPU } from "../TerraNode.js";
import { Sea } from "../world/water.js";
import type { Trait } from "../traits/trait.js";
import type { Scene } from "../Scene.js";
import { ArcRotateCamera } from "../ArcRotateCamera.js";
import type { RenderPipeline } from "../GPU/RenderPipeline.js";
import type { GPU } from "../GPU";

const terrainWorker = new WorkerThread('/js/workers/webworkers/terrainWorker.js');


const renderPipelines: Map<GPU, [RenderPipeline,number]> = new Map();

function getRenderPipeline(scene: Scene, terrain: Terrain) : [RenderPipeline,number] {

    let renderPipeline = renderPipelines.get(scene.gpu);
    if (renderPipeline) {
        return renderPipeline;
    }

    const vertex = scene.gpu.shaderModules.get("helper2.vert.wgsl");
    const fragment = scene.engine.gpu.shaderModules.get('color.frag.wgsl')
    if (!vertex || !fragment)
        throw ('Missing shader')
    //const [vertex, fragment] = await Promise.all(['/shaders/wgsl/simple.vert.wgsl', '/shaders/wgsl/simple.frag.wgsl'].map(async u => scene.gpu.device.createShaderModule({ code: await (await fetch(u)).text() })));
    //const bindGroupLayout = scene.gpu.addBindGroup(scene.lights.uniformBindGroupLightsWGSL);
    renderPipeline = [terrain.TerrainHeightsbindGroupPositionTree.addRenderPipeline({
        primitiveTopology: 'triangle-strip',
        rasterizationState: {
            cullMode: 'none',
        },
        depthStencilState: {
            depthWriteEnabled: true,
            depthCompare: "less",
            format: "depth24plus-stencil8",
        },
        vertexStage: {
            module: vertex,
            entryPoint: "main",
        },
        fragmentStage: {
            module: fragment,
            entryPoint: "main"
        },
        vertexState: {
            indexFormat: 'uint32'
        }
    }, [0]), 4];
    renderPipelines.set(scene.gpu, renderPipeline);
    return renderPipeline
}

export class TerrainTool extends TerraNodeGPU {
    static label = 'Terrain';
    public static instance: UITAB | null = null;
    static menuElem = (instance: TerrainTool) => <div><legend style="background-color:white">Terrain</legend>
        <button class="w3-bar-item w3-button" onClick={() => instance.raise()}>⇫</button>
        <button class="w3-bar-item w3-button" style="transform: rotate(-180deg);" onClick={() => instance.lower()} >⇫</button >
        </div>;
    traits:Set<Trait> = new Set();
    #canvasListener = new canvasListener(this);
    // private engine: WebGPUEngine;
    Drawable: DrawableSimple;

    tempFacet1Buffer: (GPUCopySRCBuffer & GPUMapWriteBuffer) | null = null;
    tempFacet2Buffer: (GPUCopySRCBuffer & GPUMapWriteBuffer) | null = null;

    facet12ArrGPUBufferSwap = this.engine.gpu.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisionsX * Terrain.subdivisionsY * 4 * 2, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);

    constructor(
        public scene:Scene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        public sea: Sea,
    ) {
        super(scene.engine, ...getRenderPipeline(scene, terrain));
        scene.TerraCameras[0].subscribePickingRay();

        terrainWorker.message(WorkerReturn.Promise, 'init',
            {
                positionsAndNormals: terrain.mesh.verticesPositionBuffer,
                indices: terrain.indicesBuffer,
                subdivisionsX: Terrain.subdivisionsX,
                subdivisionsY: Terrain.subdivisionsY,
                boundingBox: terrain.mesh.boundingBox.buffer,
                slopeArr: terrain.slopeArrBuffer,
                pickInfo: terrain.mesh.pickInfo.buffer,
                _groundFacesNormalsBuffer: terrain.mesh.facesBuffer,
                byteStride: 48
            });


        // this.engine = sceneDeprecated.getEngine() as WebGPUEngine;


        this.Drawable = this.renderPipeline.addDrawableSimple(undefined, new Set([scene.gpu.renderPassScreen]), this, 8, 0)
        this.#canvasListener.addListener("pointermove", this.#mouseListener, { lazy: 15 });

    }
    static saveTexture(arrayBuffer: ArrayBuffer) {
        terrainWorker.message<ArrayBuffer, Transferable[]>(WorkerReturn.Promise, 'saveTexture', arrayBuffer, [arrayBuffer]);
    }
    private direction = 0;
    private mouseinterval: number = 0;

    pointerdownf = (evt: PointerEvent): void => {
        if (evt.button !== 0) {
            return;
        }
        this.#canvasListener.addListener("pointerup", this.pointerupf, { once: true });
        this.camera.detachControl();
       
        this.mouseinterval = setInterval(() => {
            terrainWorker.message(WorkerReturn.Promise, 'elevateFaces', { radius: 50, height: 5, direction: this.direction }).then(async e => {
                let range = e as { min: number, max: number };
                console.log('range', range)
                const length = range.max - range.min;

                this.terrain.updateSwap2(range.min, length, this.terrain.mesh.verticesPositionBuffer)
            });
        }, 17);
    }
    pointerupf = (): void => {
        this.camera.attachControl();
        clearInterval(this.mouseinterval);
    }
    destroy = (): void => {
        terrainWorker.unsubscribe('heights');
        this.Drawable.destroy();
        this.scene.TerraCameras[0].unSubscribePickingRay();
        this.facet12ArrGPUBufferSwap.destroy();
        this.traits.forEach(trait => trait.destroy());

        //There is only one mesh in this renderpipeline so destroy the pipeline and release its memory
        this.engine.gpu.DataSlots.push(this.bufferOffsetBytes);
        renderPipelines.delete(this.engine.gpu);
    };

    #mouseListener = (): void => {
        this.terrain.mesh.intersectsRay(this.scene.TerraCameras[0].pickingRay).then(() => {
            this.SetTranslation([this.terrain.mesh.pickInfo.point[0], 0, this.terrain.mesh.pickInfo.point[2]]);
        });
    }
    raise = (): void => {
        this.direction = 1;
        this.#canvasListener.removeListener("pointerdown", this.pointerdownf);
        console.log('add pointerdown listener');
        this.#canvasListener.addListener("pointerdown", this.pointerdownf);

    }
    lower = (): void => {
        this.direction = -1;
        this.#canvasListener.removeListener("pointerdown", this.pointerdownf);
        console.log('add pointerdown listener');
        this.#canvasListener.addListener("pointerdown", this.pointerdownf);
    }
}
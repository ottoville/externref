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
import { RenderPipeline, Shader, VertexShader } from "../GPU/RenderPipeline.js";
import type { GPU } from "../GPU";
import { GPUBufferUsage } from "../gpu.js"
import { TerraVector3 } from "../Math.js";
import type { Elevator } from "/js/engine/engine.js";

const terrainWorker = new WorkerThread('/js/workers/webworkers/terrainWorker.js');
const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function getRenderPipeline(scene: Scene, terrain: Terrain): RenderPipeline {
    let renderPipeline = renderPipelines.get(scene.gpu);
    if (renderPipeline) {
        return renderPipeline;
    }

    renderPipeline = terrain.TerrainHeightsbindGroupTree.addRenderPipeline(
        new VertexShader(scene.engine.gpu, "helper2.vert.wgsl",'main',  [{
            arrayStride: 12,
            stepMode: 'vertex',
            attributes: [{
                // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x3"
            }]
        }]),
        new Shader(scene.engine.gpu, 'UIColor.frag.wgsl'), {
        primitive: {
            topology: 'triangle-list',
            cullMode: 'none'
        }
    })
    renderPipelines.set(scene.gpu, renderPipeline);
    return renderPipeline
}

export class TerrainTool extends TerraNodeGPU<DrawableSimple> {
    static label = 'Terrain';
    public static instance: UITAB | null = null;
    static menuElem = (instance: TerrainTool) => <div><legend style="background-color:white">Terrain</legend>
        <button class="w3-bar-item w3-button" onClick={() => instance.raise()}>⇫</button>
        <button class="w3-bar-item w3-button" style="transform: rotate(-180deg);" onClick={() => instance.lower()} >⇫</button >
    </div>;
    traits: Set<Trait> = new Set();
    #canvasListener = new canvasListener(this);

    tempFacet1Buffer: (GPUCopySRCBuffer & GPUMapWriteBuffer) | null = null;
    tempFacet2Buffer: (GPUCopySRCBuffer & GPUMapWriteBuffer) | null = null;

    facet12ArrGPUBufferSwap = this.engine.gpu.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisions[0] * Terrain.subdivisions[1] * 4 * 2, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);
    elevator: Elevator
    Drawable: DrawableSimple;
    readonly #pick: { readonly position: TerraVector3, meshId: number };

    constructor(
        public scene: Scene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        public sea: Sea,
    ) {
        super(scene.engine, getRenderPipeline(scene, terrain), 4);
        Object.getOwnPropertyNames(TerrainTool.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(TerrainTool.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });

        this.elevator = terrain.mesh.create_elevator();
        this.Drawable = this.renderPipeline.addDrawableSimple(undefined, new Set([scene.gpu.renderPassScreen]), this, 8, 0, undefined, 'TerrainTool');
        this.Drawable.setVertexBuffer(0, new Float32Array([
            -0.5,  2.0,
            -0.5, -2.0,
            0.5,  3.0,
            0.5, -3.0
        ]))
        this.#pick = { position: new TerraVector3(this.engine.memory.buffer, this.elevator.mouse_position_pointer()), meshId: 0 };
        scene.TerraCameras[0].subscribePickingRay();
        //TERRAIN EDITING DISABLED
        /*
        terrainWorker.message(WorkerReturn.Promise, 'init',
            {
                positionsAndNormals: terrain.mesh.verticesPositionBuffer,
                indices: terrain.indicesBuffer,
                subdivisionsX: Terrain.subdivisionsX,
                subdivisionsY: Terrain.subdivisionsY,
                //boundingBox: terrain.mesh.boundingBox.buffer,
                slopeArr: terrain.slopeArrBuffer,
                pickInfo: terrain.mesh.pickInfo.buffer,
                _groundFacesNormalsBuffer: terrain.mesh.facesBuffer,
                byteStride: 48,
                width:terrain.width,
                height:terrain.height
            });
*/

        // this.engine = sceneDeprecated.getEngine() as WebGPUEngine;


        this.#canvasListener.addListener("pointermove", this.#mouseListener, { lazy: 15 });

    }
    static saveTexture(arrayBuffer: ArrayBuffer, size: readonly [number, number]) {
        terrainWorker.message<ArrayBuffer, Transferable[]>(WorkerReturn.Promise, 'saveTexture', { buffer: arrayBuffer, size: size }, [arrayBuffer]);
    }
    //TERRAIN EDITING DISABLED
    private direction: 1 | 0 | -1 = 0;
    private mouseinterval = 0;

    #pointerdownf = (evt: PointerEvent): void => {
        if (evt.button !== 0) {
            return;
        }
        this.#canvasListener.addListener("pointerup", this.pointerupf, { once: true });
        this.camera.detachControl();

        this.mouseinterval = setInterval(() => {
            this.elevator.elevate(this.terrain.mesh,200,5*this.direction);
            if(this.elevator.length > 0) {
                this.terrain.updateSwap2(this.elevator.offset*Float32Array.BYTES_PER_ELEMENT,this.elevator.length*Float32Array.BYTES_PER_ELEMENT)
            }
        }, 17);
    }
    pointerupf = (): void => {
        this.camera.attachControl();
        clearInterval(this.mouseinterval);
    }
    override destroy = (): void => {
        terrainWorker.unsubscribe('heights');
        this.Drawable.destroy();
        this.scene.TerraCameras[0].unSubscribePickingRay();
        this.facet12ArrGPUBufferSwap.destroy();
        this.traits.forEach(trait => trait.destroy());

        //There is only one mesh in this renderpipeline so destroy the pipeline and release its memory
        super.destroy();
        renderPipelines.delete(this.engine.gpu);
    };
    #mouseListener = (): void => {
        /*this.terrain.mesh.intersectsRay(this.scene.TerraCameras[0].pickingRay).then(() => {
            this.SetTranslation([this.terrain.mesh.pickInfo.point[0], 0, this.terrain.mesh.pickInfo.point[2]]);
        });*/

        this.scene.pickPosition(pickInfo => {
            this.#pick.meshId = pickInfo.meshId;
            this.#pick.position[0] = pickInfo.position[0];
            this.#pick.position[1] = pickInfo.position[1];
            this.#pick.position[2] = pickInfo.position[2];
            this.SetTranslation([pickInfo.position[0], 0, pickInfo.position[2]]);
        });


    }
    raise = (): void => {
        //TERRAIN EDITING DISABLED
        this.direction = 1;
        this.#canvasListener.removeListener("pointerdown", this.#pointerdownf);
        this.#canvasListener.addListener("pointerdown", this.#pointerdownf);

    }
    lower = (): void => {

        //TERRAIN EDITING DISABLED
        this.direction = -1;
        this.#canvasListener.removeListener("pointerdown", this.#pointerdownf);
        this.#canvasListener.addListener("pointerdown", this.#pointerdownf);
    }
}
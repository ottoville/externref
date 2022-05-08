import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
import { WorkerReturn, WorkerThread } from "../WorkerThread.js";
import { canvasListener } from "../traits/canvasListener.js";
import type { DrawableSimple } from "../GPU/Drawable.js";
import { MainNode } from "../MainNode.js";
import type { Trait } from "../traits/trait.js";
import { RenderPipeline, Shader, VertexShader } from "../GPU/RenderPipeline.js";
import { GPUBufferUsage, type GPU } from "../GPU.js"
import { TerraVector3 } from "../Math.js";

import type { Engine, rust_pointer } from "../engine.js";
import type { Scene } from "../Scene.js";
declare const engine:Engine;


const terrainWorker = new WorkerThread('/js/workers/webworkers/terrainWorker.js');
const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function getRenderPipeline(terrain: Terrain): RenderPipeline {
    let renderPipeline = renderPipelines.get(engine.gpu);
    if (renderPipeline) {
        return renderPipeline;
    }

    renderPipeline = terrain.TerrainHeightsbindGroupTree.addRenderPipeline('TerrainToolRenderpipeline',
        new VertexShader(engine.gpu, "helper2.vert.wgsl", [{
            arrayStride: 12,
            stepMode: 'vertex',
            attributes: [{
                // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x3"
            }]
        }]),
        new Shader(engine.gpu, 'UIColor.frag.wgsl'), {
        primitive: {
            topology: 'triangle-list',
            cullMode: 'none'
        }
    })
    renderPipelines.set(engine.gpu, renderPipeline);
    return renderPipeline
}

export class TerrainTool extends MainNode {
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

    facet12ArrGPUBufferSwap = engine.gpu.createGPUBuffer(Float32Array.BYTES_PER_ELEMENT * Terrain.subdivisions[0] * Terrain.subdivisions[1] * 4 * 2, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);
    elevator: rust_pointer<"elevator">
    drawable: DrawableSimple;
    readonly #pick: { readonly position: TerraVector3, meshId: number };
    scene: Scene;

    constructor(
        public terrain: Terrain
    ) {
        super(4, undefined, undefined, undefined, 'TerrainTool');
        const renderPipeline=getRenderPipeline(terrain);
        const scene=engine.scenes.get('main');
        if(!scene)
            throw(new Error('no scene'));
        this.scene=scene;
        
        this.elevator = engine.rust.create_elevator(terrain.mesh.ptr);
        this.drawable = renderPipeline.addDrawableSimple(this, 8, 0, undefined);
        this.#pick = { position: new TerraVector3(engine.memory.buffer, engine.rust.mouse_position_pointer(this.elevator)), meshId: 0 };
        //scene.TerraCameras[0].subscribePickingRay();
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
        engine.inputManager?.destroy();

        this.mouseinterval = setInterval(() => {
            engine.rust.elevate(this.elevator,this.terrain.mesh.ptr,200,5*this.direction);
            const elevator_length=engine.rust.get_length(this.elevator);
            if(elevator_length > 0) {
                this.terrain.updateSwap2(engine.rust.get_offset(this.elevator)*Float32Array.BYTES_PER_ELEMENT,elevator_length*Float32Array.BYTES_PER_ELEMENT)
            }
        }, 17);
    }
    pointerupf = (): void => {
        engine.attachCameraInput();
        clearInterval(this.mouseinterval);
    }
    override destroy = (): void => {
        this.drawable.destroy();
        this.facet12ArrGPUBufferSwap.destroy();
        this.traits.forEach(trait => trait.destroy());

        //There is only one mesh in this renderpipeline so destroy the pipeline and release its memory
        super.destroy();
        renderPipelines.delete(engine.gpu);
    };
    #mouseListener = async () => {
        /*this.terrain.mesh.intersectsRay(this.scene.TerraCameras[0].pickingRay).then(() => {
            this.SetTranslation([this.terrain.mesh.pickInfo.point[0], 0, this.terrain.mesh.pickInfo.point[2]]);
        });*/
        const pickInfo = await engine.gpu.renderPassScreen.pickPosition(true);
        if(pickInfo) {
            this.#pick.meshId = pickInfo.meshId;
            this.#pick.position[0] = pickInfo.position[0];
            this.#pick.position[1] = pickInfo.position[1];
            this.#pick.position[2] = pickInfo.position[2];
            this.translation = [pickInfo.position[0], 0, pickInfo.position[2]];
        }

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
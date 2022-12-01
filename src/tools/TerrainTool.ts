import type { Terrain } from "../world/terrain.js";
import { WorkerReturn, WorkerThread } from "../WorkerThread.js";
import { DrawableSimple } from "../GPU/Drawables/DrawableSimple.js";
import { MainNode } from "../MainNode.js";
import { type RenderPipeline, Shader, VertexShader } from "../GPU/RenderPipeline.js";
import { type GPU } from "../GPU.js"
import { TerraVector3 } from "../Math.js";
import type { Engine, rust_pointer } from "../engine.js";
import type { Scene } from "../Scene.js";
import { UIRectangleNode, UIRectangleNodeProps } from "../ui/UIRectangleNode.js";
declare const engine: Engine;

const terrainWorker = new WorkerThread('terrainWorker.js');
const renderPipelines: Map<GPU, RenderPipeline<VertexShader<[]>>> = new Map();

function getRenderPipeline(terrain: Terrain): RenderPipeline<VertexShader<[]>> {
    let renderPipeline = renderPipelines.get(engine.gpu!);
    if (renderPipeline) {
        return renderPipeline;
    }

    renderPipeline = terrain.TerrainHeightsbindGroupTree.addRenderPipeline('TerrainToolRenderpipeline',
        new VertexShader(engine.gpu!, "helper2.vert.wgsl", []),
        new Shader(engine.gpu!, 'UIColor.frag.wgsl'), {
        primitive: {
            topology: 'triangle-list',
            cullMode: 'none'
        }
    })
    renderPipelines.set(engine.gpu!, renderPipeline);
    return renderPipeline
}
export class TerrainToolButton extends UIRectangleNode {
    static override createCtrProps(props: UIRectangleNodeProps) {
        return {
            ctr: TerrainToolButton,
            props
        }
    }
    #wasOpen = false;
    constructor(
        props: UIRectangleNodeProps,
    ) {
        super(props);
    }
    #tool?: TerrainTool
    override render() {
        super.render()
        if (this.props.open && !this.#wasOpen) {
            this.#wasOpen = true;
            this.#tool = new TerrainTool(this.props.terrain);
            return [UIRectangleNode.createCtrProps({
                gpu: this.props.gpu,
                terrain: this.props.terrain,
                bitmap: this.props.bitmap,
                label: 'Lower',
                scale: { min_width: 0.10, y: 0.07 },
                translate: { x: -0.85, y: 0.8 },
                open: false,
                text: 'Lower',
                onClick: () => this.#tool?.lower()
            }), UIRectangleNode.createCtrProps({
                gpu: this.props.gpu,
                terrain: this.props.terrain,
                bitmap: this.props.bitmap,
                label: 'Raise',
                scale: { min_width: 0.10, y: 0.07 },
                translate: { x: -0.6, y: 0.8 },
                open: false,
                text: 'Raise',
                onClick: () => this.#tool?.raise()
            })]
        } else if (!this.props.open && this.#wasOpen) {
            this.#wasOpen = false;
            this.#tool?.destroy();
        }
        return null
    }
}
export class TerrainTool extends MainNode {
    elevator: rust_pointer<"elevator">
    drawable: DrawableSimple<RenderPipeline<VertexShader<[]>>>;
    readonly #pick: { readonly position: TerraVector3, meshId: number };
    scene: Scene;

    constructor(
        public terrain: Terrain,
    ) {
        super({ positionsCount: 4, label: 'TerrainTool' });


        const renderPipeline = getRenderPipeline(terrain);
        const scene = engine.scenes.get('main');
        if (!scene)
            throw (new Error('no scene'));
        this.scene = scene;

        this.elevator = engine.rust.create_elevator(terrain.mesh.ptr);
        this.drawable = new DrawableSimple({
            renderPipeline,
            node: this,
            instanceCount: 8,
            firstVertex: 0,
            vertexBuffers: [],
            renderPasses: undefined
        })
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

        engine.addInputListener('pointermove', this, this.#mouseListener)

    }
    static saveTexture(arrayBuffer: ArrayBuffer, size: readonly [number, number]) {
        terrainWorker.message<ArrayBuffer>(WorkerReturn.Promise, 'saveTexture', { buffer: arrayBuffer, size: size }, [arrayBuffer]);
    }
    //TERRAIN EDITING DISABLED
    private direction: 1 | 0 | -1 = 0;
    private mouseinterval = 0;

    #pointerdownf = (evt: PointerEvent): void => {
        if (evt.button !== 0) {
            return;
        }
        engine.addInputListenerOnce('pointerup', this, this.#pointerupf)
        engine.inputManager?.deAttachCameraController();

        this.mouseinterval = setInterval(() => {
            engine.rust.elevate(this.elevator, this.terrain.mesh.ptr, 200, 5 * this.direction);
            const elevator_length = engine.rust.get_length(this.elevator);
            if (elevator_length > 0) {
                this.terrain.updateSwap2(engine.rust.get_offset(this.elevator) * Float32Array.BYTES_PER_ELEMENT, elevator_length * Float32Array.BYTES_PER_ELEMENT)
            }
        }, 17);
    }
    #pointerupf = (): void => {
        engine.inputManager?.attachCameraController();
        clearInterval(this.mouseinterval);
    }
    override destroy = (): void => {
        this.drawable.destroy();
        engine.clearInputListeners(this);
        //There is only one mesh in this renderpipeline so destroy the pipeline and release its memory
        super.destroy();
        renderPipelines.delete(engine.gpu!);
    };
    #mouseListener = () => {
        /*this.terrain.mesh.intersectsRay(this.scene.TerraCameras[0].pickingRay).then(() => {
            this.SetTranslation([this.terrain.mesh.pickInfo.point[0], 0, this.terrain.mesh.pickInfo.point[2]]);
        });*/
        engine.gpu!.renderPassScreen.pickPosition(true).then(pickInfo => {
            if (pickInfo) {
                this.#pick.meshId = pickInfo.meshId;
                this.#pick.position[0] = pickInfo.position[0];
                this.#pick.position[1] = pickInfo.position[1];
                this.#pick.position[2] = pickInfo.position[2];
                this.translation = [pickInfo.position[0], 0, pickInfo.position[2]];
            }
        }).catch(err => engine.showError(err));
    }
    raise = (): void => {
        this.direction = 1;
        engine.addInputListener('pointerdown', this, this.#pointerdownf)

    }
    lower = (): void => {
        this.direction = -1;
        engine.addInputListener('pointerdown', this, this.#pointerdownf)
    }
}
import type { Terrain } from "../world/terrain.js";
import { WorkerReturn, WorkerThread } from "../WorkerThread.js";
import { DrawableSimple } from "../GPU/Drawables/DrawableSimple.js";
import { MainNode } from "../MainNode.js";
import { type GPU } from "../GPU.js"
import { TerraVector3 } from "../Math.js";
import type { Engine, rust_pointer } from "../engine.js";
import type { Scene } from "../Scene.js";
import { UIRectangleNode, type UIRectangleNodeProps } from "../ui/UIRectangleNode.js";
import { HelperVertShader } from "../GPU/Shaders/helper.vert.js";
import type { RenderPipeline } from "../GPU/RenderPipeline2.js";
import { ColorFragShader } from "../GPU/Shaders/Color.frag.js";
import { UINode } from "../ui/UINode.js";
import { SizeUnit } from "../ui/UIRectangle.js";
declare const engine: Engine;

const terrainWorker = new WorkerThread('terrainWorker.js');

type TerrainToolButtonState = { subMenu: 'lower' | 'raise' | undefined };
export class TerrainToolButton extends UIRectangleNode<TerrainToolButtonState,
UIRectangleNodeProps & { terrain: Terrain, menuTree: {level: number}, open: boolean }> {
    #wasOpen = false;
    constructor(
        props: UIRectangleNodeProps & { terrain: Terrain, menuTree: {level: number}, open: boolean },
    ) {
        super(props);
        this.state = {
            subMenu: undefined
        }
    }
    #inputListener = (e: KeyboardEvent) => {
        if (e.code === "Digit1") {
            this.setState({
                subMenu: 'lower'
            })
        } else if (e.code === "Digit2") {
            this.setState({
                subMenu: 'raise'
            })
        }
        else if (e.code === 'Backspace') {
            this.props.menuTree.level = 1;
            this.setState({
                subMenu: undefined
            })
        }
    }
    #tool?: TerrainTool
    override render() {
        super.render();
        if (this.state.subMenu === 'lower') {
            this.#tool?.lower();
            this.props.menuTree.level = 2;

        } else if (this.state.subMenu === 'raise') {
            this.#tool?.raise()
            this.props.menuTree.level = 2;
        }
        if (this.props.open) {
            if (!this.#wasOpen) {
                this.#wasOpen = true;
                this.#tool = new TerrainTool(this.props.terrain);
            }
            engine.addInputListener('keydown', this, this.#inputListener);
            return [UINode.createCtrProps(UIRectangleNode,{
                gpu: this.props.gpu,
                bitmap: this.props.bitmap,
                label: 'Lower',
                scale: { min_width: 0.10, y: 0.07, unit: SizeUnit["%"] },
                translate: { x: -0.85, y: 0.8 },
                text: 'Lower (1)',
                onClick: () => {
                    this.setState({
                        subMenu: 'lower'
                    })
                }
            }), UINode.createCtrProps(UIRectangleNode, {
                gpu: this.props.gpu,
                bitmap: this.props.bitmap,
                label: 'Raise',
                scale: { min_width: 0.10, y: 0.07, unit: SizeUnit["%"] },
                translate: { x: -0.6, y: 0.8 },
                text: 'Raise (2)',
                onClick: () => {
                    this.setState({
                        subMenu: 'raise'
                    })
                }
            })]
        } else if (!this.props.open && this.#wasOpen) {
            this.#wasOpen = false;
            this.#tool?.destroy();
            console.log('remove inputlistener')
            engine.removeInputListener('keydown', this, this.#inputListener)
        }
        return null
    }
}
export class TerrainTool extends MainNode {
    elevator: rust_pointer<"elevator">
    drawable: DrawableSimple<RenderPipeline<HelperVertShader>>;
    readonly #pick: { readonly position: TerraVector3, meshId: number };
    scene: Scene;

    constructor(
        public terrain: Terrain,
    ) {
        super({ positionsCount: 4, label: 'TerrainTool' });

        const getRenderPipeline = ['TerrainToolRenderpipeline', function getRenderPipelinef(_gpu: GPU, label: string, primitive: GPUPrimitiveState,
        ) {
            const helperVertShader = new HelperVertShader(terrain.settings, terrain.TerrainHeightsbindGroupTree);
            const renderPipeline = terrain.TerrainHeightsbindGroupTree.addRenderPipeline(
                {
                    label,
                    vertexShader: helperVertShader,
                    fragmentShader: new ColorFragShader(terrain.TerrainHeightsbindGroupTree),
                    renderPipeline: {
                        primitive
                    }
                }
            )
            return renderPipeline
        }] as const

        const renderPipeline = terrain.gpu.createRenderPipeline(getRenderPipeline, {
            topology: 'triangle-list',
            cullMode: 'none'
        })
        const scene = engine.scenes.get('main');
        if (!scene)
            throw (new Error('no scene'));
        this.scene = scene;

        this.elevator = engine.rust.create_elevator(terrain.mesh.ptr);
        this.drawable = new DrawableSimple({
            renderPipeline,
            vertexBuffers: [] as [],
            renderPasses: undefined
        }, {
            node: this,
            firstVertex: 0,
            instanceCount: 8,
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
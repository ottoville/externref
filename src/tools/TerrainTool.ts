import type { Terrain } from '../world/Terrain.js';
import { WorkerReturn, WorkerThread } from '../WorkerThread.js';
import { DrawableSimple } from '../GPU/Drawables/DrawableSimple.js';
import { MainNode } from '../MainNode.js';
import { type CreateRenderPipelineProps, GPU } from '../GPU.js';
import { MutableTerraVector3, TerraVector3 } from '../Math.js';
import type { Engine, ListenerObj, rust_pointer } from '../engine.js';
import type { Scene } from '../Scene.js';
import {
  HelperVertShader,
  createHelperVertShader,
} from '../GPU/Shaders/helper.vert.js';
import { LegacyRenderPipeline } from '../GPU/RenderPipeline.js';
import { createColorFragmentShader } from '../GPU/Shaders/Color.frag.js';
import type { TopMenuButtonProps } from '../ui/topMenu.js';
import { Button } from '../ui/Button.js';
import { UINode } from '../ui/UINode.js';
import { Anchor, NumericUnit } from '../ui/UIRectangle.js';
import {
  UIRectangleNode,
  type UIRectangleNodeProps,
} from '../ui/UIRectangleNode.js';
import { createRenderPipelineBuilder } from '../webgpu-ts/index.js';
declare const engine: Engine;

const terrainWorker = new WorkerThread('terrainWorker.js');

type TerrainToolButtonState = { subMenu: 'lower' | 'raise' | undefined };
export class TerrainToolButton extends UIRectangleNode<
  TerrainToolButtonState,
  UIRectangleNodeProps & TopMenuButtonProps
> {
  #wasOpen = false;
  constructor(props: UIRectangleNodeProps & TopMenuButtonProps) {
    super(props);
    this.state = {
      subMenu: undefined,
    };
  }
  #inputListener: ListenerObj<'keydown'> = {
    cb: (e: KeyboardEvent) => {
      if (e.code === 'Digit1') {
        this.setState({
          subMenu: 'lower',
        });
      } else if (e.code === 'Digit2') {
        this.setState({
          subMenu: 'raise',
        });
      } else if (e.code === 'Backspace') {
        this.props.menuTree.level = 1;
        this.setState({
          subMenu: undefined,
        });
      }
    },
    object: this,
    type: 'keydown',
  };
  #tool?: TerrainTool;
  override render(gpu: GPU, force: boolean) {
    super.render(gpu, force);
    if (this.state.subMenu === 'lower') {
      this.#tool?.lower();
      this.props.menuTree.level = 2;
    } else if (this.state.subMenu === 'raise') {
      this.#tool?.raise();
      this.props.menuTree.level = 2;
    }
    if (this.props.open) {
      if (!this.#wasOpen) {
        this.#wasOpen = true;
        this.#tool = new TerrainTool(this.props.terrain);
      }
      engine.addInputListener(this.#inputListener);
      return [
        UINode.createCtrProps(
          UIRectangleNode,
          Button({
            ...this.props,
            UIRectangleProps: {
              label: 'Lower',
              scale: {
                min_width: 0.1,
                unit: NumericUnit['%'],
                y: 0.07,
              },
              translate: {
                x: {
                  anchor: Anchor.CENTER,
                  value: [-0.85, NumericUnit['%']],
                },
                y: this.props.subMenuPosition,
              },
            },
            onClick: () => {
              this.setState({
                subMenu: 'lower',
              });
            },
            text: 'Lower (1)',
          }),
        ),
        UINode.createCtrProps(
          UIRectangleNode,
          Button({
            ...this.props,
            UIRectangleProps: {
              label: 'Raise',
              scale: {
                min_width: 0.1,
                unit: NumericUnit['%'],
                y: 0.07,
              },
              translate: {
                x: {
                  anchor: Anchor.CENTER,
                  value: [-0.6, NumericUnit['%']],
                },
                y: this.props.subMenuPosition,
              },
            },
            onClick: () => {
              this.setState({
                subMenu: 'raise',
              });
            },
            text: 'Raise (2)',
          }),
        ),
      ];
    } else if (!this.props.open && this.#wasOpen) {
      this.#wasOpen = false;
      this.#tool?.destroy();
      console.log('remove inputlistener');
      engine.removeInputListener(this.#inputListener);
    }
    return null;
  }
}
export class TerrainTool extends MainNode {
  elevator: rust_pointer<'elevator'>;
  drawable: DrawableSimple<LegacyRenderPipeline<HelperVertShader>>;
  readonly #pick: { readonly position: TerraVector3; meshId: number };
  scene: Scene;

  constructor(public terrain: Terrain) {
    super({
      label: 'TerrainTool',
    });
    this.positions_count = 4;
    const getRenderPipeline = [
      'TerrainToolRenderpipeline',
      function getRenderPipelinef({
        label,
        primitive,
      }: CreateRenderPipelineProps) {
        const vertexShader = createHelperVertShader(
          terrain.settings,
          terrain.TerrainHeightsbindGroupTreePosition,
        );
        const fragmentShader = createColorFragmentShader(
          terrain.TerrainHeightsbindGroupTreePosition,
        );
        const renderPipeline = new LegacyRenderPipeline({
          bindgroupdrawable: terrain.TerrainHeightsbindGroupTreePosition,
          builder: createRenderPipelineBuilder(vertexShader, fragmentShader),
          connections: {
            main: 'main',
          },
          descriptor: {
            primitive,
          },
          fragmentShader,
          label,
          vertexShader,
        });
        return renderPipeline;
      },
    ] as const;

    const renderPipeline = terrain.gpu.createRenderPipeline(
      getRenderPipeline,
      {
        cullMode: 'none',
        topology: 'triangle-list',
      },
      undefined,
    );
    const scene = engine.scenes.get('main');
    if (!scene) throw new Error('no scene');
    this.scene = scene;

    this.elevator = engine.rust.create_elevator(terrain.mesh.id);
    this.drawable = new DrawableSimple(
      {
        bindGroups: [
          {
            bindGroup: engine.gpu!.BindGroupPosition,
            offsets: [
              engine.rust.gpu_alignment(this.id) * GPU.gpu_memory_index_size,
            ],
          },
        ],
        node: this,
        renderPasses: undefined,
        renderPipeline,
        vertexBuffers: [] as [],
      },
      {
        instanceCount: 8,
      },
      {
        firstVertex: 0,
      },
    );
    this.#pick = {
      meshId: 0,
      position: new MutableTerraVector3(
        engine.memory.buffer,
        engine.rust.mouse_position_pointer(this.elevator),
      ),
    };
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

    engine.addInputListener(this.#mouseListener);
  }
  static saveTexture(
    arrayBuffer: ArrayBuffer,
    size: readonly [number, number],
  ) {
    terrainWorker.message<ArrayBuffer>(
      WorkerReturn.Promise,
      'saveTexture',
      {
        buffer: arrayBuffer,
        size: size,
      },
      [arrayBuffer],
    );
  }
  private direction: 1 | 0 | -1 = 0;
  private mouseinterval = 0;

  #pointerdownf: ListenerObj<'pointerdown'> = {
    cb: (evt: PointerEvent): void => {
      if (evt.button !== 0) {
        return;
      }
      engine.addInputListener(this.#pointerupf);
      engine.inputManager?.deAttachCameraController();

      this.mouseinterval = setInterval(() => {
        engine.rust.elevate(
          this.elevator,
          this.terrain.mesh.id,
          200,
          5 * this.direction,
        );
        const elevator_length = engine.rust.get_length(this.elevator);
        if (elevator_length > 0) {
          this.terrain.updateSwap2(
            engine.rust.get_offset(this.elevator) *
              Float32Array.BYTES_PER_ELEMENT,
            elevator_length * Float32Array.BYTES_PER_ELEMENT,
          );
        }
      }, 17);
    },
    object: this,
    type: 'pointerdown',
  };
  #pointerupf: ListenerObj<'pointerup'> = {
    cb: (): void => {
      engine.inputManager?.attachCameraController();
      clearInterval(this.mouseinterval);
    },
    object: this,
    options: {
      once: true,
    },
    type: 'pointerup',
  };
  override destroy = (): void => {
    this.drawable.destroy();
    engine.clearInputListeners(this);
    //There is only one mesh in this renderpipeline so destroy the pipeline and release its memory
    super.destroy();
  };
  #mouseListener: ListenerObj<'pointermove'> = {
    cb: () => {
      /*this.terrain.mesh.intersectsRay(this.scene.TerraCameras[0].pickingRay).then(() => {
                this.SetTranslation([this.terrain.mesh.pickInfo.point[0], 0, this.terrain.mesh.pickInfo.point[2]]);
            });*/
      engine
        .gpu!.renderPassScreen.pickPosition(true)
        .then((pickInfo) => {
          if (pickInfo) {
            this.#pick.meshId = pickInfo.meshId;
            this.#pick.position[0] = pickInfo.position[0];
            this.#pick.position[1] = pickInfo.position[1];
            this.#pick.position[2] = pickInfo.position[2];
            this.translation = [pickInfo.position[0], 0, pickInfo.position[2]];
          }
        })
        .catch((err) => engine.showError(err));
    },
    object: this,
    type: 'pointermove',
  };
  raise = (): void => {
    this.direction = 1;
    engine.addInputListener(this.#pointerdownf);
  };
  lower = (): void => {
    this.direction = -1;
    engine.addInputListener(this.#pointerdownf);
  };
}

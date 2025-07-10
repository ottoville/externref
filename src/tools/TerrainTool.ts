import type { Terrain } from '../world/Terrain.js';
import { WorkerReturn, WorkerThread } from '../WorkerThread.js';
import { DrawableSimple } from '../GPU/Drawables/DrawableSimple.js';
import { MainNode } from '../MainNode.js';
import type { GPU } from '../GPU.js';
import type { Engine, ListenerObj } from '../engine.js';
import type { Scene } from '../Scene.js';
import {
  HelperVertShader,
  createHelperVertShader,
} from '../GPU/Shaders/helper.vert.js';
import type { RenderPipelineProps } from '../GPU/RenderPipeline.js';
import type { TopMenuButtonProps } from '../ui/topMenu.js';
import { Button } from '../ui/Button.js';
import { UI } from '../ui/UINode.js';
import { Anchor, NumericUnit } from '../ui/UIRectangle.js';
import {
  type UIRectangleNodeState,
  type UIRectangleNodeProps,
} from '../ui/UIRectangleNode.js';
import { UIRectangleNodeHover } from '../ui/UIRectangleNodeHover.js';
declare const engine: Engine;

const terrainWorker = new WorkerThread('terrainWorker.js');

interface TerrainToolButtonState extends UIRectangleNodeState {
  subMenu: 'lower' | 'raise' | undefined;
}

const lowerButtonProps = Button({
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
      // Will be overriden
      y: {
        anchor: Anchor.CENTER,
        value: [-0.85, NumericUnit['%']],
      },
    },
  },
  text: 'Lower (1)',
});

const raiseButtonProps = Button({
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
      // Will be overriden
      y: {
        anchor: Anchor.CENTER,
        value: [-0.6, NumericUnit['%']],
      },
    },
  },
  text: 'Raise (2)',
});

export class TerrainToolButton extends UIRectangleNodeHover<TerrainToolButtonState> {
  private wasOpen = false;
  constructor(override props: UIRectangleNodeProps & TopMenuButtonProps) {
    super(props);
    this.state = {
      ...this.state,
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
    if (this.props.open) {
      if (!this.wasOpen) {
        this.wasOpen = true;
        this.#tool = new TerrainTool(this.props.terrain);
      }
      if (this.state.subMenu === 'lower') {
        this.#tool!.direction = -1;
        this.props.menuTree.level = 2;
      } else if (this.state.subMenu === 'raise') {
        this.#tool!.direction = 1;
        this.props.menuTree.level = 2;
      }
      engine.addInputListener(this.#inputListener);
      return [
        UI(
          UIRectangleNodeHover,
          Object.assign(lowerButtonProps, {
            UIRectangleProps: {
              ...lowerButtonProps.UIRectangleProps,
              translate: {
                ...lowerButtonProps.UIRectangleProps.translate,
                y: this.props.subMenuPosition,
              },
            },
            events: {
              ...lowerButtonProps.events,
              onClick: () => {
                this.setState({
                  subMenu: 'lower',
                });
              },
            },
          }),
        ),
        UI(
          UIRectangleNodeHover,
          Object.assign(raiseButtonProps, {
            UIRectangleProps: {
              ...raiseButtonProps.UIRectangleProps,
              translate: {
                ...raiseButtonProps.UIRectangleProps.translate,
                y: this.props.subMenuPosition,
              },
            },
            events: {
              ...raiseButtonProps.events,
              onClick: () => {
                this.setState({
                  subMenu: 'raise',
                });
              },
            },
          }),
        ),
      ];
    } else if (!this.props.open && this.wasOpen) {
      this.wasOpen = false;
      this.#tool?.destroy();
      engine.removeInputListener(this.#inputListener);
    }
    return null;
  }
}
export class TerrainTool extends MainNode {
  #elevator: rust_pointer<'elevator'>;
  drawable: DrawableSimple<RenderPipelineProps<HelperVertShader>>;
  readonly #pick: {
    readonly position: [number, number, number];
    meshId: number;
  };
  scene: Scene;

  constructor(public terrain: Terrain) {
    const mesh = engine.rust.create_terraintool_mesh();
    super(mesh);
    engine.addInputListener(this.#pointerdownf);
    this.positions_count = 4;

    const renderPipeline = terrain.gpu.createRenderPipelineBuilder({
      desc: {
        connections: {
          main: 'main',
        },
        primitive: {
          cullMode: 'none',
          topology: 'triangle-list',
        },
      },
      fragmentShaderBuilder: terrain.gpu.shaders.ColorShader,
      vertexShaderBuilder: createHelperVertShader(terrain.gpu),
    });
    const scene = engine.scenes.get('main');
    if (!scene) throw new Error('no scene');
    this.scene = scene;

    this.#elevator = engine.rust.create_elevator(terrain.mesh.id);
    this.drawable = new DrawableSimple(
      {
        bindGroups: [],
        node: this,
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
      position: new Float32Array(
        engine.rust.memory.buffer,
        engine.rust.mouse_position_pointer(this.#elevator),
        3,
      ) as unknown as [number, number, number],
    };
    engine.addInputListener(this.#mouseListener);
  }
  static saveTexture(
    arrayBuffer: ArrayBuffer,
    size: readonly [number, number],
  ) {
    terrainWorker
      .message<ArrayBuffer>(
        WorkerReturn.Promise,
        'saveTexture',
        {
          buffer: arrayBuffer,
          size: size,
        },
        [arrayBuffer],
      )
      .catch((err) => {
        engine.showError(err);
      });
  }
  direction: 1 | 0 | -1 = 0;
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
          this.#elevator,
          this.terrain.mesh.id,
          200,
          5 * this.direction,
        );
        const elevator_length = engine.rust.get_length(this.#elevator);
        if (elevator_length > 0) {
          this.terrain.updateSwap2(
            engine.rust.get_offset(this.#elevator),
            elevator_length,
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
  #destroyed = false;

  override destroy = (): void => {
    super.destroy();
    //prevent destroy loop between rust and js
    if (this.#destroyed) return;
    this.#destroyed = true;
    engine.rust.destroy_elevator(this.#elevator);
    engine.clearInputListeners(this);
  };
  #mouseListener: ListenerObj<'pointermove'> = {
    cb: () => {
      const pickPosition = engine.gpu!.renderPassScreen.pickPosition(true);
      if (pickPosition) {
        pickPosition
          .then((pickInfo) => {
            if (pickInfo) {
              this.#pick.meshId = pickInfo.meshId;
              this.#pick.position[0] = pickInfo.position[0];
              this.#pick.position[1] = pickInfo.position[1];
              this.#pick.position[2] = pickInfo.position[2];
              this.setTranslation([
                pickInfo.position[0],
                0,
                pickInfo.position[2],
              ]);
            }
          })
          .catch((err) => engine.showError(err));
      }
    },
    object: this,
    type: 'pointermove',
  };
}

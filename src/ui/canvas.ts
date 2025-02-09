import { Engine } from '../engine.js';

import { Plants } from '../plants/Plants.js';
import { PlantsUI } from '../tools/plantsUI.js';
/*import { CameraTAB } from "../tools/camera.js";
import { BuildingsUI } from "../tools/buildings.js";*/
import { Terrain } from '../world/Terrain.js';
import { Sea } from '../world/water.js';
//import { LazyEval } from "../LazyEval.js";
import { Sun } from '../world/sun.js';

import { MainNode, RigidBody } from '../MainNode.js';
import { Scene } from '../Scene.js';
import { Human } from '../human.js';
//import { savedCamera } from "../types/interfaces/index.js";

import { IcoSphere } from '../GPU/Meshes/IcoSphere.js';
import { Cone } from '../GPU/Meshes/Cone.js';
import { Capsule, CAPSULE_ORIENTATION } from '../GPU/Meshes/Capsule.js';
import { RoundCuboid } from '../GPU/Meshes/RoundCuboid.js';
import { ArcRotateCamera } from '../controllers/ArcRotateCamera.js';
import { Anchor, NumericUnit } from './UIRectangle.js';
import { createTopMenu } from './topMenu.js';
import { createSettingsMenu } from './SettingsMenu.js';
import { createTimeControls } from './TimeControls.js';
import { CreateFPSMeter } from './FPS.js';
import { UIRectangleTextureView } from './UIRectangleTextureView.js';
import { RightTriangularPrism } from '../GPU/Meshes/right_triangular_prism.js';

declare const engine: Engine;

class Light extends MainNode {
  drawable = undefined;
  constructor(scene: Scene) {
    super({
      directional_light: 1,
      label: 'Light',
      point_light: 0,
      scenes: [scene],
    });
  }
}

const errors: Error[] = [];
export class Canvas {
  currentGameTime = 0;
  showError() {
    if (!this.errorDialog.open) {
      const e = errors.shift();
      if (e) {
        console.error(e);
        if (e.cause) console.error(e.cause);
        this.errorDialog.textContent = e.name + ', ' + e.message;
        this.errorDialog.showModal();
      }
    }
  }
  constructor(
    private errorDialog: HTMLDialogElement,
    private canvasElem: HTMLCanvasElement,
    private progresElem: HTMLSpanElement,
    private progressBar: HTMLProgressElement,
  ) {
    this.canvasElem.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    this.progressBar.max = 100;

    this.errorDialog.addEventListener('close', () => {
      this.showError();
    });
    this.setProgress(6);

    const progressForWasmLoading = 34;
    Engine.initEngine(
      {
        canvas: this.canvasElem,
      },
      (e) => {
        errors.push(e);
        this.showError();
      },
      {
        collider: fetch('../collider/colliderSimd.wasm'),
        rust: fetch('/engine.wasm').then((response) => {
          if (response.body) {
            const contentLengthHeader = response.headers.get('Content-Length');
            if (!contentLengthHeader) {
              return response;
            }
            const reader = response.body.getReader();
            const contentLength = parseInt(contentLengthHeader);
            let receivedLength = 0; // received that many bytes at the moment
            let done = false;
            const progressElem = this.progresElem;
            const reableStream = new ReadableStream({
              async start(controller) {
                do {
                  const results = await reader.read();
                  done = results.done;
                  if (!done) {
                    const value = results.value;
                    controller.enqueue(value);
                    receivedLength += value!.length;
                    const percentOfReceived = receivedLength / contentLength;
                    const progress =
                      6 + progressForWasmLoading * percentOfReceived;
                    progressBar.value = progress;
                    progressElem.textContent = Math.floor(progress).toFixed(0);
                  }
                } while (!done);
                controller.close();
              },
            });
            return new Response(reableStream, {
              headers: response.headers,
            });
          }
          return response;
        }),
      },
    )
      .then(async (terraEngine) => {
        if (!terraEngine) return;
        this.setProgress(40);

        const gpu = await terraEngine.GPUReady;

        this.setProgress(41);

        createSettingsMenu.addKeydownListener();
        new createTimeControls();
        new CreateFPSMeter();
        new Scene('main', gpu, (terrascene) => {
          new Sun(gpu, [terrascene]);
          // Initial scene objects here

          new Sea([terrascene]);
          //new testPlane(terrascene);
          const archRotateController = new ArcRotateCamera(
            gpu.mainCamera,
            true,
          );
          gpu.mainCamera.attachControllerForCamera(archRotateController);
          const human = new Human({
            inputEnabled: false,
            scenes: [terrascene],
          });
          human.setTranslation([403.4, 600, 23]);

          const prism = new RightTriangularPrism({
            can_collide: false,
          });
          prism.setTranslation([403.4, 1000, 30]);

          document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
              if (engine.inputManager === human.inputManager) {
                gpu.mainCamera.attachControllerForCamera(archRotateController);
              } else {
                gpu.mainCamera.attachControllerForCamera(human.inputManager);
              }
            }
          });
          const terrainInited = new Promise<Terrain>((res) => {
            engine.getGPU((gpu2) => {
              res(Terrain.loadFromTexture(gpu2, [terrascene]));
            });
          });
          terrainInited
            .then(
              (terrain) =>
                new createTopMenu({
                  gpu,
                  terrain,
                }),
            )
            .catch((err) => {
              errors.push(err);
              this.showError();
            });

          PlantsUI.plantsMesh = new Plants(terrascene, terrainInited);

          this.setProgress(100);
          return terrainInited;
        });
        // This scene is used to draw zones. It is referred by its label
        new Scene('static', terraEngine.gpu!, (scene) => {
          const sun = new Light(scene);
          sun.setTranslation([0, 1, 0]);
          sun.setAmbientFromId([0, 0, 0]);
          sun.setShadowFromId(1); // shadow to 1 (no shadow)
          return undefined;
        });
        const cone = new Cone(
          {
            label: 'cone',
          },
          true,
        );
        cone.euler_angles = [90, 0, 0];
        cone.setTranslation([0, 900, -70]);
        cone.setColorFromId([1, 0, 0, 0]);
        cone.update_scale(50, 50, 50);
        cone.radius = 50;

        const capsule = new Capsule(true, CAPSULE_ORIENTATION.x, 3, {
          label: 'capsule1',
          point_light: 400,
        });

        capsule.setTranslation([60, 900, -70]);
        capsule.setColorFromId([0, 0, 1, 0]);
        capsule.radius = 30;

        const capsule2 = new Capsule(true, CAPSULE_ORIENTATION.y, 3, {
          label: 'capsule2',
        });

        capsule2.setTranslation([100, 900, -70]);
        capsule2.setColorFromId([0, 0, 1, 0]);
        capsule2.radius = 30;

        const capsule3 = new Capsule(true, CAPSULE_ORIENTATION.z, 3, {
          label: 'capsule3',
        });

        capsule3.setTranslation([140, 900, -70]);
        capsule3.setColorFromId([0, 0, 1, 0]);
        capsule3.radius = 30;

        const roundCuboid = new RoundCuboid(
          {
            depth: 80,
            height: 40,
            width: 40,
          },
          {
            borderRadius: 10,
          },
          {
            label: 'roundCuboid',
          },
        );

        roundCuboid.setTranslation([200, 900, -70]);
        roundCuboid.setColorFromId([0, 0, 1, 0]);

        const sphere4 = new IcoSphere({
          can_collide: true,
          label: 'blueball3',
          order: 1,
          rigid_body: RigidBody.fixed,
        });

        sphere4.setTranslation([-100, 900, -70]);

        sphere4.setColorFromId([1, 0, 1, 0]);
        sphere4.update_scale(30, 30, 30);

        /**
         * Main draw area
         */
        new UIRectangleTextureView(
          {
            borderSize: {
              height: [0],
              width: [0],
            },
            canvaspipeline: gpu.UIPipeline,
            label: 'UICanvas',
            renderPass: gpu.renderPassCanvas,

            scale: {
              min_width: 1,
              unit: NumericUnit['%'],
              y: 1,
            },
            translate: {
              x: {
                anchor: Anchor.CENTER,
                value: [0],
              },
              y: {
                anchor: Anchor.CENTER,
                value: [0],
              },
            },
          },
          gpu.renderPassScreen.props.colorRenderTargets.gRenderTargetDiffuse.resolveTexture!.renderTarget,
        );
        this.setProgress(45);

        const webSocket = new WebSocket('wss://localhost:8081/echo');
        webSocket.onopen = () => {
          console.log('websocket onopen');
          webSocket.send(
            JSON.stringify({
              action: 'init',
              data: {
                /* userinfo: state.userInfo, ticks */
              },
            }),
          );
          webSocket.onmessage = (e) => {
            console.log('message from WS', e);
            const msg = JSON.parse(e.data);
            if (msg.action == 'init') {
              console.debug('going to init game', msg.currentPlayData);
            }
          };
        };
        webSocket.onerror = () => {
          console.error('websocket onerror');
        };
      })
      .catch((e) => {
        errors.push(e);
        this.showError();
      });
  }
  setProgress(value: number) {
    this.progressBar.value = value;
    this.progresElem.textContent = value.toFixed(0);
    if (value === 100)
      this.progressBar.parentNode?.parentNode?.removeChild(
        this.progressBar.parentNode,
      );
  }
}

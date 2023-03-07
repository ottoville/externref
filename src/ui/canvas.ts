import { TerraCamera } from "../TerraCamera.js";
import { Engine } from "../engine.js";


import { Plants } from "../plants/Plants.js";
import { PlantsUI } from "../tools/plantsUI.js";
/*import { CameraTAB } from "../tools/camera.js";
import { BuildingsUI } from "../tools/buildings.js";*/
import { Terrain } from "../world/Terrain.js";
import { Sea } from "../world/water.js";
//import { LazyEval } from "../LazyEval.js";
import { Sun2 } from "../world/sun2.js";

import { MainNode } from "../MainNode.js";
import { Scene } from "../Scene.js";
import { Human } from "../human.js";
//import { savedCamera } from "../types/interfaces/index.js";

//@ts-ignore
import { Box } from "../GPU/Meshes/Box.js";
//@ts-ignore
import { Triangle } from "../GPU/Meshes/Triangle.js";
//@ts-ignore
import { IcoSphere } from "../GPU/Meshes/IcoSphere.js";
import { Cone } from "../GPU/Meshes/Cone.js";
import { Capsule, CAPSULE_ORIENTATION } from "../GPU/Meshes/Capsule.js";
//@ts-ignore
import { RoundCuboid } from "../GPU/Meshes/RoundCuboid.js";
import { ArcRotateCamera } from "../controllers/ArcRotateCamera.js";
import { Anchor, NumericUnit } from "./UIRectangle.js";
import { createTopMenu } from "./topMenu.js";
import { createSettingsMenu } from "./SettingsMenu.js";
import { createTimeControls } from "./TimeControls.js";
import { CreateFPSMeter } from "./FPS.js";
import { UIRectangleTextureView } from "./UIRectangleTextureView.js";

declare const engine: Engine;

class Light extends MainNode {
    constructor(scene: Scene) {
        super({ point_light: 0, directional_light: 1, label: 'Light', scenes: [scene] });
    }
}
const errors: Error[] = []
export class Canvas {
    #progressBar: HTMLProgressElement = document.createElement('progress');
    #progresElem = document.createElement('span');
    #errorDialog = document.createElement('dialog')
    #canvasElem = document.createElement('canvas')
    currentGameTime = 0;
    showError() {
        if (!this.#errorDialog.open) {
            const e = errors.shift();
            if (e) {
                console.error(e);
                if (e.cause)
                    console.error(e.cause);
                this.#errorDialog.textContent = e.name + ', ' + e.message;
                this.#errorDialog.showModal();
            }
        }
    }
    constructor(container: HTMLElement) {
        this.#progressBar.max=100;

        this.#errorDialog.addEventListener('close', () => {
            this.showError();
        });
        this.setProgress(2);
        this.setProgress(6);
        const progressForWasmLoading = 34;
        Engine.initEngine(this.#canvasElem, (e) => {
            errors.push(e);
            this.showError();
        }, {
            rust: fetch('/engine.wasm').then(response => {
                if (response.body) {
                    const reader = response.body.getReader();
                    const contentLengthHeader = response.headers.get('Content-Length');
                    if (!contentLengthHeader) {
                        return response;
                    }
                    const contentLength = parseInt(contentLengthHeader);
                    let receivedLength = 0; // received that many bytes at the moment
                    let done = false
                    const progressBar = this.#progressBar;
                    const progressElem = this.#progresElem
                    const reableStream = new ReadableStream({
                        async start(controller) {
                            do {
                                const results = await reader.read();
                                done = results.done
                                if (!done) {
                                    const value = results.value
                                    controller.enqueue(value)
                                    receivedLength += value!.length;
                                    const percentOfReceived = receivedLength / contentLength;
                                    const progress = 6 + progressForWasmLoading * percentOfReceived;
                                    progressBar.value = progress;
                                    progressElem.textContent = Math.floor(progress).toFixed(0);
                                }
                            } while (!done)
                            controller.close();
                        }
                    });
                    return new Response(reableStream, { headers: response.headers });

                }
                return response;
            }), collider: fetch('../collider/colliderSimdO.wasm')
        }).then(async terraEngine => {
            if (!terraEngine)
                return;
            this.setProgress(40);

            const gpu = await terraEngine.GPUReady;
            const waterCamera = new TerraCamera(engine.mainCamera);
            waterCamera.initForGPU(gpu.renderPassWater, gpu, engine.mainCamera.projection!)
            waterCamera.beforeViewUpdate.add((position, direction) => {
                position[1] -= (position[1] - 3) * 2;
                direction[1] = -direction[1];
            });


            this.setProgress(41);

            createSettingsMenu.addKeydownListener(gpu);
            new createTimeControls({ gpu });
            new CreateFPSMeter({ gpu })
            new Scene('main', gpu, [engine.mainCamera, waterCamera], (terrascene) => {
                new Sun2(gpu, [terrascene]);
                // Initial scene objects here

                new Sea([terrascene]);
                //new testPlane(terrascene);
                const archRotateController = new ArcRotateCamera(engine.mainCamera, true);
                engine.mainCamera.attachControllerForCamera(archRotateController);
                const human = new Human({ scenes: [terrascene], inputEnabled: false });
                // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
                human.translation = [403.4, 1000, 23];
                document.addEventListener('keydown', e => {
                    if (e.key === 'Tab') {
                        if (engine.inputManager === human.inputManager) {
                            engine.mainCamera.attachControllerForCamera(archRotateController);
                        } else {
                            engine.mainCamera.attachControllerForCamera(human.inputManager)
                        }
                    }
                })
                const terrainInited = Terrain.loadFromTexture(gpu, [terrascene]);
                terrainInited.then(terrain => new createTopMenu({ gpu, terrain })).catch(err => {
                    errors.push(err)
                    this.showError();
                });

                PlantsUI.plantsMesh = new Plants(terrascene, terrainInited);

                this.setProgress(100);
                return terrainInited;
            });
            //@ts-expect-error
            const debugscene = new Scene('static', terraEngine.gpu, [engine.mainCamera], (scene) => {
                const sun = new Light(scene);
                sun.translation = [0, 1, 0]
                sun.ambient = [0, 0, 0];
                sun.shadow = 1; // shadow to 1 (no shadow)
            });

            /* const slope = new Box(
                 {can_collide: true, label: 'gravitybixbox2', fixed: true});
             slope.update_scale(200, 5, 200);
             slope.update_rotation(Math.sin(1.4), 0, 0, Math.cos(1.4));
             slope.translation = [23, 500, 23];
         */
            const cone = new Cone({ label: 'cone' }, true);
            cone.update_euler_angles(90, 0, 0);
            cone.translation = [0, 900, -70];
            cone.update_scale(50, 50, 50)
            cone.radius = 50;
            cone.color = [1, 0, 0, 0];


            const sphere2 = new Capsule('blueball1', true, false, CAPSULE_ORIENTATION.y, 3);
            sphere2.translation = [60, 900, -70];
            sphere2.radius = 50;
            sphere2.color = [0, 0, 1, 0];

            /* const sphere3 = new Capsule('blueball2',true,false,CAPSULE_ORIENTATION.x,3);
             sphere3.translation = [-60, 900, -70];
             sphere3.radius = 50;
             sphere3.color=[1,0,1,0];
     */
            const sphere4 = new IcoSphere({ label: 'blueball3', can_collide: true, fixed: false, order: 1 });
            sphere4.translation = [-100, 900, -70];
            sphere4.update_scale(30);
            sphere4.color = [1, 0, 1, 0];


            /*const b = new Box(
                { can_collide: false, label: 'PickGreenbox' });
            b.translation = [0, 400, 0]
            b.update_scale(500, 500, 500);*/

            /* const b = new Box(undefined, undefined, true, 'gravitybixbox',undefined,true);
             b.update_scale(100, 5, 100);
             b.translation = [123, 300, 123];
         */

            /*  const b2 = new Box({point_light: 400, can_collide: true, label: 'gravitygreenbox2', color: [0, 1, 0, 0]});
              b2.translation = [23, 500, -100];
              b2.hasGravity = true;*/

            /*   const slope = new Triangle('slopeTriangle',undefined,true);
               slope.update_scale(0, 400, 400);

            //   slope.update_euler_angles(0,0,Math.PI*-0.5);
               slope.update_euler_angles(0,0,Math.PI*-0.4);
               slope.translation = [23,600,23];*/



            new UIRectangleTextureView({
                canvaspipeline: gpu.UIPipeline,
                renderPass: gpu.renderPassCanvas,
                label: 'UICanvas',
                borderSize: {
                    width: [0],
                    height: [0]
                },
                scale: { min_width: 1, y: 1, unit: NumericUnit["%"] },
                translate: {
                    x: {
                        value: [0],
                        anchor: Anchor.CENTER
                    },
                    y: {
                        value: [0],
                        anchor: Anchor.CENTER
                    }
                },
            }, gpu.renderPassScreen.colorRenderTargets.gRenderTargetDiffuse.resolveTexture!.view);
            this.setProgress(45);


            const webSocket = new WebSocket('ws://localhost:8081');
            webSocket.onopen = () => {
                console.log('websocket onopen');
                // progelem.value = 30;
                try {

                    webSocket.send(JSON.stringify({ action: 'init', data: { /* userinfo: state.userInfo, ticks */ } }));
                    webSocket.onmessage = (e) => {
                        const msg = JSON.parse(e.data);
                        if (msg.action == 'init') {
                            console.debug('going to init game', msg.currentPlayData)

                        }
                    }
                    //sceneInitedred();
                } catch (e) {
                    // sceneInitedrej(e);
                }
            }
            webSocket.onerror = () => {
                console.log('websocket onerror');
                try {
                    console.debug('initing without websocket connection');

                    // sceneInitedred();
                } catch (e) {
                    // sceneInitedrej(e);
                }
            }
        }).catch(e => {
            errors.push(e)
            this.showError();
        });
        const mainContainer = container.appendChild(document.createElement('div'));
        mainContainer.id='mainContainer';
        mainContainer.appendChild(this.#errorDialog)
        mainContainer.appendChild(this.#canvasElem);
        const devTools = container.appendChild(document.createElement('aside'));
        devTools.style.display = 'none';
        const closeButton = devTools.appendChild(document.createElement('button'));
        closeButton.textContent = 'close';
        closeButton.onclick = () => {
            devTools.style.display = 'none';
        }
        const progressBarContainer = mainContainer.appendChild(document.createElement('div'));
        progressBarContainer.id='progressBarContainer';
        progressBarContainer.appendChild(this.#progresElem);
        progressBarContainer.appendChild(document.createElement('br'));
        progressBarContainer.appendChild(this.#progressBar);
    }
    setProgress(value: number) {
        this.#progressBar.value = value;
        this.#progresElem.textContent = value.toFixed(0);
        if (value === 100)
            this.#progressBar.parentNode?.parentNode?.removeChild(this.#progressBar.parentNode);
    }
}

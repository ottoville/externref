import { TerraCamera } from "../TerraCamera.js";
import { Engine } from "../engine.js";


import { Plants } from "../plants/Plants.js";
import { UITAB, UITABClassLike } from "../UITAB.js";
import { PlantsUI } from "../tools/plantsUI.js";
import { CameraTAB } from "../tools/camera.js";
import { BuildingsUI } from "../tools/buildings.js";
import { TerrainTool } from "../tools/Terrain.js";
import { Zones } from "../tools/Zones.js";
import { Terrain } from "../world/terrain.js";
import { Sea } from "../world/water.js";
//import { LazyEval } from "../LazyEval.js";
import { Sun2 } from "../world/sun2.js";

import { MainNode } from "../MainNode.js";
import { Scene } from "../Scene.js";
import { Human } from "../human.js";
//import { savedCamera } from "../types/interfaces/index.js";


import type { DrawableSimple } from "../GPU/Drawable.js";
import { RenderPipeline, Shader, VertexShader } from "../GPU/RenderPipeline.js";
//@ts-ignore
import { Box } from "../GPU/Meshes/Box.js";
//@ts-ignore
import { Triangle } from "../GPU/Meshes/Triangle.js";
//@ts-ignore
import { Sphere } from "../GPU/Meshes/Sphere.js";
//@ts-ignore
import { Cone } from "../GPU/Meshes/Cone.js";

declare const engine:Engine;
class CanvasMesh extends MainNode {
    drawable:DrawableSimple;
    constructor(canvaspipeline: RenderPipeline, positionsCount: number) {
        super(positionsCount,undefined, undefined, undefined, 'canvas');
        this.drawable = canvaspipeline.addDrawableSimple(this, undefined, undefined, undefined, new Set([engine.gpu!.renderPassCanvas]))

    }
}

class Light extends MainNode {
    constructor(scene:Scene) {
        super(undefined,0,1,undefined,'Light',[scene]);
    }
}
const errors:Error[]=[]
export class Canvas extends TerraCompoment {
    #progressBar: HTMLProgressElement = <progress min="0" max="100" value="0"></progress>;
    #progresElem: HTMLSpanElement = <span>0</span>;
    #errorDialog: HTMLDialogElement = <dialog></dialog>
    #canvasElem: HTMLCanvasElement = <canvas class="gameControl hidden"></canvas>
    currentGameTime = 0;
    menuClick?: (tool: UITABClassLike, menuContainer: HTMLFieldSetElement) => void;
    showError() {
        if(!this.#errorDialog.open) {
            const e=errors.shift();
            if(e) {
                this.#errorDialog.textContent = e.name + ', ' + e.message;
                this.#errorDialog.showModal();
            }
        }
    }
    async initalize(): Promise<[Scene] | void> {
        this.progress = 6;

        const terraEngine = await Engine.initEngine(this.#canvasElem, (e) => {
            console.error(e);
            errors.push(e);
            this.showError();
        }, {rust:  fetch('/js/engine/wasm32-unknown-unknown/debug/engine.wasm'), collider: fetch('../collider/colliderSimdO.wasm')});
        if(!terraEngine)
            return;
        this.progress = 15;


        const waterCamera = new TerraCamera(terraEngine.gpu!.renderPassWater, engine.mainCamera.projection, terraEngine.gpu, engine.mainCamera);
        waterCamera.beforeViewUpdate.add((position, direction) => {
            position[1] -= (position[1] - 3) * 2;
            direction[1] = -direction[1];
        });

      
        this.progress = 19;

        const mainScene = new Scene('main', terraEngine.gpu!, [engine.mainCamera, waterCamera], (terrascene) => {
            new Sun2([terrascene]);
            // Initial scene objects here

            new Sea([terrascene]);
            //new testPlane(terrascene);

            new Human([terrascene])
            const terrainInited = Terrain.loadFromTexture([terrascene]);

            const ready = terrainInited.then(ground => [ground] as const);
            PlantsUI.plantsMesh = new Plants(terrascene, terrainInited);

            this.progress = 100;
            return ready;
        });
        //@ts-expect-error
        const debugscene = new Scene('static', terraEngine.gpu, [engine.mainCamera], (scene) => {
            const sun = new Light(scene);
            sun.translation.set([0, 1, 0]);
            sun.gpu_custom_data = [0, 0, 0, 1]; //shadow to 1 (no shadow)
            //  sun.customData.set([0, 0, 0, 1]) //shadow to 1 (no shadow)
        });
        const slope = new Triangle('slopeTriangle',undefined,true);
        slope.update_scale(0, 400, 400);

     //   slope.update_euler_angles(0,0,Math.PI*-0.5);
        slope.update_euler_angles(0,0,Math.PI*-0.4);
        slope.translation = [23,600,23];


       /* const bixbox = new Box(undefined, 400,true,'bigbox',[1,1,0,0]);
        bixbox.update_scale(400, 400, 400);
        bixbox.translation = [23,200,23];*/


        const b2 = new Sphere(3,'sphere',[0,1,0,0],true);
        b2.translation = [346.5, 1300, 350];
     //   b2.translation = [-140, 590, 350];
        b2.radius = 10;
        //@ts-ignore
        window.b2=b2;
        b2.hasGravity=true;


        const canvasPipeline = engine.gpu!.renderPassCanvas.rootLayout.addRenderPipeline('CanvasRenderPipeline',
            new VertexShader(terraEngine.gpu!, 'deferred.vert.wgsl'),
            new Shader(terraEngine.gpu!, 'deferred.frag.wgsl'), {
            primitive: {
                topology: 'triangle-list',
                frontFace: 'ccw'
            }
        });
        new CanvasMesh(canvasPipeline, 6);



        this.progress = 20;


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
        /*
        for (let i = 0; i < gameControlsUI.length; i++) {
            gameControlsUI[i].classList.remove('hidden');
        }
        */
        return [mainScene];
    }
    toolsContainer: HTMLFieldSetElement = <fieldset class="w3-bar w3-light-grey w3-border w3-top" style="top:15px; overflow: visible;"></fieldset>
    gameState = <fieldset class="gameControl hidden" id="gameState"></fieldset>

    uiTabs: (UITABClassLike)[] = [PlantsUI, BuildingsUI, CameraTAB, TerrainTool, Zones]
    openedMenu: [UITAB, HTMLFieldSetElement] | undefined;
    timeOfDay: HTMLOutputElement = <output id="TODout" fow="TOD"></output>
    constructor() {
        super();
        this.#errorDialog.addEventListener('close', () => {
            this.showError();
        })
        this.progress = 2;
        this.uiTabs.forEach(tool => {
            const menuContainer: HTMLFieldSetElement = <fieldset class="w3-dropdown-content w3-card-4 w3-show" style="margin-top:36px"></fieldset>
            this.toolsContainer.appendChild(<div class="w3-dropdown-click">
                <button class="w3-bar-item w3-button" onClick={() => this.menuClick && this.menuClick(tool, menuContainer)}>{tool.label}</button>
                {menuContainer}
            </div>)
        });
        this.initalize().then(async args => {
            if(!args)
                return;
            setInterval(() => {
                this.timeOfDay.value = new Date(Number(engine.physics.gameTime)).toUTCString();
            }, 1000);

            const [terrain] = await args[0].ready!;
            this.menuClick = (tool: UITABClassLike, menuContainer: HTMLFieldSetElement) => {
                if (this.openedMenu) {
                    const [oldInstance, oldMenuContainer] = this.openedMenu;
                    oldInstance.destroy();
                    if (oldMenuContainer.firstChild) {
                        oldMenuContainer.removeChild(oldMenuContainer.firstChild);
                        if (oldMenuContainer == menuContainer) {
                            this.openedMenu = undefined;
                            return;
                        }
                    }
                }
                const instance = new tool(terrain, this.#canvasElem);
                menuContainer.appendChild(tool.menuElem(instance));
                this.openedMenu = [instance, menuContainer];
            }
            this.gameState.appendChild(<div onChange={(e: Event) => { engine.physics.gameSpeed = parseInt((e.target as HTMLInputElement).value) }}>
                <label>Time of day: {this.timeOfDay}</label>
                <br />
                <input name="time" type="radio" id="pause" value="-1" checked={engine.physics.gameSpeed === -1} />
                <label for="pause">⏸️</label>
                <input name="time" type="radio" id="play" value="0" checked={engine.physics.gameSpeed === 0} />
                <label for="play">▶️</label>
                <input name="time" type="radio" id="fastforward" value="1" checked={engine.physics.gameSpeed === 1} />
                <label for="fastforward">⏩</label>
                <input name="time" type="radio" id="fastforward2" value="2" checked={engine.physics.gameSpeed === 2} />
                <label for="fastforward2">4⏩</label>
                <input name="time" type="radio" id="fastforward3" value="3" checked={engine.physics.gameSpeed === 3} />
                <label for="fastforward3">8⏩</label>
                <input name="time" type="radio" id="fastforward4" value="4" checked={engine.physics.gameSpeed === 4} />
                <label for="fastforward4">16⏩</label>
                <input name="time" type="radio" id="fastforward5" value="5" checked={engine.physics.gameSpeed === 5} />
                <label for="fastforward5">32⏩</label>
            </div>)
        }).catch((e:Error) => {
            errors.push(e);
            this.showError();
        });
    }
    set progress(value: number) {
        this.#progressBar.value = value;
        this.#progresElem.textContent = value.toFixed(0);
        if (value === 100)
            this.#progressBar.parentNode?.parentNode?.removeChild(this.#progressBar.parentNode);
    }
    render() {
        return <div style="height:100%">
            {this.#errorDialog}
            {this.#canvasElem}
            {this.toolsContainer}
            <div id="fps">@(rendertime) @(msPerFrame)</div>
            {this.gameState}
            <div style="position:absolute;top:30%; background-color:white;width:100%;text-align:center ">
                {this.#progresElem}
                <br />
                {this.#progressBar}
            </div>
        </div >
    }
}

import { TerraCamera } from "../TerraCamera.js";
import { Engine } from "../engine.js";


import { Plants } from "../plants/Plants.js";
import { UITAB, UITABClassLike } from "../UITAB.js";
import { PlantsUI } from "../tools/plantsUI.js";
import { CameraTAB } from "../tools/camera.js";
import { BuildingsUI } from "../tools/buildings.js";
import { TerrainTool } from "../tools/Terrain.js";
import { Zones } from "../tools/zones.js";
import { Terrain } from "../world/terrain.js";
import { Sea } from "../world/water.js";
//import { LazyEval } from "../LazyEval.js";
import { Box } from "../GPU/Meshes/Box.js";
import { Sun2 } from "../world/sun2.js";

import { MainNode } from "../MainNode.js";
import { Scene } from "../Scene.js";
import { Human } from "../human.js";
//import { savedCamera } from "../types/interfaces/index.js";


import type { DrawableSimple } from "GPU/Drawable.js";
import { RenderPipeline, Shader, VertexShader } from "../GPU/RenderPipeline.js";

declare const engine:Engine;
class CanvasMesh extends MainNode {
    drawable:DrawableSimple;
    constructor(canvaspipeline: RenderPipeline, positionsCount: number) {
        super(undefined, undefined, positionsCount);
        this.drawable = canvaspipeline.addDrawableSimple(this, undefined, undefined, undefined, 'canvas',new Set([engine.gpu.renderPassCanvas]))

    }
}

class Light extends MainNode {
    constructor(scene:Scene) {
        super(false, false,undefined,undefined,0,1,undefined,undefined,[scene]);
    }
}

export class Canvas extends TerraCompoment {
    #progressBar: HTMLProgressElement = <progress min="0" max="100" value="0"></progress>;
    #progresElem: HTMLSpanElement = <span>0</span>;
    #canvasElem: HTMLCanvasElement = <canvas class="gameControl hidden"></canvas>
    currentGameTime = 0;
    menuClick?: (tool: UITABClassLike, menuContainer: HTMLFieldSetElement) => void;
    async initalize(): Promise<[Scene]> {
 


        this.progress = 6;

        const terraEngine = await Engine.initEngine(this.#canvasElem);
        this.progress = 15;


        const waterCamera = new TerraCamera(terraEngine.gpu.renderPassWater, engine.mainCamera.projection, terraEngine.gpu, engine.mainCamera);
        waterCamera.beforeViewUpdate.add((position, direction) => {
            position[1] -= (position[1] - 3) * 2;
            direction[1] = -direction[1];
        });

      
        this.progress = 19;



        const mainScene = new Scene('main', terraEngine.gpu, [engine.mainCamera, waterCamera], (terrascene) => {
            new Sun2([terrascene]);
            // Initial scene objects here

            const sea = new Sea([terrascene]);
            //new testPlane(terrascene);

            const b = new Box([terrascene],undefined,'bigbox');
            b.update_scale(terraEngine.rustEngine, 500, 500, 500);
            b.SetTranslation([123,1000,123]);
            b.update_rotation(terraEngine.rustEngine,Math.sin(1.1),0,0,Math.cos(1.1));
            //@ts-expect-error
            window.debugBB=() => b.drawable.debug_bounding_box();

            new Human([terrascene])
            const terrainInited = Terrain.loadFromTexture([terrascene]);

            const ready = terrainInited.then(async ground => [ground, sea]);
            PlantsUI.plantsMesh = new Plants(terrascene, terrainInited);

            this.progress = 100;
            return ready;
        });
        const debugscene = new Scene('static', terraEngine.gpu, [engine.mainCamera], (scene) => {
            const sun = new Light(scene);
            sun.get_translation().set([0, 1, 0]);
            sun.gpu_custom_data = new Float32Array([0, 0, 0, 1]); //shadow to 1 (no shadow)
            //  sun.customData.set([0, 0, 0, 1]) //shadow to 1 (no shadow)
            return undefined;
        });

        const b2 = new Box([debugscene], 1000,'greenbox',[0,1,0,0]);
        //const b3 = new Box(debugscene,100);
        //b2.update(scale => scale.set([200, 200, 200]));
        b2.update_scale(terraEngine.rustEngine, 30, 30, 30);
        //b3.update_scale(30, 30, 30);
        //const translation = b2.get_translation();
        //b3.SetTranslation([-1000, 400, 0])
        //b2.setTranslationX(500);
        const x = 500;
        const z = 800;
        // let z = 0;
        b2.SetTranslation([x, 1200, z]);
       const velocity=b2.get_velocity();
       b2.SetTranslationDelta([velocity[0],velocity[1],3])
        //let x2=-1000;
        //@ts-ignore
        let a = 0;
        setInterval(() => {
           // b2.SetTranslation([x,1200])
            //@ts-ignore
            a += 0.005;
            //b3.SetTranslation([x2++, 400, 0])
        }, 10);
        /* setTimeout(() => {
             clearInterval(intervalID);
             b2.destroy(terraEngine.rustEngine);
         },10000)*/

        const canvasPipeline = terraEngine.gpu.rootLayout.addRenderPipeline(
            new VertexShader(terraEngine.gpu, 'deferred.vert.wgsl'),
            new Shader(terraEngine.gpu, 'deferred.frag.wgsl'), {
            label: 'canvas',
            primitive: {
                topology: 'triangle-list',
                frontFace: 'ccw'
            }
        });
        new CanvasMesh(canvasPipeline, 6);



        this.progress = 20;


        const webSocket = new WebSocket('ws://localhost:8081');
        webSocket.onopen = async () => {
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
        webSocket.onerror = async () => {
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
        this.progress = 2;
        this.uiTabs.forEach(tool => {
            const menuContainer: HTMLFieldSetElement = <fieldset class="w3-dropdown-content w3-card-4 w3-show" style="margin-top:36px"></fieldset>
            this.toolsContainer.appendChild(<div class="w3-dropdown-click">
                <button class="w3-bar-item w3-button" onClick={() => this.menuClick && this.menuClick(tool, menuContainer)}>{tool.label}</button>
                {menuContainer}
            </div>)
        });
        this.initalize().then(async args => {
            setInterval(() => {
                this.timeOfDay.value = new Date(Number(engine.physics.gameTime)).toUTCString();
            }, 1000);

            const [terrain, sea]: [Terrain, Sea] = await args[0].ready;
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
                const instance = new tool(terrain, sea);
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
        }).catch(e => {
            console.error('creating terrain failed', e);
            this.#progresElem.textContent = e.name + ' ' + e.message;

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

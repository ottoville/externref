import { GPU } from "../GPU.js";

import { TerraCamera } from "../TerraCamera.js";
import { ArcRotateCamera } from "../ArcRotateCamera.js";
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
import { LazyEval } from "../LazyEval.js";
import { Box } from "../GPU/Meshes/Box.js";
import { Sun2 } from "../world/sun2.js";

import { MainNode, TerraNodeGPU } from "../TerraNode.js";
import { Scene } from "../Scene.js";
import { Human } from "../human.js";
import { savedCamera } from "../types/interfaces/index.js";

import type { DrawableSimple } from "GPU/Drawable.js";
import { RenderPipeline, Shader, VertexShader } from "../GPU/RenderPipeline.js";
import { Projection } from "../GPU/Projection.js";

class CanvasMesh extends TerraNodeGPU<DrawableSimple> {
    Drawable = this.renderPipeline.addDrawableSimple(undefined, new Set([this.engine.gpu.renderPassCanvas]), this, undefined, undefined, undefined, 'canvas')
    constructor(engine: Engine, canvaspipeline: RenderPipeline, positionsCount: number) {
        super(engine, canvaspipeline, positionsCount);
    }
}

export class Canvas extends TerraCompoment {
    #progressBar: HTMLProgressElement = <progress min="0" max="100" value="0"></progress>;
    #progresElem: HTMLSpanElement = <span>0</span>;
    #canvasElem: HTMLCanvasElement = <canvas class="gameControl hidden"></canvas>
    currentGameTime = 0;
    menuClick?: (tool: UITABClassLike, menuContainer: HTMLFieldSetElement) => void;
    async initalize(): Promise<[Scene, ArcRotateCamera]> {
        if (!window.navigator.gpu)
            throw ('no webgpu support');
        const adapter = await window.navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        this.progress = 4;

        if (!adapter)
            throw ('No adapter');
        const device = await adapter.requestDevice();
        this.progress = 5;
        if (!device)
            throw ('no GPU device');
        const shaderModules: Map<string, GPUShaderModule> = new Map();
        const shaders = ['simple.vert.wgsl', 'simple.frag.wgsl',
            'water.vert.wgsl', 'water.frag.wgsl', 'ground.vert.wgsl', 'ground.frag.wgsl', 'sun.vert.wgsl', 'sun.frag.wgsl', 'color.frag.wgsl', 'UIColor.frag.wgsl',
            'plane.vert.wgsl', 'helper2.vert.wgsl',
            'terrain/calculatePlaneIndices.comp.wgsl', 'terrain/calculateNormals.comp.wgsl', 'terrain/calculatePlaneHeights.comp.wgsl',
            'terrain/CreateGroundFromHeightMap.comp.wgsl', 'terrain/createTerrainTexture.comp.wgsl',
            'grass/getHeightAtCoordinates.comp.wgsl', 'grass/grass.vert.wgsl', 'deferred.vert.wgsl', 'deferred.frag.wgsl', 'clusters.comp.wgsl', 'debug_normals.vert.wgsl',
            'updateView.comp.wgsl'
        ];
        await Promise.all(shaders.map(async u => {
            const compiled = await (await fetch('/shaders/wgsl/' + u)).text();
            shaderModules.set(u, device.createShaderModule({ code: compiled }));
        }));
        const gpu = new GPU(this.#canvasElem, device, shaderModules);


        //@ts-ignore
        window.printRenderTarget = () => {
            gpu.renderPassScreen.renderTargets.gRenderTargetNormals.texture.toBitmap(0)
        }
        //@ts-ignore
        window.printRenderTarget3 = () => {
            gpu.renderPassScreen.renderTargets.gRenderTargetDiffuse.texture.toBitmap(0)
        }

        this.progress = 6;
        this.progress = 10;


        this.progress = 13;

        const terraEngine = await Engine.initEngine(gpu, DB, this.#canvasElem);
        this.progress = 15;

        const projection = new Projection(gpu);
        const mainCamera = new TerraCamera(gpu.renderPassScreen, projection, gpu)
        this.progress = 16;

        const camera = new ArcRotateCamera(0, 0, 10, terraEngine, mainCamera);
        this.progress = 17;
        camera.attachControl();

        this.progress = 18;

        const waterCamera = new TerraCamera(gpu.renderPassWater, projection, gpu, mainCamera);
        waterCamera.beforeViewUpdate.add((position, target) => {
            position[1] -= (position[1] - 3) * 2;
            target[1] = -target[1];
        });

        const TerraCameras = [mainCamera, waterCamera]
        const timeAndDeltaBuffer = new ArrayBuffer(8);
        const timeView = new Uint32Array(timeAndDeltaBuffer, 0, 1);
        const deltaView = new Float32Array(timeAndDeltaBuffer, 4, 1);

        this.progress = 19;



        const mainScene = new Scene('main', gpu, terraEngine, [mainCamera, waterCamera], (terrascene) => {
            const sun = new Sun2(terrascene);
            // Initial scene objects here

            const sea = new Sea(terrascene);
            //new testPlane(terrascene);

            const b = new Box(terrascene);
            b.update_scale(terraEngine.rustEngine, 500, 500, 500);
            new Human(terrascene)
            const terrainInited = Terrain.loadFromTexture(terrascene);

            const ready = terrainInited.then(async ground => [ground, sea]);
            PlantsUI.plantsMesh = new Plants(terrascene, terrainInited);

            DB.then(DB => {
                DB.transaction("save").objectStore("save").get(0).onsuccess = async (evt) => {
                    if ((evt.target as IDBRequest).result) {
                        const restored = ((evt.target as IDBRequest).result as savedCamera).camera;
                        camera.alpha = restored.alpha;
                        camera.alpha = restored.alpha;
                        camera.beta = restored.beta;
                        camera.radius = restored.radius;
                        mainCamera.update(values => {
                            values.target[0] = restored.target[0];
                            values.target[1] = restored.target[1];
                            values.target[2] = restored.target[2];
                            values.position[0] = restored.position[0];
                            values.position[1] = restored.position[1];
                            values.position[2] = restored.position[2];
                        })
                    }
                    const l = new LazyEval(() => {
                        //console.log(this.camera.position.y);
                        DB.transaction("save", "readwrite").objectStore("save").put({
                            id: 0,
                            camera: { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: new Float32Array([mainCamera.target[0], mainCamera.target[1], mainCamera.target[2]]), position: new Float32Array([mainCamera.position[0], mainCamera.position[1], mainCamera.position[2]]) }
                        } as savedCamera);
                    })
                    mainCamera.beforeViewUpdate.add(() => {
                        l.eval(500);
                    });
                }
            });
            this.progress = 100;
            return [sun.gpu_alignment, ready];
        });
        const debugscene = new Scene('static', gpu, terraEngine, [mainCamera], (scene) => {
            const sun = new MainNode(scene.engine, false, false,undefined,undefined,0);
            sun.get_translation().set([0, 1, 0]);
            sun.gpu_custom_data = new Float32Array([0, 0, 0, 1]); //shadow to 1 (no shadow)
            //  sun.customData.set([0, 0, 0, 1]) //shadow to 1 (no shadow)
            return [sun.gpu_alignment]
        });

        const b2 = new Box(debugscene, 1000);
        //const b3 = new Box(debugscene,100);
        //b2.update(scale => scale.set([200, 200, 200]));
        b2.update_scale(terraEngine.rustEngine, 30, 30, 30);
        //b3.update_scale(30, 30, 30);
        //const translation = b2.get_translation();
        b2.SetTranslation([1000, 400, 0])
        //b3.SetTranslation([-1000, 400, 0])
        //b2.setTranslationX(500);
        const x = -3000;
        // let z = 0;
        b2.SetTranslation([x, 400, 300])
        //let x2=-1000;
        //@ts-ignore
        let a = 0;
        setInterval(() => {
            //b2.SetTranslation([x*Math.cos(a), 400,x*Math.sin(a)])
            //@ts-ignore
            a += 0.005;
            //b3.SetTranslation([x2++, 400, 0])
        }, 10);
        /* setTimeout(() => {
             clearInterval(intervalID);
             b2.destroy(terraEngine.rustEngine);
         },10000)*/

        let renderFrame = 0;
        let resizeHandler = 0;

        let curSecond = (Date.now() / 500) | 0;
        let framecount = 0;
        //@ts-ignore
        let rendertime = 0;
        //@ts-ignore
        let msPerFrame = 0;

        let startTime = 0;


        const canvasPipeline = gpu.rootLayout.addRenderPipeline(
            new VertexShader(gpu, 'deferred.vert.wgsl'),
            new Shader(gpu, 'deferred.frag.wgsl'), {
            label: 'canvas',
            primitive: {
                topology: 'triangle-list',
                frontFace: 'ccw'
            }
        });
        new CanvasMesh(terraEngine, canvasPipeline, 6);
        //new TerraNodeGPU<DrawableSimple>(terraEngine, canvasPipeline, 6, (node) => node.renderPipeline.addDrawableSimple(undefined, new Set([gpu.renderPassCanvas]), node, undefined, undefined, undefined, 'canvas'),undefined,undefined,6)
        function renderLoop(time: DOMHighResTimeStamp) {
            msPerFrame = performance.now() - startTime;
            startTime = performance.now();

            const nowSecond = (Date.now() / 500) | 0;
            if (nowSecond !== curSecond) {
                rendertime = framecount * 2;
                curSecond = nowSecond;
                framecount = 0;
            }
            framecount++;
            //performance.mark('renderloopStart');


            gpu.onRenders2.forEach(or => {
                const buff = or();
                if (buff)
                    gpu.pendingCommandBuffers.add(buff);
            });
            if (camera.checkInputs()) {
                //camera.camera.update(values => {
                camera.calculateCameraPositionAndTarget();
                //})
            }

            const renderEncoder = gpu.device.createCommandEncoder();

            timeView.set([time]);
            let physicDelta: number | null;
            if (terraEngine.physics.gameSpeed == -1)
                physicDelta = null;
            else
                physicDelta = (terraEngine.physics.physicTime - terraEngine.physics.tickTime) / ((terraEngine.physics.tickIntervalMs / 1000) << terraEngine.physics.gameSpeed)

            if (physicDelta !== null)
                deltaView.set([physicDelta]);

            gpu.device.queue.writeBuffer(gpu.timeBuffer, 0, timeAndDeltaBuffer);
            try {
                TerraCameras.forEach(camera => {
                    camera.updateView(renderEncoder)
                })
                const lightPass = renderEncoder.beginComputePass();
                lightPass.setPipeline(gpu.updateViewPipeline);
                lightPass.setBindGroup(0, gpu.updateViewBindGroup);
                TerraCameras.forEach(camera => {
                    if(camera.viewUpdated || terraEngine.updateLights) {
                        camera.viewUpdated=false;
                        lightPass.setBindGroup(1, camera.updateViewBindGroup);
                        lightPass.dispatch(...gpu.CLUSTER_DISPATCH_SIZE);
                    }
                });
                lightPass.endPass();
                terraEngine.updateLights = false;

                TerraCameras.forEach(camera => {
                    camera.renderPass.render(renderEncoder, camera.uniformBindGroup,gpu.rootCameralayout);
                });
            } catch (e) {
                console.error(e);
            }

            gpu.renderPassCanvas.render(renderEncoder, gpu.BindGroupCanvas, gpu.rootLayout);

            gpu.pendingCommandBuffers.add(renderEncoder.finish())
            gpu.device.queue.submit(gpu.pendingCommandBuffers);
            gpu.pendingCommandBuffers.clear();
            gpu.tempGPUBuffers.forEach(buff => buff.destroy())
            renderFrame = window.requestAnimationFrame(renderLoop);
        }

        const maxResolution = {
            width: 1920,
            height: 1080
        }
        const computePipelineClusters       = gpu.createComputePipeline('clusters.comp.wgsl');
        const computePipelineClustersLayout = computePipelineClusters.getBindGroupLayout(0)
        const ro = new window.ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry)
                return;
            window.cancelAnimationFrame(renderFrame)
            clearTimeout(resizeHandler);
            resizeHandler = setTimeout(async () => {
                const aspectRatio = entry.contentRect.width / entry.contentRect.height
                this.#canvasElem.width = Math.min((entry.contentRect.width | 0) * window.devicePixelRatio, maxResolution.width);

                this.#canvasElem.height = this.#canvasElem.width / aspectRatio

                if (this.#canvasElem.height > maxResolution.height) {
                    this.#canvasElem.height = maxResolution.height;
                    this.#canvasElem.width = this.#canvasElem.height * aspectRatio;
                }

                gpu.scale.x = this.#canvasElem.width / entry.contentRect.width;
                gpu.scale.y = this.#canvasElem.height / entry.contentRect.height;
                // configure() must also be called if you want to change the size of the textures returned by getCurrentTexture()
                gpu.context.configure({
                    device: device,
                    format: "bgra8unorm",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT
                })
                const commandEncoder = gpu.createCommandEncoder();
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(computePipelineClusters);
                
                gpu.projections.forEach(projection => projection.update(aspectRatio))

                gpu.renderPasses.forEach(renderPass => {
                    renderPass.resize(this.#canvasElem.width, this.#canvasElem.height);
                    renderPass.cameras.forEach(camera => {
                        camera.updateProjection(passEncoder,computePipelineClustersLayout)
                    });
                });
                passEncoder.endPass();
                gpu.device.queue.submit([commandEncoder.finish()]);

                renderFrame = window.requestAnimationFrame(renderLoop);
            }, 500)
        });
        ro.observe(this.#canvasElem.parentElement!)


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
        return [mainScene, camera];
    }
    toolsContainer: HTMLFieldSetElement = <fieldset class="w3-bar w3-light-grey w3-border w3-top" style="top:15px; overflow: visible;"></fieldset>
    gameState = <fieldset class="gameControl hidden" id="gameState"></fieldset>

    uiTabs: UITABClassLike[] = [PlantsUI, BuildingsUI, CameraTAB, TerrainTool, Zones]
    openedMenu?: [UITAB, HTMLFieldSetElement];
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
                this.timeOfDay.value = new Date(Number(args[0].engine.physics.gameTime)).toUTCString();
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
                const instance = new tool(args[0], terrain, args[1], sea);
                menuContainer.appendChild(tool.menuElem(instance));
                this.openedMenu = [instance, menuContainer];
            }
            this.gameState.appendChild(<div onChange={(e: Event) => { args[0].engine.physics.gameSpeed = parseInt((e.target as HTMLInputElement).value) }}>
                <label>Time of day: {this.timeOfDay}</label>
                <br />
                <input name="time" type="radio" id="pause" value="-1" checked={args[0].engine.physics.gameSpeed === -1} />
                <label for="pause">⏸️</label>
                <input name="time" type="radio" id="play" value="0" checked={args[0].engine.physics.gameSpeed === 0} />
                <label for="play">▶️</label>
                <input name="time" type="radio" id="fastforward" value="1" checked={args[0].engine.physics.gameSpeed === 1} />
                <label for="fastforward">⏩</label>
                <input name="time" type="radio" id="fastforward2" value="2" checked={args[0].engine.physics.gameSpeed === 2} />
                <label for="fastforward2">4⏩</label>
                <input name="time" type="radio" id="fastforward3" value="3" checked={args[0].engine.physics.gameSpeed === 3} />
                <label for="fastforward3">8⏩</label>
                <input name="time" type="radio" id="fastforward4" value="4" checked={args[0].engine.physics.gameSpeed === 4} />
                <label for="fastforward4">16⏩</label>
                <input name="time" type="radio" id="fastforward5" value="5" checked={args[0].engine.physics.gameSpeed === 5} />
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

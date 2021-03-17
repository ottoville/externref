import { GPU } from "../GPU.js";
import { RenderPass } from "../GPU/RenderPass.js";
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
//@ts-ignore
import { PositionNode, TerraNodeGPU } from "../TerraNode.js";
import { Scene } from "../Scene.js";
import { Human } from "../human.js";
import { savedCamera } from "../types/interfaces/index.js";
import { RenderTarget } from "../GPU/RenderTarget.js";
//@ts-ignore
import { DrawableSimple } from "GPU/Drawable.js";
/*
const tools: {
    name: string,
    icon: string,
    class: string
    elem: HTMLElement
}[] = [{
    name: 'Zones',
    icon: '▧',
    class: 'Zones',
    elem: <div></div>
},
{
    name: 'Plants',
    icon: '🌲',
    class: 'Buildings',
    elem: <div></div>
},
{
    name: 'Buildings',
    icon: '🏠',
    class: 'Buildings',
    elem: <div></div>
},
{
    name: 'Camera',
    icon: '📷', 
    class: 'Camera',
    elem: <div></div>
},
{
    name: 'Terrain',
    icon: '🗻',
    class: 'TerrainTool',
     elem: <div></div>
}]*/


export class Canvas extends TerraCompoment {
    progressBar: HTMLProgressElement = <progress min="0" max="100" value="0"></progress>;
    progresElem: HTMLSpanElement = <span>0</span>;
    canvasElem: HTMLCanvasElement = <canvas class="gameControl hidden"></canvas>
    rendertime = 0;
    msPerFrame = 0;
    currentGameTime = 0;
    menuClick?: (tool: UITABClassLike, menuContainer: HTMLFieldSetElement) => void;
    BindGroupCanvas!: () => BindGroupThreeBinding;
    async initalize(): Promise<[Scene, ArcRotateCamera]> {
        const adapter = await window.navigator.gpu!.requestAdapter();
        this.progress = 4;

        if (!adapter)
            throw ('No adapter');
        const device = await adapter.requestDevice();
        this.progress = 5;
        if (!device)
            throw ('no GPU device');



        const canvasSampler = device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });
    

        const gpu = new GPU(this.canvasElem, device, (gpu) => {
            const renderpassCanvas = new RenderPass(gpu, 1, false, { width: this.canvasElem.width, height: this.canvasElem.height }, { r: 0.53, g: 0.8, b: 0.92, a: 1.0 },
                (w, h) => {
                    return [w, h]
                });
           //new RenderTarget(renderpassCanvas, "bgra8unorm");
            const renderpassScreen = new RenderPass(gpu, 1, true, { width: this.canvasElem.width, height: this.canvasElem.height }, { r: 0.53, g: 0.8, b: 0.92, a: 1.0 },
                (w, h) => {
                    return [w, h]
                });
                renderpassCanvas.addSwapChain();
            new RenderTarget(renderpassScreen, "bgra8unorm");
            const gRenderTarget = new RenderTarget(renderpassScreen, "bgra8unorm", GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED,1);
            const gRenderTarget2 = new RenderTarget(renderpassScreen, "rgba32float", GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED);
            //@ts-ignore
            window.printRenderTarget = () => {
                gRenderTarget.toBitmap()
            }
            //@ts-ignore
            window.printRenderTarget2 = () => {
                gRenderTarget2.toBitmap()
            }

            const renderpassWater = new RenderPass(gpu, 1, true, { width: this.canvasElem.width, height: this.canvasElem.height }, { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }, (w, h) => [w, h], GPUTextureUsage.SAMPLED)
            new RenderTarget(renderpassWater, "bgra8unorm", GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED);
            

            this.BindGroupCanvas = () => gpu.createBindGroup(gpu.BindGroupLayoutCanvas,
                {
                    binding: 0,
                    resource: canvasSampler
                },
                {
                    binding: 1,
                    resource: gRenderTarget.view
                },
                {
                    binding: 2,
                    resource: gRenderTarget2.view
                });
            
            return [
                renderpassCanvas,
                renderpassScreen,
                renderpassWater
            ]
        });
        this.progress = 6;
        const shaders = ['simple.vert.wgsl', 'simple.frag.wgsl',
            'water.vert.wgsl', 'water.frag.wgsl', 'ground.vert.wgsl', 'ground.frag.wgsl', 'sun.vert.wgsl', 'sun.frag.wgsl', 'color.frag.wgsl',
            'plane.vert.wgsl', 'helper2.vert.wgsl',
            'terrain/calculatePlaneIndices.comp.wgsl', 'terrain/calculateNormals.comp.wgsl', 'terrain/calculatePlaneHeights.comp.wgsl',
            'terrain/CreateGroundFromHeightMap.comp.wgsl', 'terrain/createTerrainTexture.comp.wgsl',
            'grass/getHeightAtCoordinates.comp.wgsl', 'grass/grass.vert.wgsl', 'canvas.vert.wgsl', 'texture.frag.wgsl'];
        await Promise.all(shaders.map(async u => {
            const compiled = await (await fetch('/shaders/wgsl/' + u)).text();
            gpu.shaderModules.set(u, device.createShaderModule({ code: compiled }));
        }));

        this.progress = 10;

        const projectionmatrixBuffer = new SharedArrayBuffer(16 * 4);
        const projectionmatrix = new Float32Array(projectionmatrixBuffer);
        this.progress = 13;

        const terraEngine = await Engine.initEngine(gpu, DB, this.canvasElem);
        this.progress = 15;


        window.engine = terraEngine;
        const mainCamera = new TerraCamera(gpu.renderPassScreen, projectionmatrixBuffer, gpu, terraEngine)
        this.progress = 16;

        const camera = new ArcRotateCamera(0, 0, 10, terraEngine, mainCamera);
        this.progress = 17;
        camera.attachControl();

        this.progress = 18;

        const waterCamera = new TerraCamera(gpu.renderPassWater, projectionmatrixBuffer, gpu, terraEngine, false, mainCamera);
        waterCamera.beforeViewUpdate.add((position, target) => {
            position[1] -= (position[1] - 3) * 2;
            target[1] = -target[1];
        });
        //@ts-ignore
        const TerraCameras = [mainCamera, waterCamera]
        const timeAndDeltaBuffer = new ArrayBuffer(8);
        const timeView = new Uint32Array(timeAndDeltaBuffer, 0, 1);
        const deltaView = new Float32Array(timeAndDeltaBuffer, 4, 1);

        this.progress = 19;



        const mainScene = new Scene('main', gpu, terraEngine, [mainCamera, waterCamera], (terrascene) => {
            let sun = new Sun2(terrascene);
            // Initial scene objects here

            const sea = new Sea(terrascene);
            //new testPlane(terrascene);

            const b = new Box(terrascene);
            b.update(scale => scale.set([200, 200, 200]));

            //@ts-ignore
            const human = new Human(terrascene)

            const ready = new Promise((res, rej) => {
                const terrainInited = Terrain.loadFromTexture(terrascene);
                terrainInited.then(async r => {

                    const ground = r[0];
                    res([ground, sea])
                    const gpuBuffer = await r[1];
                    this.progress = 76;


                    const commandEncoder = device.createCommandEncoder({});
                    this.progress = 80;

                    let bufferView: GPUBufferCopyView = {
                        buffer: gpuBuffer,
                        bytesPerRow: ground.textureSize[0] * 4,
                        rowsPerImage: 0,
                        offset: 0,
                    };
                    this.progress = 85;


                    commandEncoder.copyBufferToTexture(bufferView,
                        {
                            texture: ground.texture,
                            origin: {
                                x: 0,
                                y: 0,
                                z: Math.max(-1, 0)
                            },
                            mipLevel: 0,
                        }, ground.textureExtent);
                    this.progress = 90;


                    device.queue.submit([commandEncoder.finish()]);
                    this.progress = 95;

                    bufferView.buffer.destroy();
                    this.progress = 100;

                    console.debug("Progress 100");
                }).catch(rej);
                PlantsUI.plantsMesh = new Plants(terrascene, terrainInited);
            })

            DB.then(DB => {
                DB.transaction("save").objectStore("save").get(0).onsuccess = async (evt) => {

                    if ((evt.target as IDBRequest).result) {

                        let restored = ((evt.target as IDBRequest).result as savedCamera).camera;
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
                    let l = new LazyEval(() => {
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
            })
            return [sun.bufferOffsetBytes, ready];
        });
        const debugscene = new Scene('static', gpu, terraEngine, [mainCamera], (scene) => {
            const sun = new PositionNode(scene.engine);
            sun.translation.set([0, 1, 0]);
            sun.customData.set([0, 0, 0, 1]) //shadow to 1 (no shadow)
            return [sun.bufferOffsetBytes]
        });

        const b2 = new Box(debugscene);
        b2.update(scale => scale.set([200, 200, 200]));
        b2.setTranslationX(500);


        let renderFrame: number = 0;
        let resizeHandler = 0;

        let curSecond = (Date.now() / 500) | 0;
        let framecount = 0;
        let msPerFrame = 0;
        let startTime = 0;
        const me = this;
        const vertex = gpu.shaderModules.get('canvas.vert.wgsl')
        const fragment = gpu.shaderModules.get('texture.frag.wgsl')
        if (!vertex || !fragment)
            throw ('Missing shader')

        //@ts-ignore
        const canvasPipeline = gpu.rootLayout.addRenderPipeline({
            label: 'canvas',
            primitiveTopology: 'triangle-list',
            depthStencilState: {
                depthWriteEnabled: false,
                depthCompare: "less",
                format: "depth24plus-stencil8",
            },
            vertexStage: {
                module: vertex,
                entryPoint: "main",
            },
            fragmentStage: {
                module: fragment,
                entryPoint: "main"
            },
        }/*,() => {
            console.log('refresh texture');
            return [{
            binding: 0,
            resource: gpu.canvasSampler
        },
        {
            binding: 1,
            resource: gpu.renderPassWater.renderTargets[0]!.view //this.renderPassWater.renderTargets[0]!.view
        }]}*/);

        new TerraNodeGPU<DrawableSimple>(terraEngine,canvasPipeline,6,(node) => node.renderPipeline.addDrawableSimple(undefined, new Set([gpu.renderPassCanvas]),node))
        function renderLoop(time: DOMHighResTimeStamp) {
            msPerFrame = performance.now() - startTime;
            startTime = performance.now();

            const nowSecond = (Date.now() / 500) | 0;
            if (nowSecond !== curSecond) {
                me.rendertime = framecount * 2;
                me.msPerFrame = msPerFrame
                curSecond = nowSecond;
                framecount = 0;
            }
            framecount++;
            //performance.mark('renderloopStart');


            gpu.onRenders2.forEach(or => {
                let buff = or();
                if (buff)
                    gpu.pendingCommandBuffers.push(buff);
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

            /*const passEncoder = renderEncoder.beginRenderPass(gpu.renderPassCanvas.GPURenderPassDescriptor);
            passEncoder.setPipeline(canvasPipeLine);
            passEncoder.draw(6, 1, 0, 0);

            passEncoder.endPass();
*/

            TerraCameras.forEach(camera => {
                camera.render(renderEncoder)
            });


            gpu.renderPassCanvas.render(renderEncoder, me.BindGroupCanvas, gpu.rootLayout);

            gpu.pendingCommandBuffers.push(renderEncoder.finish())
            gpu.device.queue.submit(gpu.pendingCommandBuffers);
            gpu.pendingCommandBuffers.length = 0;
            renderFrame = window.requestAnimationFrame(renderLoop);

        }
        
        const maxResolution= {
            width: 1920,
            height: 1080
        }
        let ro = new window.ResizeObserver((entries) => {
            window.cancelAnimationFrame(renderFrame)
            clearTimeout(resizeHandler);
            resizeHandler = setTimeout(async () => {
                const aspectRatio = entries[0]!.contentRect.width / entries[0]!.contentRect.height
                this.canvasElem.width = Math.min((entries[0]!.contentRect.width | 0) * window.devicePixelRatio, maxResolution.width);
                
                this.canvasElem.height = this.canvasElem.width/aspectRatio
                
                if(this.canvasElem.height > maxResolution.height) {
                    this.canvasElem.height=maxResolution.height;
                    this.canvasElem.width = this.canvasElem.height*aspectRatio;
                }

               gpu.renderPasses.forEach(renderPass => {
                    renderPass.onResize(this.canvasElem.width, this.canvasElem.height)
                    renderPass.renderPipelines.forEach((rpVariant, rp) => rpVariant.renderpipeline = renderPass.decoratePipeline(rp.renderPipelineDescriptor))
                    renderPass.bundles.length = 0;
               })

                //Create projection matrix
                //min view distance
                let n = 1;
                //max view distance
                let f = 100000;
                //field of view?
                const fov = 0.8
                let t = 1.0 / (Math.tan(fov * 0.5));
                let a = t;
                let b = t * aspectRatio;
                let c = (f + n) / (f - n);
                let d = -2.0 * f * n / (f - n);

                projectionmatrix.set([
                    a, 0.0, 0.0, 0.0,
                    0.0, b, 0.0, 0.0,
                    0.0, 0.0, c, 1.0,
                    0.0, 0.0, d, 0.0,
                ]);

                renderFrame = window.requestAnimationFrame(renderLoop);
            }, 500)
        });
        ro.observe(this.canvasElem.parentElement!)


        this.progress = 20;


        let webSocket = new WebSocket('ws://localhost:8081');
        webSocket.onopen = async () => {
            console.log('websocket onopen');
            // progelem.value = 30;
            try {

                webSocket.send(JSON.stringify({ action: 'init', data: { /* userinfo: state.userInfo, ticks */ } }));
                webSocket.onmessage = (e) => {
                    let msg = JSON.parse(e.data);
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
            this.progresElem.textContent = e.name + ' ' + e.message;

        });
    }
    set progress(value: number) {
        this.progressBar.value = value;
        this.progresElem.textContent = value.toFixed(0);
        if (value === 100)
            this.progressBar.parentNode?.parentNode?.removeChild(this.progressBar.parentNode);
    }
    render() {
        return <div style="height:100%">
            {this.canvasElem}
            {this.toolsContainer}
            <div id="fps">@(rendertime) @(msPerFrame)</div>
            {this.gameState}
            <div style="position:absolute;top:30%; background-color:white;width:100%;text-align:center ">
                {this.progresElem}
                <br />
                {this.progressBar}
            </div>
        </div >
    }
}

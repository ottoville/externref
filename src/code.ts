
import type { WorldScene } from "./world/scene.js";
//import * as BABYLON from "./lib/babylon/index.js"
import type { loginProvider, DotNet } from "./types/interfaces/index.js";
import type { Engine } from "./lib/babylon/Engines/engine";
import type { WebGPUEngine, WebGPUEngineOptions } from "./lib/babylon/Engines/webgpuEngine";
import { GPUScene } from "./GPUScene.js";
import { TerraScene } from "./TerraScene.js";
import { Sun2 } from "./world/sun2.js";
import { Plants } from "./plants/Plants.js";
import { UITAB, UITABClassLike } from "./UITAB.js";
import { PlantsUI } from "./tools/plantsUI.js";
import { CameraTAB } from "./tools/camera.js";
import { BuildingsUI } from "./tools/buildings.js";
import { TerrainTool } from "./tools/Terrain.js";
import { Zones } from "./tools/zones.js";
import { Terrain } from "./world/terrain.js";
import { ArcRotateCamera } from "./lib/babylon/Cameras/arcRotateCamera.js";
import { testPlane, testPlaneNormals } from "./world/tests/testPlane.js";

//import  DB from "./DB.js";

//let zones: Zone[] = [];







/*let DB: Promise<IDBDatabase> = new Promise(function (res, rej) {
    var IDB = window.indexedDB.open("City", 2);
    IDB.onupgradeneeded = function () {
        // Save the IDBDatabase interface 
        var db = this.result;
        // Create an objectStore for this database
        if (db.version < 2) {
            db.createObjectStore("zones", { keyPath: "id", autoIncrement: true });
        }
        db.createObjectStore("save", { keyPath: "id", autoIncrement: true });
    };
    IDB.onsuccess = function (event) {
        res(this.result);
    }
})*/

declare global {
    interface Window {
        scene: WorldScene;
        login: (e: PointerEvent, method: "facebook" | "anomyous") => void;
        Wasm: any
    }
}
declare var BlazorRouter: DotNet.BlazorInstance;
let loadelem = document.body.appendChild(document.createElement("div"));
//let progelem = loadelem.appendChild(document.createElement("progress"))
loadelem.style.position = 'absolute';
loadelem.style.right = '30%';
loadelem.style.top = '30%';
loadelem.style.display = 'none';
var loginPromise: Promise<loginProvider> = new Promise<loginProvider>(login => {
    window.login = async (e: PointerEvent, method: "facebook" | "anomyous") => {
        loadelem.style.display = 'block';
        // blazor.invokeMethod('setProgress', 0);
        //progelem.max = 100;
        //progelem.value = 0;
        if (method == "facebook") {
            FB.login(() => {
                FB.init({
                    appId: '417236772473746',
                    cookie: true,
                    xfbml: true,
                    version: 'v4.0'
                });
                FB.AppEvents.logPageView();
                FB.Event.subscribe('auth.login', async (response) => {
                    //progelem.value = 5;
                    (await BlazorRouter).invokeMethod('startGame');
                    //progelem.value = 10;
                    login({ provider: 'facebook', accessToken: response.authResponse.accessToken, userID: response.authResponse.userID, pointerEvent: e });
                });
                FB.getLoginStatus(async (response) => {
                    if (response.status === 'connected') {
                        // progelem.value = 5;
                        (await BlazorRouter).invokeMethod('startGame');
                        // progelem.value = 10;
                        login({ provider: 'facebook', accessToken: response.authResponse.accessToken, userID: response.authResponse.userID, pointerEvent: e });
                    }
                });
            }, { scope: "email" });
        } else {
            //progelem.value = 5;
            (await BlazorRouter).invokeMethod('startGame');
            //progelem.value = 10;
            if (typeof (localStorage.accessToken) === 'undefined')
                localStorage.accessToken = new Date().getTime().toString() + navigator.userAgent;
            login({ provider: 'anomyous', accessToken: localStorage.accessToken, pointerEvent: e });
        }
    }
});


(<any>window).initCanvas = async function (blazor: DotNet.BlazorInstance, ticks: number, canvas: HTMLCanvasElement) {
    try {
        let [WasmModuleP, EngineModuleP] = ['./rustwasm/hello_wasm.js', './lib/babylon/Engines/webgpuEngine.js'].map(url => import(url));
        if (canvas.dataset.inited === "true")
            return;
        canvas.dataset.inited = "true";


        //  const cache2 = await caches.open('compiledShaders');
        //try {
        let WasmModule = await WasmModuleP;
        blazor.invokeMethod('setProgress', 2);
        let EngineModule = await EngineModuleP;
        var engine: WebGPUEngine = new EngineModule.WebGPUEngine(<HTMLCanvasElement>canvas, { antialiasing: false } as WebGPUEngineOptions);
        let terrascene: TerraScene;
        const scenePromise = new Promise<WorldScene>(async (sceneInitedred, sceneInitedrej) => {
            terrascene = new TerraScene(window, async () => {
                // Initial scene objects here

                const tools: Map<string, UITABClassLike> = new Map();


                new Sun2(terrascene);
                /*new testPlane(terrascene);
                new testPlaneNormals(terrascene);*/
                const terrainInited = Terrain.loadFromTexture(terrascene);
                terrainInited.then(async r => {
                    const ground = r[0];
                    const gpuBuffer = await r[1];
                    blazor.invokeMethod('setProgress', 75);


                    //internaltex._sphericalPolynomial = webglEngineTexture._sphericalPolynomial;
                    const commandEncoder = device.createCommandEncoder({});
                    blazor.invokeMethod('setProgress', 80);

                    let bufferView: GPUBufferCopyView = {
                        buffer: gpuBuffer,
                        bytesPerRow: ground.textureSize[0] * 4,
                        rowsPerImage: 0,
                        offset: 0,
                    };
                    blazor.invokeMethod('setProgress', 85);


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
                    blazor.invokeMethod('setProgress', 90);


                    device.defaultQueue.submit([commandEncoder.finish()]); //Copy would overflow the buffer
                    blazor.invokeMethod('setProgress', 95);
                    bufferView.buffer.destroy();
                    blazor.invokeMethod('setProgress', 100);
                    console.debug("Progress 100");
                })
                PlantsUI.plantsMesh = new Plants(terrascene.gpuscene, terrainInited);
                tools.set('Plants', PlantsUI);
                tools.set('Camera', CameraTAB);
                tools.set('Buildings', BuildingsUI);
                tools.set('TerrainTool', TerrainTool);
                tools.set('Zones', Zones);

                //@ts-expect-error
                window.activateMenu = async (name: string) => {
                    try {
                        let tool: UITABClassLike | undefined;
                        if (tool = tools.get(name)) {
                            tool.instance = new tool(this, (await terrainInited)[0], (await scenePromise).camera);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
                //@ts-expect-error
                window.deActivateMenu = async (name: string) => {
                    try {
                        let tool: UITABClassLike | undefined;
                        if (tool = tools.get(name)) {
                            tool.instance?.destroy();
                            tool.instance = null;
                        } else
                            throw (new Error('Tool ' + name + ' not found'))
                    } catch (e) {
                        console.error(e);
                    }
                }
                //@ts-expect-error
                window.invokeMenu = async (name: string, method: string) => {
                    try {
                        let tool: UITABClassLike | undefined;
                        if (tool = tools.get(name)) {
                            let instance: UITAB | null;
                            if (instance = tool.instance) {
                                //@ts-ignore
                                instance[method]();
                            } else
                                throw (new Error('Method ' + method + ' was not found from tool ' + name + ''))
                        } else
                            throw (new Error('Tool ' + name + ' not found'))
                    } catch (e) {
                        console.error(e);
                    }
                }
            });
            terrascene.onRenderStart = async () => {
                const gpuscene = await terrascene.gpuscenePromise
                const scene = await scenePromise;
                let rloop = function (time: DOMHighResTimeStamp) {

                    // Start new frame
                    //engine.beginFrame();
                    //@ts-ignore
                    engine._measureFps();
                    //@ts-ignore
                    engine.onBeginFrameObservable.notifyObservers(engine);
                    //@ts-ignore
                    engine._renderEncoder = engine._device.createCommandEncoder(engine._renderEncoderDescriptor);
                    // Some PGs are using color3...
                    if (scene.clearColor.a === undefined) {
                        scene.clearColor.a = 1;
                    }
                    //@ts-ignore
                    engine._mainColorAttachments[0].loadValue = scene.clearColor;
                    //@ts-ignore
                    engine._mainDepthAttachment.depthLoadValue = engine._clearDepthValue;
                    //@ts-ignore
                    engine._mainDepthAttachment.stencilLoadValue = engine._clearStencilValue;
                    //@ts-ignore
                    //engine._startMainRenderPass();
                    // Resolve in case of MSAA
                    //@ts-ignore
                    if (engine._options.antialiasing) {
                        //@ts-ignore
                        engine._mainColorAttachments[0].resolveTarget = engine._swapChain.getCurrentTexture().createView();
                    }
                    else {
                        //@ts-ignore
                        //engine._mainColorAttachments[0].attachment = engine._swapChain.getCurrentTexture().createView();
                        engine._mainColorAttachments[0].attachment = engine._swapChain.getCurrentTexture().createView();
                    }
                    //@ts-ignore
                    engine._currentRenderPass = engine._renderEncoder.beginRenderPass({
                        //@ts-ignore
                        colorAttachments: engine._mainColorAttachments,
                        //@ts-ignore
                        depthStencilAttachment: engine._mainDepthAttachment
                    });

                    // scene.render();


                    //this._frameId++;

                    // Register components that have been associated lately to the scene.
                    //this._registerTransientComponents();

                    scene._activeParticles.fetchNewFrame();
                    //this._totalVertices.fetchNewFrame();
                    scene._activeIndices.fetchNewFrame();
                    scene._activeBones.fetchNewFrame();
                    //this._meshesForIntersections.reset();
                    scene.resetCachedMaterial();

                    scene.onBeforeAnimationsObservable.notifyObservers(scene);

                    // Actions
                    //if (this.actionManager) {
                    //    this.actionManager.processTrigger(Constants.ACTION_OnEveryFrameTrigger);
                    //}

                    // Animations
                    scene.animate();

                    // Before camera update steps
                    for (let step of scene._beforeCameraUpdateStage) {
                        step.action();
                    }

                    // Update Cameras
                    if (scene.activeCameras.length > 0) {
                        for (var cameraIndex = 0; cameraIndex < scene.activeCameras.length; cameraIndex++) {
                            let camera = scene.activeCameras[cameraIndex];
                            camera.update();
                            if (camera.cameraRigMode !== 0) {
                                // rig cameras
                                for (var index = 0; index < camera._rigCameras.length; index++) {
                                    camera._rigCameras[index].update();
                                }
                            }
                        }
                    } else if (scene.activeCamera) {
                        scene.activeCamera.update();
                        if (scene.activeCamera.cameraRigMode !== 0) {
                            // rig cameras
                            for (var index = 0; index < scene.activeCamera._rigCameras.length; index++) {
                                scene.activeCamera._rigCameras[index].update();
                            }
                        }
                    }

                    // Before render
                    scene.onBeforeRenderObservable.notifyObservers(scene);

                    // Customs render targets
                    scene.onBeforeRenderTargetsRenderObservable.notifyObservers(scene);
                    var currentActiveCamera = scene.activeCamera;
                    if (scene.renderTargetsEnabled) {
                        //Tools.StartPerformanceCounter("Custom render targets", this.customRenderTargets.length > 0);
                        //this._intermediateRendering = true;
                        for (var customIndex = 0; customIndex < scene.customRenderTargets.length; customIndex++) {
                            var renderTarget = scene.customRenderTargets[customIndex];
                            if (renderTarget._shouldRender()) {
                                //this._renderId++;

                                scene.activeCamera = renderTarget.activeCamera || scene.activeCamera;

                                if (!scene.activeCamera) {
                                    throw new Error("Active camera not set");
                                }

                                // Viewport
                                engine.setViewport(scene.activeCamera.viewport);

                                // Camera
                                scene.updateTransformMatrix();
                                renderTarget.render(currentActiveCamera !== scene.activeCamera, scene.dumpNextRenderTargets);

                            }
                        }
                        //Tools.EndPerformanceCounter("Custom render targets", this.customRenderTargets.length > 0);
                        //this._intermediateRendering = false;
                        //this._renderId++;
                    }

                    // Restore back buffer
                    scene.activeCamera = currentActiveCamera;
                    //this._bindFrameBuffer();
                    scene.onAfterRenderTargetsRenderObservable.notifyObservers(scene);

                    for (let step of scene._beforeClearStage) {
                        step.action();
                    }

                    // Clear
                    if (scene.autoClearDepthAndStencil || scene.autoClear) {

                        engine.clear(scene.clearColor, scene.autoClear || scene.forceWireframe || scene.forcePointsCloud, scene.autoClearDepthAndStencil, scene.autoClearDepthAndStencil);
                    }

                    // Collects render targets from external components.
                    // for (let step of this._gatherRenderTargetsStage) {
                    //    step.action(this._renderTargets);
                    //  }

                    // Multi-cameras?
                    if (scene.activeCameras.length > 0) {
                        for (var cameraIndex = 0; cameraIndex < scene.activeCameras.length; cameraIndex++) {
                            if (cameraIndex > 0) {
                                (engine as Engine).clear(null, false, true, true);
                            }
                            //@ts-ignore
                            scene._processSubCameras(scene.activeCameras[cameraIndex]);
                            //@ts-ignore
                            new Float32Array(TerraScene.instance.viewProjection).set(scene._transformMatrix.m);
                            new Float32Array(TerraScene.instance.view).set(scene.activeCameras[cameraIndex].getViewMatrix().m);
                            new Float32Array(TerraScene.instance.projection).set(scene.activeCameras[cameraIndex].getProjectionMatrix().m);

                            //@ts-ignore
                            const renderPass = (engine as WebGPUEngine)._bundleEncoder || (engine as WebGPUEngine)._currentRenderPass!;


                            TerraScene.instance.render(renderPass as GPURenderPassEncoder, time);


                        }
                    } else {
                        if (!scene.activeCamera) {
                            throw new Error("No camera defined");
                        }

                        //this._processSubCameras(this.activeCamera);
                        //@ts-ignore
                        scene._processSubCameras(this.activeCamera)

                    }

                    // Intersection checks
                    //this._checkIntersections();

                    // Executes the after render stage actions.
                    for (let step of scene._afterRenderStage) {
                        step.action();
                    }

                    // After render
                    if (scene.afterRender) {
                        scene.afterRender();
                    }

                    scene.onAfterRenderObservable.notifyObservers(scene);

                    // Cleaning
                    if (scene._toBeDisposed.length) {
                        for (var index = 0; index < scene._toBeDisposed.length; index++) {
                            var data = scene._toBeDisposed[index];
                            if (data) {
                                data.dispose();
                            }
                        }

                        scene._toBeDisposed = [];
                    }

                    if (scene.dumpNextRenderTargets) {
                        scene.dumpNextRenderTargets = false;
                    }

                    scene._activeBones.addCount(0, true);
                    scene._activeIndices.addCount(0, true);
                    scene._activeParticles.addCount(0, true);







                    //scene render ends


                    //@ts-ignore
                    if (engine._currentRenderPass) {
                        //@ts-ignore
                        engine._currentRenderPass.endPass();
                        //@ts-ignore
                        engine._currentRenderPass = null;
                    }
                     //@ts-ignore
                    gpuscene.device.defaultQueue.submit([engine._renderEncoder.finish()]);
                    engine.onEndFrameObservable.notifyObservers(engine);

                    window.requestAnimationFrame(rloop);

                }
                window.requestAnimationFrame(rloop);
            }
            const adapter = await terrascene.adapter;

            //@ts-ignore
            engine._adapter = adapter;
            const device = await terrascene.device
            
            GPUScene.canvas = canvas;



            blazor.invokeMethod('setProgress', 4);

            blazor.invokeMethod('setProgress', 9);
            const WorldSceneModule = await import('./world/scene.js');

            blazor.invokeMethod('setProgress', 10);
            /*   } catch (e) {
                   console.log('error');
                   console.error(e);
               }*/
            WasmModule.default().then(() => window.Wasm = WasmModule);
            //progelem.value = 20;
            // var canvas = document.getElementById("renderCanvas");

            blazor.invokeMethod('setProgress', 11);
            // var engine = new EngineModule.Engine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });

            //await engine.initAsync();





            //await Promise.all(shaderPutsC);
            //@ts-ignore
            //engine._glslang = glslang;
            blazor.invokeMethod('setProgress', 12);
            //@ts-ignore
            engine._device = device;
            //@ts-ignore
            engine._initializeLimits();
            blazor.invokeMethod('setProgress', 13);
            //@ts-ignore
            //engine._initializeContextAndSwapChain();
            engine._context = canvas.getContext('gpupresent') as unknown as GPUCanvasContext;
            /*
            //@ts-ignore
            engine._swapChain = engine._context.configureSwapChain({
                //@ts-ignore
                device: engine._device,
                //@ts-ignore
                format: engine._options.swapChainFormat!,
                //@ts-ignore
                usage: GPUTextureUsage.OUTPUT_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            });*/


            /*let width = this._renderingCanvas ? this._renderingCanvas.clientWidth : window.innerWidth;
            let height = this._renderingCanvas ? this._renderingCanvas.clientHeight : window.innerHeight;
            engine.setSize(width, height)*/
            //@ts-ignore
            engine._swapChain = engine._context.configureSwapChain({
                //@ts-ignore
                device: engine._device,
                format: "bgra8unorm"
            });

            engine.resize();



            blazor.invokeMethod('setProgress', 15);

            //document.getElementById('loading').style.display = 'block';
            //loadingBar.value = 10;

            let webSocket = new WebSocket('ws://localhost:8081');
            webSocket.onopen = async () => {
                console.log('websocket onopen');
                blazor.invokeMethod('setProgress', 20);
                // progelem.value = 30;
                try {
                    sceneInitedred(new WorldSceneModule.WorldScene(engine, await loginPromise, blazor, ticks, canvas, device, webSocket));
                } catch (e) {
                    sceneInitedrej(e);
                }
            }
            webSocket.onerror = async () => {
                console.log('websocket onerror');
                blazor.invokeMethod('setProgress', 20);
                try {
                    //blazor.invokeMethod('setProgress', 20);
                    sceneInitedred(new WorldSceneModule.WorldScene(engine, await loginPromise, blazor, ticks, canvas, device));
                } catch (e) {
                    sceneInitedrej(e);
                }
            }
        });
        const scene = await scenePromise;
        window.scene = scene;
        scene.collisionsEnabled = true;
        scene.autoClear = false;
        scene.autoClearDepthAndStencil = false;


  


        // Resize
        window.addEventListener("resize", function () {
            scene.getEngine().resize();
        });
        for (let i = 0; i < gameControlsUI.length; i++) {
            gameControlsUI[i].classList.remove('hidden');
        }
    } catch (e) {
        console.error('creating terrain failed', e);
        //progelem.parentNode.textContent = e;
        blazor.invokeMethod('setProgress', 0);
        blazor.invokeMethod('setProgressError', e.name + ' ' + e.message);

    }
}

let gameControlsUI = document.getElementsByClassName('gameControl');

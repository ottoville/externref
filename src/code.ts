
import type { WorldScene } from "./world/scene.js";
//import * as BABYLON from "./lib/babylon/index.js"
import type { loginProvider, DotNet } from "./types/interfaces/index.js";
import type { IEffectCreationOptions, Effect } from "./lib/babylon/Materials/effect.js";
import type { Engine } from "./lib/babylon/Engines/engine.js";
import type { EffectFallbacks } from "./lib/babylon/Materials/effectFallbacks.js";
import type { WebGPUEngine, WebGPUEngineOptions } from "./lib/babylon/Engines/webgpuEngine.js";

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
        sceneInited: Promise<WorldScene>;
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

window.sceneInited = new Promise<WorldScene>((sceneInitedred, sceneInitedrej) => {
    (<any>window).initCanvas = async function (blazor: DotNet.BlazorInstance, ticks: number, canvas: HTMLCanvasElement) {


        let [WasmModule, EngineModule, EffectModule, WorldSceneModule] = await Promise.all(['./rustwasm/hello_wasm.js', './lib/babylon/Engines/webgpuEngine.js', './TerraEffect.js', './world/scene.js'].map(url => import(url)))

        /*let WasmModule = await import('./rustwasm/hello_wasm.js');
        blazor.invokeMethod('setProgress', 2);
        let EngineModule = await import('./lib/babylon/Engines/webgpuEngine.js');
        blazor.invokeMethod('setProgress', 4);
        let EffectModule = await import('./TerraEffect.js');
        blazor.invokeMethod('setProgress', 9);
        let WorldSceneModule = await import('./world/scene.js');*/

        blazor.invokeMethod('setProgress', 10);


        WasmModule.default().then(() => window.Wasm = WasmModule);
        //progelem.value = 20;
        // var canvas = document.getElementById("renderCanvas");
        if (canvas.dataset.inited === "true")
            return;
        canvas.dataset.inited = "true";
        blazor.invokeMethod('setProgress', 11);
        // var engine = new EngineModule.Engine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });
        var engine: WebGPUEngine = new EngineModule.WebGPUEngine(<HTMLCanvasElement>canvas, { antialiasing: false } as WebGPUEngineOptions);
        //await engine.initAsync();

        //@ts-ignore
        engine._glslang = await new Promise((res, rej) => {
            let glslangOptions = {
                ...EngineModule.WebGPUEngine._glslangDefaultOptions
            };
            if (glslangOptions.glslang)
                res(glslangOptions.glslang);
            if ((window as any).glslang)
                res((window as any).glslang(glslangOptions!.wasmPath));

            let script = document.createElement('script');
            script.onload = () => res((window as any).glslang(glslangOptions!.wasmPath));
            script.onerror = rej;
            script.src = glslangOptions.jsPath;
            document.head.appendChild(script);
        })
        blazor.invokeMethod('setProgress', 12);
        //@ts-ignore
        engine._adapter = await navigator.gpu!.requestAdapter(engine._options);
        //@ts-ignore
        engine._device = await engine._adapter.requestDevice(engine._options.deviceDescriptor);
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

        engine.createEffect = function (baseName: any, attributesNamesOrOptions: string[] | IEffectCreationOptions, uniformsNamesOrEngine: string[] | Engine, samplers?: string[], defines?: string, fallbacks?: EffectFallbacks,
            onCompiled?: Nullable<(effect: Effect) => void>, onError?: Nullable<(effect: Effect, errors: string) => void>, indexParameters?: any): Effect {
            const vertex = baseName.vertexElement || baseName.vertex || baseName;
            const fragment = baseName.fragmentElement || baseName.fragment || baseName;

            const name = vertex + "+" + fragment + "@" + (defines ? defines : (<IEffectCreationOptions>attributesNamesOrOptions).defines);
            const shader = this._compiledShaders[name];
            if (shader) {
                return <unknown>new EffectModule.TerraEffect(baseName, attributesNamesOrOptions, uniformsNamesOrEngine, samplers, this, defines, fallbacks, onCompiled, onError, indexParameters, name, shader.sources) as Effect;
            }
            else {
                return <unknown>new EffectModule.TerraEffect(baseName, attributesNamesOrOptions, uniformsNamesOrEngine, samplers, this, defines, fallbacks, onCompiled, onError, indexParameters, name) as Effect;
            }
        }

        //document.getElementById('loading').style.display = 'block';
        //loadingBar.value = 10;
        let webSocket = new WebSocket('ws://localhost:8081');
        webSocket.onopen = async () => {
            console.log('websocket onopen');
            blazor.invokeMethod('setProgress', 20);
            // progelem.value = 30;
            sceneInitedred(new WorldSceneModule.WorldScene(engine, await loginPromise, blazor, ticks, canvas, webSocket));
        }
        webSocket.onerror = async () => {
            console.log('websocket onerror');

            try {
                //blazor.invokeMethod('setProgress', 20);
                sceneInitedred(new WorldSceneModule.WorldScene(engine, await loginPromise, blazor, ticks, canvas));
            } catch (e) {
                console.error('creating terrain failed', e);
                //progelem.parentNode.textContent = e;
                blazor.invokeMethod('setProgress', 0);
                blazor.invokeMethod('setProgressError', e.name + e.message);
            }
        }
    }
});

window.sceneInited.then(async scene => {
    await scene.terrainReady;
    window.scene = scene;
    scene.collisionsEnabled = true;
    scene.autoClear = false;
    scene.autoClearDepthAndStencil = false;
    let engine = scene.getEngine() as WebGPUEngine;
    let context = engine.getRenderingCanvas().getContext('gpupresent') as unknown as GPUCanvasContext;
    let rloop = function () {
        var shouldRender = true;

        if (shouldRender) {
            
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

            scene.render();
            // Present
            //engine.endFrame();
             //@ts-ignore
            //engine._endRenderPass();
            if (engine._currentRenderPass) {
                //@ts-ignore
                engine._currentRenderPass.endPass();
                //@ts-ignore
                engine._currentRenderPass = null;
            }
             //@ts-ignore
            engine._device.defaultQueue.submit([engine._renderEncoder.finish()]);
            engine.onEndFrameObservable.notifyObservers(engine);

        }
        window.requestAnimationFrame(rloop);

    }
    window.requestAnimationFrame(rloop);


    // Resize
    window.addEventListener("resize", function () {
        scene.getEngine().resize();
    });
    for (let i = 0; i < gameControlsUI.length; i++) {
        gameControlsUI[i].classList.remove('hidden');
    }
    //document.getElementById('loading').style.display = 'none';
});

let gameControlsUI = document.getElementsByClassName('gameControl');

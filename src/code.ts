
import type { loginProvider, DotNet, savedCamera } from "./types/interfaces/index.js";
import { Plants } from "./plants/Plants.js";
import { UITAB, UITABClassLike } from "./UITAB.js";
import { PlantsUI } from "./tools/plantsUI.js";
import { CameraTAB } from "./tools/camera.js";
import { BuildingsUI } from "./tools/buildings.js";
import { TerrainTool } from "./tools/Terrain.js";
import { Zones } from "./tools/zones.js";
import { Terrain } from "./world/terrain.js";
//import { testPlane, testPlaneNormals } from "./world/tests/testPlane.js";
import { Sea } from "./world/water.js";
import { LazyEval } from "./LazyEval.js";
import { GPU } from "./GPU.js";
import { RenderPass, RenderPassCanvas } from "./GPU/RenderPass.js";
import { Box } from "./GPU/Meshes/Box.js";
import { TerraCamera } from "./TerraCamera.js";
import { Engine } from "./engine.js";
import { Sun2 } from "./world/sun2.js";
import { PositionNode } from "./TerraNode.js";
import { Scene } from "./Scene.js";
import { ArcRotateCamera } from "./ArcRotateCamera.js";

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
        engine: Engine;
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
        blazor.invokeMethod('setProgress', 2);
        if (canvas.dataset.inited === "true")
            return;
        canvas.dataset.inited = "true";
        blazor.invokeMethod('setProgress', 3);
        //  const cache2 = await caches.open('compiledShaders');
        //try {

        blazor.invokeMethod('setProgress', 4);
        const adapter = await window.navigator.gpu!.requestAdapter();
        blazor.invokeMethod('setProgress', 5);
        if (!adapter)
            throw ('No adapter');
        const device = await adapter.requestDevice();
        if (!device)
            throw ('no GPU device');
        const gpuscene = new GPU(device, (gpu) => {
            return [
                new RenderPassCanvas(gpu, 4, true, canvas.width, canvas.height, { r: 0.53, g: 0.8, b: 0.92, a: 1.0 }, (w, h) => [w, h], undefined, canvas),
                new RenderPass(gpu, 1, false, canvas.width, canvas.height, { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }, (w, h) => [w, h], GPUTextureUsage.SAMPLED)
            ]
        });
        blazor.invokeMethod('setProgress', 6);

        const CACHE_NAME = 'terrasim-v1';
        let shadersP: Promise<{ [key: string]: string }> = fetch('/shaders/shaders.json').then(s => s.json());
        const cache = await caches.open(CACHE_NAME);
        blazor.invokeMethod('setProgress', 7);
        
        const shaders = ['simple.vert.wgsl', 'simple.frag.wgsl',
            'water.vert.wgsl', 'water.frag.wgsl', 'ground.vert.wgsl', 'ground.frag.wgsl', 'sun.vert.wgsl', 'sun.frag.wgsl', 'color.frag.wgsl',
            'terrain/calculatePlaneIndices.comp.wgsl'];
        await Promise.all(shaders.map(async u => {
            const compiled = await (await fetch('/shaders/wgsl/'+u)).text();
            gpuscene.shaderModules.set(u, device.createShaderModule({ code: compiled }));
        }));



        const glslang: { compileGLSL: (source: string, type: string) => Uint32Array } = await new Promise((res, rej) => {
            const glslangOptions = {
                jsPath: "https://preview.babylonjs.com/glslang/glslang.js",
                wasmPath: "https://preview.babylonjs.com/glslang/glslang.wasm",
                glslang: undefined
            };
            if ((window as any).glslang)
                res((window as any).glslang(glslangOptions!.wasmPath));

            let script = document.createElement('script');
            script.onload = () => res((window as any).glslang(glslangOptions!.wasmPath));
            script.onerror = rej;
            script.src = glslangOptions.jsPath;
            document.head.appendChild(script);
        });
        blazor.invokeMethod('setProgress', 8);
        const jsondata = await shadersP
        const shaderPuts: Promise<void>[] = [];

        for (var file in jsondata) {
            shaderPuts.push(cache.put(new Request('/shaders/' + file), new Response(jsondata[file])));
            //@ts-ignore
            if (jsondata[file].substr(0, 12) == '#version 450') {
                let type: string = 'vertex';
                if (file.substr(-5) == '.frag')
                    type = 'fragment';
                else if (file.substr(-5) == '.comp')
                    type = 'compute';
                //@ts-ignore
                const compiled = glslang.compileGLSL(jsondata[file], type);

                gpuscene.shaderModules.set(file, gpuscene.device.createShaderModule({
                    code: compiled,
                }));
            }
        }
        blazor.invokeMethod('setProgress', 9);
        await Promise.all(shaderPuts);
        blazor.invokeMethod('setProgress', 10);




        const projectionmatrixBuffer = new SharedArrayBuffer(16 * 4);
        const projectionmatrix = new Float32Array(projectionmatrixBuffer);
        blazor.invokeMethod('setProgress', 13);
        

        const terraEngine = await Engine.initEngine(gpuscene, DB, canvas);
        blazor.invokeMethod('setProgress', 15);


        window.engine = terraEngine;
        const mainCamera = new TerraCamera(gpuscene.renderPassScreen, projectionmatrixBuffer, gpuscene, terraEngine)
        blazor.invokeMethod('setProgress', 16);

        const camera = new ArcRotateCamera(0, 0, 10, terraEngine, mainCamera);
        blazor.invokeMethod('setProgress', 17);
        camera.attachControl();

        blazor.invokeMethod('setProgress', 18);

        const waterCamera = new TerraCamera(gpuscene.renderPassWater, projectionmatrixBuffer, gpuscene, terraEngine, false, mainCamera);
        waterCamera.beforeViewUpdate.add((position, target) => {
            position[1] -= (position[1] - 3) * 2;
            target[1] = -target[1];
        });
        const TerraCameras = [mainCamera, waterCamera]
        const timeAndDeltaBuffer = new ArrayBuffer(8);
        const timeView = new Uint32Array(timeAndDeltaBuffer, 0, 1);
        const deltaView = new Float32Array(timeAndDeltaBuffer, 4, 1);

        blazor.invokeMethod('setProgress', 19);


        new Scene('main', gpuscene, terraEngine, [mainCamera, waterCamera], (terrascene, sunBufferOffsetBytes) => {
            new Sun2(terrascene, sunBufferOffsetBytes);
            // Initial scene objects here

            const tools: Map<string, UITABClassLike> = new Map();

            const sea = new Sea(terrascene);
            //new testPlane(terrascene);

            const b = Box.create(terrascene);
            b.worldPosition.update(scale => scale.set([200, 200, 200]));
            /*new testPlaneNormals(terrascene);*/
            const terrainInited = Terrain.loadFromTexture(terrascene);
            terrainInited.then(async r => {
                const ground = r[0];
                const gpuBuffer = await r[1];
                blazor.invokeMethod('setProgress', 76);


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


                device.defaultQueue.submit([commandEncoder.finish()]);
                blazor.invokeMethod('setProgress', 95);
                bufferView.buffer.destroy();
                blazor.invokeMethod('setProgress', 100);
                console.debug("Progress 100");
            });
            PlantsUI.plantsMesh = new Plants(terrascene, terrainInited);
            tools.set('Plants', PlantsUI);
            tools.set('Camera', CameraTAB);
            //@ts-ignore
            tools.set('Buildings', BuildingsUI);
            tools.set('TerrainTool', TerrainTool);
            tools.set('Zones', Zones);
            //@ts-expect-error
            window.activateMenu = async (name: string) => {
                try {
                    let tool: UITABClassLike | undefined;
                    if (tool = tools.get(name)) {
                        //@ts-ignore
                        tool.instance = new tool(terrascene, (await terrainInited)[0], camera, sea);
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

            DB.then(DB => {
                DB.transaction("save").objectStore("save").get(0).onsuccess = async (evt) => {
                    
                    if ((<IDBRequest>evt.target).result) {

                        let restored = (<savedCamera>(<IDBRequest>evt.target).result).camera;
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
                        DB.transaction("save", "readwrite").objectStore("save").put(<savedCamera>{
                            id: 0,
                            camera: { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: new Float32Array([mainCamera.target[0], mainCamera.target[1], mainCamera.target[2]]), position: new Float32Array([mainCamera.position[0], mainCamera.position[1], mainCamera.position[2]]) }
                        });
                    })
                    mainCamera.beforeViewUpdate.add(() => {
                        l.eval(500);
                    });
                }
            })

        });
        const debugscene = new Scene('static', gpuscene, terraEngine, [mainCamera], (scene, sunBufferOffsetBytes) => {
            const sun = new PositionNode(scene.engine, sunBufferOffsetBytes);
            sun.worldPosition.translation.set([0, 1, 0]);
            sun.customData.set([0, 0, 0, 1]) //shadow to 1 (no shadow)
        });

        const b2 = Box.create(debugscene);
        b2.worldPosition.update(scale => scale.set([200, 200, 200]));
        b2.worldPosition.setTranslationX(500);

        let renderFrame: number = 0;
        let resizeHandler = 0;

        const renderPasses: Set<RenderPass> = new Set([gpuscene.renderPassScreen, gpuscene.renderPassWater]);
        const canvasSize: {
            width: number,
            height: number
        } = { width: 0, height: 0 }

        let curSecond = (Date.now() / 500) | 0;
        let framecount = 0;
        let msPerFrame = 0;
        let startTime = 0;

        function renderLoop(time: DOMHighResTimeStamp) {
            msPerFrame = performance.now() - startTime;
            startTime = performance.now();

            const nowSecond = (Date.now() / 500) | 0;
            if (nowSecond !== curSecond) {
                blazor.invokeMethod('setRendertime', framecount * 2, msPerFrame);
                curSecond = nowSecond;
                framecount = 0;
            }
            framecount++;
            //performance.mark('renderloopStart');


            gpuscene.onRenders2.forEach(or => {
                let buff = or();
                if (buff)
                    gpuscene.pendingCommandBuffers.push(buff);
            });
            if (camera.checkInputs()) {
                //camera.camera.update(values => {
                    camera.calculateCameraPositionAndTarget(/*values.position, values.target*/);
                //})
                
            }

            const renderEncoder = gpuscene.device.createCommandEncoder();
            timeView.set([time]);
            let physicDelta: number | null;
            if (terraEngine.physics.gameSpeed == -1)
                physicDelta = null;
            else
                physicDelta = (terraEngine.physics.physicTime - terraEngine.physics.tickTime) / ((terraEngine.physics.tickIntervalMs / 1000) << terraEngine.physics.gameSpeed)

            if (physicDelta !== null)
                deltaView.set([physicDelta]);

            gpuscene.device.defaultQueue.writeBuffer(gpuscene.timeBuffer, 0, timeAndDeltaBuffer)
            TerraCameras.forEach(camera => {
                camera.render(renderEncoder)
            });
            gpuscene.pendingCommandBuffers.push(renderEncoder.finish())
            gpuscene.device.defaultQueue.submit(gpuscene.pendingCommandBuffers);
            gpuscene.pendingCommandBuffers.length = 0;
            renderFrame = window.requestAnimationFrame(renderLoop);
            /* performance.mark('renderloopEnd');
             performance.measure("measure a to b", 'renderloopStart', 'renderloopEnd');
             performance.getEntriesByType("measure")[0].duration;
             performance.clearMarks();
             performance.clearMeasures();*/

        }


        //@ts-ignore
        let ro = new window.ResizeObserver((entries) => {
            window.cancelAnimationFrame(renderFrame)
            clearTimeout(resizeHandler);
            resizeHandler = setTimeout(async () => {
                canvasSize.width = entries[0].contentRect.width | 0;
                canvasSize.height = entries[0].contentRect.height | 0;
                renderPasses.forEach(renderpass => renderpass.onResize(canvasSize.width, canvasSize.height));
                gpuscene.onResizes.forEach(cb => cb());
                //TODO: remove duplicate
                const aspectRatio = (canvasSize.width * mainCamera.viewport.width) / (canvasSize.height * mainCamera.viewport.height);
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
        ro.observe(canvas)


        blazor.invokeMethod('setProgress', 20);

        let webSocket = new WebSocket('ws://localhost:8081');
        webSocket.onopen = async () => {
            console.log('websocket onopen');
            // progelem.value = 30;
            try {
                
                webSocket.send(JSON.stringify({ action: 'init', data: { userinfo: await loginPromise, ticks } }));
                webSocket.onmessage = (e) => {
                    let msg = JSON.parse(e.data);
                    if (msg.action == 'init') {
                        console.debug('going to init game', msg.currentPlayData)
                        blazor.invokeMethod('initGame', msg.currentPlayData);
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
                await loginPromise
                console.debug('initing without websocket connection');
                blazor.invokeMethod('initGame', {
                    gameSpeed: 0,
                    lastStateChangeGameTime: 216000000000,
                    lastStateChangeTime: ticks
                });
                //blazor.invokeMethod('setProgress', 20);
                // sceneInitedred();
            } catch (e) {
                // sceneInitedrej(e);
            }
        }

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

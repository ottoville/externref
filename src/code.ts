
import type { WorldScene } from "./world/scene.js";
//import * as BABYLON from "./lib/babylon/index.js"
import type { loginProvider, DotNet, savedCamera } from "./types/interfaces/index.js";
import type { WebGPUEngine, WebGPUEngineOptions } from "./lib/babylon/Engines/webgpuEngine";
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
import { testPlane, testPlaneNormals } from "./world/tests/testPlane.js";
import { Sea } from "./world/water.js";
import { Vector3, Matrix } from "./lib/babylon/Maths/math.vector";
import { ArcRotateCamera } from "./lib/babylon/index.js";
import { LazyEval } from "./LazyEval.js";

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
            terrascene = new TerraScene(window, canvas);


            terrascene.onRenderStart = async (renderTexture) => {


                // Initial scene objects here

                const tools: Map<string, UITABClassLike> = new Map();


                new Sun2(terrascene);
                const sea = new Sea(terrascene, renderTexture);
                /*new testPlane(terrascene);
                new testPlaneNormals(terrascene);*/
                const terrainInited = Terrain.loadFromTexture(terrascene);
                terrainInited.then(async r => {
                    const ground = r[0];
                    const gpuBuffer = await r[1];
                    blazor.invokeMethod('setProgress', 75);


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
                const scene = await scenePromise;
                ArcRotateCamera.prototype._getViewMatrix = function () {
                    var cosa = Math.cos(this.alpha);
                    var sina = Math.sin(this.alpha);
                    var cosb = Math.cos(this.beta);
                    var sinb = Math.sin(this.beta);

                    if (sinb === 0) {
                        sinb = 0.0001;
                    }
                    //@ts-ignore
                    var target = this._target
                    //@ts-ignore
                    this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);

                    // Rotate according to up vector
                    //@ts-ignore
                    if (this._upVector.x !== 0 || this._upVector.y !== 1.0 || this._upVector.z !== 0) {
                        //@ts-ignore
                        Vector3.TransformCoordinatesToRef(this._computationVector, this._YToUpMatrix, this._computationVector);
                    }
                    //@ts-ignore
                    target.addToRef(this._computationVector, this._newPosition);
                    if (scene.collisionsEnabled && this.checkCollisions) {
                        const coordinator = this.getScene().collisionCoordinator;
                        //@ts-ignore
                        if (!this._collider) {
                            //@ts-ignore
                            this._collider = coordinator.createCollider();
                        }
                        //@ts-ignore
                        this._collider._radius = this.collisionRadius;
                        //@ts-ignore
                        this._newPosition.subtractToRef(this._position, this._collisionVelocity);
                        //@ts-ignore
                        this._collisionTriggered = true;
                        //@ts-ignore
                        coordinator.getNewPosition(this._position, this._collisionVelocity, this._collider, 3, null, this._onCollisionPositionChange, this.uniqueId);
                    } else {
                        //@ts-ignore
                        this._position.copyFrom(this._newPosition);

                        var up = this.upVector;
                        if (this.allowUpsideDown && sinb < 0) {
                            up = up.negate();
                        }
                        //@ts-ignore
                        //this._computeViewMatrix(this._position, target, up);
                        Matrix.LookAtRHToRef(this._position, target, up, this._viewMatrix);
                        this._viewMatrix.addAtIndex(12, this.targetScreenOffset.x);
                        this._viewMatrix.addAtIndex(13, this.targetScreenOffset.y);
                    }
                    this._currentTarget = target;
                    return this._viewMatrix;
                }
                //@ts-ignore
                ArcRotateCamera.prototype._getViewMatrix2 = function () {
                    var cosa = Math.cos(this.alpha);
                    var sina = Math.sin(this.alpha);
                    var cosb = Math.cos(this.beta);
                    var sinb = Math.sin(this.beta);

                    if (sinb === 0) {
                        sinb = 0.0001;
                    }
                    //@ts-ignore
                    var target = this._target
                    //@ts-ignore
                    this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);

                    // Rotate according to up vector
                    //@ts-ignore
                    if (this._upVector.x !== 0 || this._upVector.y !== 1.0 || this._upVector.z !== 0) {
                        //@ts-ignore
                        Vector3.TransformCoordinatesToRef(this._computationVector, this._YToUpMatrix, this._computationVector);
                    }
                    
                    //@ts-ignore
                    target.addToRef(this._computationVector, this._newPosition);
                    //@ts-ignore
                    this._newPosition.y = this._newPosition.y + 1000 //* -1
                    if (scene.collisionsEnabled && this.checkCollisions) {
                        const coordinator = this.getScene().collisionCoordinator;
                        //@ts-ignore
                        if (!this._collider) {
                            //@ts-ignore
                            this._collider = coordinator.createCollider();
                        }
                        //@ts-ignore
                        this._collider._radius = this.collisionRadius;
                        //@ts-ignore
                        this._newPosition.subtractToRef(this._position, this._collisionVelocity);
                        //@ts-ignore
                        this._collisionTriggered = true;
                        //@ts-ignore
                        coordinator.getNewPosition(this._position, this._collisionVelocity, this._collider, 3, null, this._onCollisionPositionChange, this.uniqueId);
                    } else {
                        //@ts-ignore
                        this._position.copyFrom(this._newPosition);

                        var up = this.upVector;
                        if (this.allowUpsideDown && sinb < 0) {
                            up = up.negate();
                        }
                        //@ts-ignore
                        //this._computeViewMatrix(this._position, target, up);
                        Matrix.LookAtRHToRef(this._position, target, up, this._viewMatrix);
                        this._viewMatrix.addAtIndex(12, this.targetScreenOffset.x);
                        this._viewMatrix.addAtIndex(13, this.targetScreenOffset.y);
                    }
                    this._currentTarget = target;
                    return this._viewMatrix;
                }
                const camera = new ArcRotateCamera("Camera", 0, 0, 10, new Vector3(500, 20, 0), scene);

                //@ts-expect-error
                window.activateMenu = async (name: string) => {
                    try {
                        let tool: UITABClassLike | undefined;
                        if (tool = tools.get(name)) {
                            tool.instance = new tool(this, (await terrainInited)[0], camera, sea);
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
                    DB.transaction("save").objectStore("save").get(0).onsuccess = (evt) => {
                        if ((<IDBRequest>evt.target).result) {
                            let restored = (<savedCamera>(<IDBRequest>evt.target).result).camera;
                            camera.alpha = restored.alpha;
                            camera.beta = restored.beta;
                            camera.radius = restored.radius;
                            camera.target = new Vector3(restored.target.x, restored.target.y, restored.target.z);
                            camera.position = restored.position;

                        }
                        let l = new LazyEval(() => {
                            //console.log(this.camera.position.y);

                            DB.transaction("save", "readwrite").objectStore("save").put(<savedCamera>{
                                id: 0,
                                camera: { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target, position: camera.position }
                            });
                        })
                        camera.onProjectionMatrixChangedObservable.add(() => {
                            l.eval(500);
                        });

                    }
                })


                const gpuscene = await terrascene.gpuscenePromise

               

                const transformMatrix = new Matrix();

                
                scene.activeCameras.push(camera);
                camera.maxZ = 1606000;
                camera.panningSensibility = 20;

                camera.angularSensibilityX = 1000;
                camera.angularSensibilityY = 2000;
                camera.panningAxis = new Vector3(1, 0, 1)
                camera.checkCollisions = true;
                camera.attachControl(canvas, true);
                return camera;
            }
            const adapter = await terrascene.adapter;

            //@ts-ignore
            engine._adapter = adapter;
            const device = await terrascene.device

            // GPUScene.canvas = canvas;



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



            //await Promise.all(shaderPutsC);
            //@ts-ignore
            //engine._glslang = glslang;
            blazor.invokeMethod('setProgress', 12);
            //@ts-ignore
            engine._device = device;
            //@ts-ignore
            engine._initializeLimits();
            blazor.invokeMethod('setProgress', 13);


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

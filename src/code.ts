
import *  as Wasm from "./rustwasm/hello_wasm.js"
import { WorldScene } from "./world/scene.js";
//import * as BABYLON from "./lib/babylon/index.js"
import type { loginProvider, DotNet } from "./types/interfaces/index.js";
import { Engine } from "./lib/babylon/Engines/index.js";
import { Effect } from "./lib/babylon/Materials/effect.js";

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
        Wasm:any
    }
}
declare var BlazorRouter: DotNet.BlazorInstance;
let loadelem = document.body.appendChild(document.createElement("div"));
//let progelem = loadelem.appendChild(document.createElement("progress"))
loadelem.style.position = 'absolute';
loadelem.style.right= '30%';
loadelem.style.top = '30%';
loadelem.style.display = 'none';
var loginPromise: Promise<loginProvider> =new Promise<loginProvider>(login => {
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
        blazor.invokeMethod('setProgress', 10, null);
        await Wasm.default()
        window.Wasm = Wasm;
        //progelem.value = 20;
       // var canvas = document.getElementById("renderCanvas");
        if (canvas.dataset.inited === "true")
            return;
        canvas.dataset.inited = "true";
        var engine = new Engine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });

        //var engine = new BABYLON.WebGPUEngine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });
       // await engine.initAsync();


        //@ts-ignore
        BABYLON.Effect.prototype._loadShader = function (shader: any, key: string, optionalKey: string, callback: (data: any) => void): void {
            // Direct source ?
            if (shader.substr(0, 7) === "source:") {
                callback(shader.substr(7));
                return;
            }
            // Base64 encoded ?
            if (shader.substr(0, 7) === "base64:") {
                var vertexBinary = window.atob(shader.substr(7));
                callback(vertexBinary);
                return;
            }

            // Is in local store ?
            if (Effect.ShadersStore[shader + key + "Shader"]) {
                callback(Effect.ShadersStore[shader + key + "Shader"]);
                return;
            }

            var ShaderUrl;

            if (shader[0] === "." || shader[0] === "/" || shader.indexOf("http") > -1) {
                ShaderUrl = shader;
            } else {
                ShaderUrl = '/shaders/' + shader;
            }
            let suffix = key;
            if (key == 'Vertex')
                suffix = '.vert';
            if (key == 'Fragment')
                suffix = '.frag';

            let url = ShaderUrl + suffix;
            let onSuccess = callback;

            //@ts-ignore
            let request = BABYLON.FileTools.RequestFile(url, (data, request) => {
                onSuccess(data);
            });

            (function () {
                //@ts-ignore
                this._activeRequests.push(request);
                //@ts-ignore
                request.onCompleteObservable.add((request) => {
                    //@ts-ignore
                    this._activeRequests.splice(this._activeRequests.indexOf(request), 1);
                });
            }).bind(engine)()
        }

        //document.getElementById('loading').style.display = 'block';
        //loadingBar.value = 10;
        let webSocket = new WebSocket('ws://localhost:8081');
        webSocket.onopen = async () => {
            console.log('websocket onopen');
            blazor.invokeMethod('setProgress', 20, null);
           // progelem.value = 30;
            sceneInitedred(new WorldScene(engine, await loginPromise, blazor, ticks, canvas, webSocket));
        }
        webSocket.onerror = async () => {
            console.log('websocket onerror');
            blazor.invokeMethod('setProgress', 20, null);
            //progelem.value = 30;
            try {
                sceneInitedred(new WorldScene(engine, await loginPromise, blazor, ticks, canvas));
            } catch (e) {
                console.error('creating terrain failed', e);
                //progelem.parentNode.textContent = e;
                blazor.invokeMethod('setProgress', 0, e.name + e.message);
            }
        }
    }
});
window.sceneInited.then(scene => {
    window.scene = scene;
    scene.collisionsEnabled = true;
    let engine = scene.getEngine();

    let rloop = function () {
        var shouldRender = true;

        if (shouldRender) {
            // Start new frame
            engine.beginFrame();
            scene.render();
            // Present
            engine.endFrame();
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

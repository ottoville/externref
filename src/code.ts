

import { PlantsUI } from "./tools/plantsUI.js";


//import { CSG } from "./csg.js";
//import { UI } from "./UI.js";
import { Plants } from "./plants/Plants.js";
import { Sun } from "./world/sun.js";
import { WorkerThread, WorkerReturn } from "./WorkerThread.js";
import { WorldScene } from "./world/scene.js";

//import  DB from "./DB.js";


//let zones: Zone[] = [];

navigator.serviceWorker.register('/sw.js').then(function (registration) {
    // Registration was successful
    console.log('ServiceWorker registration successful with scope: ', registration.scope);
}, function (err) {
    // registration failed :(
    console.log('ServiceWorker registration failed: ', err);
});


BABYLON.Effect.prototype._loadFragmentShader = function (fragment: any, callback: (data: any) => void): void {
    // Direct source ?
    if (fragment.substr(0, 7) === "source:") {
        callback(fragment.substr(7));
        return;
    }

    // Base64 encoded ?
    if (fragment.substr(0, 7) === "base64:") {
        var fragmentBinary = window.atob(fragment.substr(7));
        callback(fragmentBinary);
        return;
    }

    // Is in local store ?
    if (BABYLON.Effect.ShadersStore[fragment + "PixelShader"]) {
        callback(BABYLON.Effect.ShadersStore[fragment + "PixelShader"]);
        return;
    }

    if (BABYLON.Effect.ShadersStore[fragment + "FragmentShader"]) {
        callback(BABYLON.Effect.ShadersStore[fragment + "FragmentShader"]);
        return;
    }

    var fragmentShaderUrl;

    if (fragment[0] === "." || fragment[0] === "/" || fragment.indexOf("http") > -1) {
        fragmentShaderUrl = fragment;
    } else {
        fragmentShaderUrl = BABYLON.Effect.ShadersRepository + fragment;
    }

    // Fragment shader
    this._engine._loadFile(fragmentShaderUrl + ".frag", callback);
}
BABYLON.Effect.prototype._loadVertexShader = function (vertex: any, callback: (data: any) => void): void {
    // Direct source ?
    if (vertex.substr(0, 7) === "source:") {
        callback(vertex.substr(7));
        return;
    }
    // Base64 encoded ?
    if (vertex.substr(0, 7) === "base64:") {
        var vertexBinary = window.atob(vertex.substr(7));
        callback(vertexBinary);
        return;
    }

    // Is in local store ?
    if (BABYLON.Effect.ShadersStore[vertex + "VertexShader"]) {
        callback(BABYLON.Effect.ShadersStore[vertex + "VertexShader"]);
        return;
    }

    var vertexShaderUrl;

    if (vertex[0] === "." || vertex[0] === "/" || vertex.indexOf("http") > -1) {
        vertexShaderUrl = vertex;
    } else {
        vertexShaderUrl = BABYLON.Effect.ShadersRepository + vertex;
    }

    // Vertex shader
    this._engine._loadFile(vertexShaderUrl + ".vert", callback);
}



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

var BlazorRouter: Promise<DotNet.BlazorInstance> = new Promise((resolve, reject) => {
    (<any>window).initRouter = resolve
});
declare global {
    interface Window {
        scene: WorldScene;
        sceneInited: Promise<WorldScene>;
        fbAsyncInit: () => void;
        playAnomyous: () => void
    }
}
var loginPromise: Promise<loginProvider> =new Promise<loginProvider>(login => {
    window.fbAsyncInit = function () {
        FB.init({
            appId: '417236772473746',
            cookie: true,
            xfbml: true,
            version: 'v4.0'
        });
        FB.AppEvents.logPageView();
        FB.Event.subscribe('auth.login', async (response) => {
            (await BlazorRouter).invokeMethod('startGame');
            login({ provider: 'facebook', accessToken: response.authResponse.accessToken, userID: response.authResponse.userID });
        });
        FB.getLoginStatus(async (response) => {
            if (response.status === 'connected') {
                (await BlazorRouter).invokeMethod('startGame');
                login({ provider: 'facebook', accessToken: response.authResponse.accessToken, userID: response.authResponse.userID });
            }
        });
    };
    window.playAnomyous = async () => {
        (await BlazorRouter).invokeMethod('startGame');
        if (typeof (localStorage.accessToken) === 'undefined')
            localStorage.accessToken = new Date().getTime().toString() + navigator.userAgent;
        login({ provider: 'anomyous', accessToken: localStorage.accessToken });
    }
});

window.sceneInited = new Promise<WorldScene>((sceneInitedred, sceneInitedrej) => {
    (<any>window).initCanvas = async function (blazor: DotNet.BlazorInstance, ticks: number) {
        var canvas = document.getElementById("renderCanvas");
        if (!canvas || canvas.dataset.inited === "true")
            return;
        canvas.dataset.inited = "true";
        console.log('init canvas ', ticks)
        var engine = new BABYLON.Engine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });
        let loadingBar: HTMLProgressElement = <HTMLProgressElement>document.getElementById('loadingBar');

        //document.getElementById('loading').style.display = 'block';
        //loadingBar.value = 10;
        let webSocket = new WebSocket('ws://localhost:8081');
        webSocket.onopen = async () => {
            console.log('websocket onopen');
            //loadingBar.value = 20;
            sceneInitedred(new WorldScene(engine, await loginPromise, blazor, ticks, webSocket));
        }
        webSocket.onerror = async () => {
            console.log('websocket onerror');
            sceneInitedred(new WorldScene(engine, await loginPromise, blazor, ticks));
        }
    }
});
window.sceneInited.then(scene => {
    scene.collisionsEnabled = true;
    let TODOut = <HTMLOutputElement>document.getElementById("TODout");
    setInterval(() => {
        // @ts-ignore
        //TODOut.value = new Date(Number(scene.currentGameTime)).toLocaleTimeString(undefined, { timeStyle: "short", timeZone: 'UTC' });
    }, 500);
    //loadingBar.value = 30;
    scene.getEngine().runRenderLoop(function () {
        if (window.scene) {

            //scene.currentGameTime = DotNet.invokeMethod('BlazorApp1', 'getGameTime')
            window.scene.render();
        }
    });
    // Resize
    window.addEventListener("resize", function () {
        scene.getEngine().resize();
    });
    for (let i = 0; i < gameControlsUI.length; i++) {
        gameControlsUI[i].classList.remove('hidden');
    }
        //document.getElementById('loading').style.display = 'none';
})

let gameControlsUI = document.getElementsByClassName('gameControl');
new Promise((resolve, reject) => {


}).then((logininfo: fb.StatusResponse) => {

    document.getElementById('loginscreen').style.display = 'none';

})

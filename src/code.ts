

import { PlantsUI } from "./tools/plantsUI.js";


//import { CSG } from "./csg.js";
//import { UI } from "./UI.js";
import { Plants } from "./plants/Plants.js";
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
    if (BABYLON.Effect.ShadersStore[shader + key + "Shader"]) {
        callback(BABYLON.Effect.ShadersStore[shader + key + "Shader"]);
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
        this._activeRequests.push(request);
        request.onCompleteObservable.add((request) => {
            this._activeRequests.splice(this._activeRequests.indexOf(request), 1);
        });
    }).bind(this._engine)()
    return request;

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
    console.log('router inited');
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
        console.log('playAnomyous clicked');
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
    window.scene = scene;
    scene.collisionsEnabled = true;
    let TODOut = <HTMLOutputElement>document.getElementById("TODout");

    let engine = scene.getEngine();

    let renderFunction = function () {
        scene.render();
    }
    /*let renderLoop = (function (): void {
        console.log('renderloop');
        if (!this._contextWasLost) {
            var shouldRender = true;
            if (!this.renderEvenInBackground && this._windowIsBackground) {
                shouldRender = false;
            }
            if (shouldRender) {
                console.log('shouldRender')
                // Start new frame
                this.beginFrame();
                //renderFunction();
                if (!this._renderViews()) {
                    // Main frame
                    this._renderFrame();
                }
                // Present
                this.endFrame();
            }
        }
        //this._frameHandler = this._queueNewFrame(renderLoop, this.getHostWindow());
        if (this._activeRenderLoops.length > 0) {
            // Register new frame
            if (this.customAnimationFrameRequester) {
                this.customAnimationFrameRequester.requestID = this._queueNewFrame(this.customAnimationFrameRequester.renderFunction || this._boundRenderFunction, this.customAnimationFrameRequester);
                this._frameHandler = this.customAnimationFrameRequester.requestID;
            } else if (this.isVRPresenting()) {
                this._requestVRFrame();
            } else {
                this._frameHandler = this._queueNewFrame(this._boundRenderFunction, this.getHostWindow());
            }
        } else {
            this._renderingQueueLaunched = false;
        }
    }).bind(engine);
    //@ts-ignore
    engine._queueNewFrame(renderLoop);*/
    //BABYLON.Tools.QueueNewFrame(renderLoop);




    /*engine.runRenderLoop(function () {
        scene.render();
    });*/

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
})

let gameControlsUI = document.getElementsByClassName('gameControl');
new Promise((resolve, reject) => {


}).then((logininfo: fb.StatusResponse) => {
    let loginscreen;
    if (loginscreen = document.getElementById('loginscreen')) {
        loginscreen.style.display = 'none';
    }
})

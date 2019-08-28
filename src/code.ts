

import { PlantsUI } from "./tools/plantsUI.js";
import { CameraTAB } from "./tools/camera.js";


//import { CSG } from "./csg.js";
//import { UI } from "./UI.js";
import { Plants } from "./plants/Plants.js";
import { Sun } from "./world/sun.js";
import { WorkerThread, WorkerReturn } from "./WorkerThread.js";
import { WorldScene } from "./world/scene.js";

//import  DB from "./DB.js";


//let zones: Zone[] = [];



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

var createScene = function (userinfo: { name: string, email: string }, loadingBar: HTMLProgressElement, engine: BABYLON.Engine): Promise<WorldScene> {
    return new Promise((res, rej) => {
        let webSocket = new WebSocket('ws://localhost:8081');
        let TODOut = <HTMLOutputElement>document.getElementById("TODout");
        webSocket.onopen = () => {
            loadingBar.value = 20;
            var scene = new WorldScene(engine, userinfo, webSocket);
            scene.collisionsEnabled = true;
            setInterval(() => {
                // @ts-ignore
                TODOut.value = new Date(Number(scene.currentGameTime)).toLocaleTimeString(undefined, { timeStyle: "short", timeZone: 'UTC' });
            }, 500);
            res(scene);
        }
        webSocket.onerror = () => {
            var scene = new WorldScene(engine, userinfo);
            scene.collisionsEnabled = true;
            setInterval(() => {
                // @ts-ignore
                TODOut.value = new Date(Number(scene.currentGameTime)).toLocaleTimeString(undefined, { timeStyle: "short", timeZone: 'UTC' });
            }, 500);
            res(scene);
        }
    });
};
(<any>window).initCanvas=function() {
    var canvas = document.getElementById("renderCanvas");
    console.log('canvas is ',canvas)
    var engine = new BABYLON.Engine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });
    let loadingBar: HTMLProgressElement = <HTMLProgressElement>document.getElementById('loadingBar');
    new Promise((startGame) => {
        startGame();
        /*document.getElementById('loginmethods').addEventListener('click', (evt) => {
            if ((<HTMLElement>(evt.target)).nodeName == 'BUTTON') {
                let btn: HTMLButtonElement = <any>evt.target;
                if (btn.dataset.action == "offline") {
                    document.getElementById('loading').style.display = 'block';
                    startGame();
                }
            }
        });*/
        (<any>window).fbAsyncInit = function () {
            FB.init({
                appId: '417236772473746',
                cookie: true,
                xfbml: true,
                version: 'v4.0'
            });

            FB.AppEvents.logPageView();
            FB.Event.subscribe('auth.login', () => {
                FB.api('/me', { locale: 'en_US', fields: 'name, email' }, async function (userinfo: { name: string, email: string }) {
                    startGame()
                });

            });
            FB.getLoginStatus((response) => {
                if (response.status === 'connected') {
                    FB.api('/me', { locale: 'en_US', fields: 'name, email' }, async function (userinfo: { name: string, email: string }) {
                        startGame(response);
                    })
                }
            });
        };
    }).then(async (userdata: { name: string, email: string }) => {
        //document.getElementById('loading').style.display = 'block';
        //loadingBar.value = 10;
        var scene = await createScene(userdata, loadingBar, engine);
        //loadingBar.value = 30;
        engine.runRenderLoop(function () {
            if (scene) {
                scene.currentGameTime = scene.getGameTime();
                scene.render();
            }
        });
        // Resize
        window.addEventListener("resize", function () {
            engine.resize();
        });
        for (let i = 0; i < gameControlsUI.length; i++) {
            gameControlsUI[i].classList.remove('hidden');
        }
        //document.getElementById('loading').style.display = 'none';
    });
}

let gameControlsUI = document.getElementsByClassName('gameControl');
new Promise((resolve, reject) => {


}).then((logininfo: fb.StatusResponse) => {

    document.getElementById('loginscreen').style.display = 'none';

})

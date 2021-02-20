import type { DotNet } from "./types/interfaces/index.js";

//import { testPlane, testPlaneNormals } from "./world/tests/testPlane.js";

import { Engine } from "./engine.js";

import { Login } from "./ui/login.js";
import { Canvas } from "./ui/canvas.js";
export const state: {
    userInfo:null | string
} = {
    userInfo: null
}

const app = document.getElementById('app')
if (!app)
    throw ('App not found');
let logged = false;




const render = () => {
    app.innerHTML=''
    app.appendChild(logged ? <Canvas>foo</Canvas> : <Login callback={onLogin}></Login>
);
}
const onLogin = (obj: { provider: string, accessToken: string, pointerEvent: PointerEvent }) => {
    console.log('onlogin', obj.provider)
    state.userInfo = obj.provider
    logged=true
    render()
}
render();

console.log(app)



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

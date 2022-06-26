import { Canvas } from "./ui/canvas.js";
export const state: {
    userInfo:null | string
} = {
    userInfo: null
}

const app = document.getElementById('app')
if (!app)
    throw (new Error('App not found'));
let logged = false;

const render = async () => {
    app.innerHTML=''
    const creditentials = await fetch('/.auth/me').then(response => response.json());
    if(logged) {
        return app.appendChild(<Canvas></Canvas>)
    }
    app.appendChild(<div>

    <h3>Select your language</h3>
    <select>

    </select>
    <h3>Log in to play the game</h3>
    <fieldset id="loginmethods">
        { !creditentials.clientPrincipal && <a href="/.auth/login/login">Login</a>}
        { !creditentials.clientPrincipal && <button onClick={(e: PointerEvent) => onLogin({provider: 'anomyous', accessToken:'foobar', pointerEvent: e})}>Continue without logging in and online features</button>}
        { creditentials.clientPrincipal && <a href="/.auth/logout">Logout</a>}
        { creditentials.clientPrincipal && <button onClick={(e: PointerEvent) => onLogin({provider: 'anomyous', accessToken:'foobar', pointerEvent: e})}>Play</button>}
    </fieldset>
    </div>);
}
const onLogin = (obj: { provider: string, accessToken: string, pointerEvent: PointerEvent }) => {
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


const loadelem = document.body.appendChild(document.createElement("div"));
//let progelem = loadelem.appendChild(document.createElement("progress"))
loadelem.style.position = 'absolute';
loadelem.style.right = '30%';
loadelem.style.top = '30%';
loadelem.style.display = 'none';

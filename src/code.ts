/* eslint-disable indent */
import { Canvas } from "./ui/canvas.js";
const app = document.getElementById('app')
if (!app)
    throw (new Error('App not found'));

//@ts-expect-error
window.render = async (play = false) => {
    app.innerHTML = ''
    const creditentials = await fetch('/.auth/me').then(response => response.json());
    if (play) {
        return new Canvas(app);
    }
    app.innerHTML =`<div>
        <h3>Log in to play the game</h3>
        <fieldset id="loginmethods">
        ${!creditentials.clientPrincipal ?
            `<a href="/.auth/login/login">Login</a>
            <button onclick="render(true)">Continue without logging in and online features</button>`
            :
            `<a href="/.auth/logout">Logout</a>
            <button onclick="render(true)">Play</button>`}
        </fieldset>
    </div>` ;
    return;
}
//@ts-expect-error
window.render();
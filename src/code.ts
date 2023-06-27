// eslint-disable-next-line import/extensions
import { ApplicationInsights } from './bundled.js';

/* eslint-disable indent */
const app = document.getElementById('app')
if (!app)
    throw (new Error('App not found'));
const appInsights = new ApplicationInsights({
    config: {
        // TODO: Do not hardcode
        connectionString: 'InstrumentationKey=7885914d-5b38-40fe-84e0-ac98b921b775;IngestionEndpoint=https://northeurope-0.in.applicationinsights.azure.com/;LiveEndpoint=https://northeurope.livediagnostics.monitor.azure.com/',
        /* ...Other Configuration Options... */
    },
});
appInsights.loadAppInsights();

//@ts-expect-error
window.render = async (play = false) => {
    app.innerHTML = ''
    const creditentials = await fetch('/.auth/me').then(response => response.json());
    appInsights.trackPageView(); // Manually call trackPageView to establish the current user/session/pageview
    if (play) {
        const { Canvas, } = await import('./ui/canvas.js')
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
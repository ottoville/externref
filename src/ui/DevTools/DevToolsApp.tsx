
import { createRoot } from 'react-dom/client';
import { Meshes } from "./Meshes.js";
import { Cameras } from "./Cameras.js";


export const DevToolsApp = (container: HTMLElement) => {
    const root = createRoot(container);
    container.style.display = 'block';
    root.render(
        <div id="DevToolsAppContainer">
            <button type="button" onClick={() => {
                root.unmount();
                container.style.display = 'none';
            }}>Close</button>

            <Meshes></Meshes>
            <Cameras></Cameras>
        </div>)
}
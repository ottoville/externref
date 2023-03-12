import type { GPU } from "../../GPU.js";

import { createRoot } from 'react-dom/client';
import { Meshes } from "./Meshes.js";

export const DevToolsApp = (container: HTMLElement, gpu: GPU) => {
    const root = createRoot(container);
    container.style.display = 'block';
    root.render(
        <div id="DevToolsAppContainer">
            <button type="button" onClick={() => {
                root.unmount();
                container.style.display = 'none';
            }}>Close</button>

            <Meshes gpu={gpu}></Meshes>

        </div>)
}
import type { GPU } from "../GPU.js";
import * as ReactDom from "react-dom";

export const DevTools = (container: HTMLElement, gpu: GPU) => {
    gpu.positionAndTimeBindGroup.renderPipelineListeners.add(async () => {
        const drawables = (await Promise.all(Array.from(gpu.positionAndTimeBindGroup.renderPipeLines).map(async (rp) => {
            const variant = gpu.renderPassScreen.renderPipelines.get(rp);
            if (variant) {
                return Array.from((await variant).rootDrawables).map(drawable => {
                    return [drawable.label, drawable];
                });
            } else {
                return null
            }
        }))).flat();
        console.log('drawables', drawables);
    });
    ReactDom.render(<button onClick={() => {
        container.style.display = 'none';
    }}>Close</button>,container)
}
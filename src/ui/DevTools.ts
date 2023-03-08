import type { GPU } from "../GPU";

export const DevTools = (container: HTMLElement, gpu: GPU) => {
    const closeButton = container.appendChild(document.createElement('button'));
    closeButton.textContent = 'close';
    closeButton.onclick = () => {
        container.style.display = 'none';
    }
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
    })
}
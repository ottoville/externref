export class GPUCanvas {
    static device: GPUDevice;
    static canvas: HTMLCanvasElement;
    get device(): GPUDevice  {
         return GPUCanvas.device;
    }
    get canvas(): HTMLCanvasElement {
        return GPUCanvas.canvas;
    }
}
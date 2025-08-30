export const CanvasInterface = {
  get_webgpu_context(canvas: HTMLCanvasElement): GPUCanvasContext {
    const context = canvas.getContext('webgpu');
    if (!context) throw new Error('Unable to get webgpu context');
    return context;
  },
  set_height(canvas: HTMLCanvasElement, height: number) {
    canvas.height = height;
  },
  set_width(canvas: HTMLCanvasElement, width: number) {
    canvas.width = width;
  },
};

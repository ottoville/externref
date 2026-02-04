import { textureFormatMapping } from './TextureInterface.js';

export const GPUInterface = {
  get_preferred_canvas_format() {
    const format = navigator.gpu.getPreferredCanvasFormat();
    return textureFormatMapping.indexOf(format);
  },
};

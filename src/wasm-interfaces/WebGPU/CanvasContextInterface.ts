import { textureFormatMapping } from './TextureInterface.js';
import type { Engine } from '../../engine.js';
declare const engine: Engine;

const colorSpaceMapping = ['display-p3', 'srgb'] as const;
const toneMappingModeMapping = ['standard', 'extended'] as const;
const alphaModeMapping = ['opaque', 'premultiplied'] as const;
export const CanvasContextInterface = {
  configure(
    canvas: GPUCanvasContext,
    device: GPUDevice,
    format: number,
    usage: number,
    viewformats_ptr: number,
    viewformats_len: number,
    colorSpace: number,
    toneMappingN: number,
    alphaModeN: number,
  ) {
    const viewFormats = Array.from(
      new Uint32Array(
        engine.rust.memory.buffer,
        viewformats_ptr,
        viewformats_len,
      ),
    ).map((mapping) => textureFormatMapping[mapping]!);
    const toneMapping: GPUCanvasToneMapping = {};
    if (toneMappingN > 0) {
      toneMapping.mode = toneMappingModeMapping[toneMappingN]!;
    }
    return canvas.configure({
      alphaMode: alphaModeMapping[alphaModeN]!,
      colorSpace: colorSpaceMapping[colorSpace]!,
      device,
      format: textureFormatMapping[format]!,
      toneMapping,
      usage,
      viewFormats,
    });
  },
  get_current_texture(canvas: GPUCanvasContext): GPUTexture {
    return canvas.getCurrentTexture();
  },
};

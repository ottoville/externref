import type {
  ShaderStage,
  StorageTextLayout,
  TextLayout,
} from '../../webgpu-ts/index.js';

// eslint-disable-next-line import/no-unused-modules
export const textureStore = (
  texture: StorageTextLayout,
  coords: string,
  value: string,
) => /* wgsl */ `textureStore(${texture}, ${coords}, ${value});\n`;

export function textureLoad(
  ...args:
    | [
        texture: TextLayout<ShaderStage, 'texture_2d<f32>'>,
        coords: string,
        level: string,
      ]
    | [
        texture: TextLayout<ShaderStage, 'texture_2d_array<f32>'>,
        coords: string,
        arrayIndex: string,
        level: string,
      ]
) {
  return /* wgsl */ `textureLoad(${args.join()})`;
}

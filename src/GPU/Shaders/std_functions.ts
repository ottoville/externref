import { StorageTextLayout, TextLayout } from '../BindGroupLayout.js';

export const textureStore = (texture: StorageTextLayout, coords: string, value: string) =>
/* wgsl */ `textureStore(${texture}, ${coords}, ${value});\n`;

export const textureLoad = (texture: TextLayout, coords: string, arrayIndex: string, level = '') =>
/* wgsl */ `textureLoad(${texture}, ${coords}, ${arrayIndex}, ${level})`;
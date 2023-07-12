import { StorageTextLayout } from '../BindGroupLayout.js';

export const textureStore = (texture: StorageTextLayout, coords: string, value: string) =>
/* wgsl */ `textureStore(${texture}, ${coords}, ${value});\n`;
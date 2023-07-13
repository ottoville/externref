import { StorageTextLayout, TextLayout } from '../BindGroupLayout.js';

export const textureStore = (texture: StorageTextLayout, coords: string, value: string) =>
/* wgsl */ `textureStore(${texture}, ${coords}, ${value});\n`;

export function textureLoad(texture: TextLayout, coords: string, level: string): string
export function textureLoad(texture: TextLayout, coords: string, arrayIndex: string, level: string): string
export function textureLoad(texture: TextLayout, coords: string, arrayIndex: string, level = '') {
    return /* wgsl */ `textureLoad(${texture}, ${coords}, ${arrayIndex}, ${level})`;
}
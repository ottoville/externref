import { Terrain } from "./world/terrain.js";
import type { Sea } from "./world/water.js";
import { ArcRotateCamera } from "./ArcRotateCamera.js";

export interface UITABClassLike {
    new (
        terrain: Terrain,
        camera: ArcRotateCamera,
        sea: Sea): UITAB;

    label: string;
    menuElem: ((instance: any) => HTMLElement)
}
export abstract class UITAB {
    abstract destroy(): void;
    static label:string;
    constructor(
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        public sea: Sea
    ) {

    }
}
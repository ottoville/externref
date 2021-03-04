import { Terrain } from "./world/terrain.js";
import type { Sea } from "./world/water.js";
import type { Scene } from "./Scene.js";
import { ArcRotateCamera } from "./ArcRotateCamera.js";

export interface UITABClassLike {
    new (scene: Scene,
        terrain: Terrain,
        camera: ArcRotateCamera,
        sea: Sea): UITAB;

    label: string;
    menuElem: ((instance: any) => HTMLElement)
};
export abstract class UITAB {
    abstract destroy(): void;
    constructor(
        public scene: Scene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        public sea: Sea
    ) {

    }
}
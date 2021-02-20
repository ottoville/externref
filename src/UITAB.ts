import { Terrain } from "./world/terrain.js";
import type { Sea } from "./world/water.js";
import type { Scene } from "./Scene.js";
import { ArcRotateCamera } from "./ArcRotateCamera.js";

type UITABClass = typeof UITAB;
export interface UITABClassLike extends UITABClass {
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
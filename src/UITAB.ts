import { Terrain } from "./world/terrain.js";
import type { Sea } from "./world/water.js";
import type { Scene } from "./Scene.js";
import { ArcRotateCamera } from "./ArcRotateCamera.js";

type UITABClass = typeof UITAB;
export interface UITABClassLike extends UITABClass {
    instance: UITAB | null;
};
export abstract class UITAB {
    public static instance: UITAB | null = null;
    abstract destroy(): void;
    constructor(
        public scene: Scene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        public sea: Sea
    ) {
    }
}
import { Terrain } from "./world/terrain.js";
import type { ArcRotateCamera } from "./lib/babylon/Cameras/arcRotateCamera.js";
import type { Sea } from "./world/water.js";
import type { TerraScene } from "./TerraScene.js";

type UITABClass = typeof UITAB;
export interface UITABClassLike extends UITABClass {
    instance: UITAB | null;
};
export abstract class UITAB {
    public static instance: UITAB | null = null;
    abstract destroy(): void;
    constructor(
        public scene: TerraScene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        public sea: Sea,
        ...args: any[]
    ) {
    }
}
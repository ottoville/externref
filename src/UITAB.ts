import { Terrain } from "./world/terrain.js";
import type { Sea } from "./world/water.js";
export interface UITABClassLike {
    new (
        terrain: Terrain,
        sea: Sea): UITAB;

    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    menuElem: ((instance: any) => HTMLElement)
}
export abstract class UITAB {
    abstract destroy(): void;
    static label:string;
    constructor(
        public terrain: Terrain,
        public sea: Sea
    ) {

    }
}
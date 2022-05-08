import { Terrain } from "./world/terrain.js";
export interface UITABClassLike {
    new (
        terrain: Terrain): UITAB;

    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    menuElem: ((instance: any) => HTMLElement)
}
export abstract class UITAB {
    abstract destroy(): void;
    static label:string;
    constructor(
        public terrain: Terrain
    ) {

    }
}
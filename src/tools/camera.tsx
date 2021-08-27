import { UITAB } from "../UITAB.js";
import type { Terrain } from "../world/terrain.js";
import { Sea } from "../world/water.js";
import { ArcRotateCamera } from "../ArcRotateCamera.js";
export class CameraTAB extends UITAB {
    static menuElem = <button class="w3-bar-item w3-button">Debug camera</button>;
    static override label = 'Camera';
    constructor(
        terrain: Terrain,
        camera: ArcRotateCamera,
        sea: Sea
    ) {
        super(terrain, camera, sea);

    }
    override destroy = (): void => {
        throw(new Error('not implemented'))
     }
    /* activate = (): void => {
        this.activated=true;
    }*/
    activateDebugCamera = (enable: boolean): void => {
        if (enable) {
            //@ts-ignore
            this.camera.viewport = new Viewport(0.5, 0, 0.5, 1.0);
           // this.scene.activeCameras.push(this.scene.camera2);
        }
        else {
            //@ts-ignore
            this.camera.viewport = new Viewport(0, 0, 1, 1.0);
           // this.scene.removeCamera(this.scene.camera2);
        }
    }
}
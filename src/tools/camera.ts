import { UITAB } from "../UITAB.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { WorldScene } from "../world/scene.js";
import type { Terrain } from "../world/terrain.js";
import { Sea } from "../world/water.js";
export class CameraTAB extends UITAB {
    public label = 'Camera';
    constructor(
        public scene: WorldScene,
        public terrain: Terrain,
        public camera: ArcRotateCamera,
        sea: Sea
    ) {
        super(scene, terrain, camera, sea);

    }
    destroy = (): void => {
     }
    /* activate = (): void => {
        this.activated=true;
    }*/
    activateDebugCamera = (enable: boolean): void => {
        if (enable) {
            this.camera.viewport = new Viewport(0.5, 0, 0.5, 1.0);
            this.scene.activeCameras.push(this.scene.camera2);
        }
        else {
            this.camera.viewport = new Viewport(0, 0, 1, 1.0);
            this.scene.removeCamera(this.scene.camera2);
        }
    }
}
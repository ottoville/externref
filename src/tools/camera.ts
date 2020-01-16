import { UITAB } from "../UITAB.js";
import { LazyEval } from "../LazyEval.js";
import { Terrain } from "../world/terrain.js";
export class CameraTAB extends UITAB {
    public name = 'camera';
    public label = 'Camera';
    public camera: BABYLON.ArcRotateCamera;
    public camera2: BABYLON.ArcRotateCamera;
    constructor(
        private scene: BABYLON.Scene,
        public canvas: HTMLCanvasElement,
        private D: Promise<IDBDatabase>
    ) {
        super();

        this.camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 10, new BABYLON.Vector3(500, 20, 0), scene);
        scene.activeCameras.push(this.camera);
        this.camera.maxZ=1606000;
        this.camera.panningSensibility = 20;

        this.camera.angularSensibilityX = 1000;
        this.camera.angularSensibilityY = 2000;

        this.camera.lowerBetaLimit = 0.2;
        this.camera.upperBetaLimit = (Math.PI / 2) * 0.6;

        this.camera.lowerRadiusLimit = 10;

        this.camera.panningAxis = new BABYLON.Vector3(1, 0, 1)
        this.camera.checkCollisions = true;
        //Object.defineProperty(this.camera, 'checkCollisions', { get() { debugger; return true; } })
        this.camera.attachControl(canvas, true);

        this.camera2 = new BABYLON.ArcRotateCamera("Camera2", 0, 0, 10, new BABYLON.Vector3(500, 20, 0), scene);
        this.camera2.target = this.camera.target;
        this.camera2.viewport = new BABYLON.Viewport(0, 0, 0.5, 1.0);

        D.then(DB => {
            DB.transaction("save").objectStore("save").get(0).onsuccess = (evt) => {
                if ((<IDBRequest>evt.target).result) {
                    let restored = (<savedCamera>(<IDBRequest>evt.target).result).camera;
                    this.camera.alpha = restored.alpha;
                    this.camera.beta = restored.beta;
                    this.camera.radius = restored.radius;
                    this.camera.target = new BABYLON.Vector3(restored.target.x, restored.target.y, restored.target.z);
                    this.camera.position = restored.position;

                }
                let l = new LazyEval(() => {
                    //console.log(this.camera.position.y);

                    DB.transaction("save", "readwrite").objectStore("save").put(<savedCamera>{
                        id: 0,
                        camera: { alpha: this.camera.alpha, beta: this.camera.beta, radius: this.camera.radius, target: this.camera.target, position: this.camera.position }
                    });
                    if (this.camera2) {
                        this.camera2.alpha = 0;
                        this.camera2.beta = 0;
                        this.camera2.radius = 60;
                        this.camera2.target = new BABYLON.Vector3(this.camera.target.x, 1, this.camera.target.z);
                        this.camera2.position = new BABYLON.Vector3(this.camera.target.x, 1000, this.camera.target.z);
                    }
                 })
                this.camera.onViewMatrixChangedObservable.add(() => {
                    l.eval(500);
                });

            }
        })

    }
    deactivate = (): void => {
        this.activated=false;
     }
    activate = (): void => {
        this.activated=true;
    }
    activateDebugCamera = (enable: boolean): void => {
        if (enable) {
            this.camera.viewport = new BABYLON.Viewport(0.5, 0, 0.5, 1.0);
            this.scene.activeCameras.push(this.camera2);
        }
        else {
            this.camera.viewport = new BABYLON.Viewport(0, 0, 1, 1.0);
            this.scene.removeCamera(this.camera2);
        }
    }
}
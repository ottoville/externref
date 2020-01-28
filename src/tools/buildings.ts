import { UITAB } from "../UITAB.js";

export class BuildingsUI extends UITAB {
    name: string;
    activate: () => void;
    deactivate: () => void;
    public canvas: HTMLCanvasElement;
    public listeners: Map<
        keyof HTMLElementEventMap,
        Map<(this: HTMLElement, ev: HTMLElementEventMap[keyof HTMLElementEventMap]) => any, (e) => void>
    >;

    constructor(
        private scene: BABYLON.Scene
    ) {
        super();
        this.canvas = <any>this.scene.getEngine().getRenderingCanvas();
    }
    public create = (type: string): void => {
        let scene = this.scene;
        let engine = this.scene.getEngine();
        if(type == 'house') {
            this.canvas.addEventListener("pointerdown", function doHouse() {
                this.removeEventListener("pointerdown", doHouse);
                let pickInfo: BABYLON.PickingInfo | null;
                if (pickInfo = scene.pick(scene.pointerX, scene.pointerY, (m) => {
                    return true;
                })) {
                    if (pickInfo.pickedPoint) {
                        let height = 7;
                        var myBox = BABYLON.MeshBuilder.CreateBox("myBox", { height: height, width: 8, depth: 8 }, scene);
                        myBox.position.x = pickInfo.pickedPoint.x;
                        myBox.position.z = pickInfo.pickedPoint.z;
                        myBox.position.y = pickInfo.pickedPoint.y + (height * 0.5) - 0.5;
                        console.log(pickInfo);
                    }
                }

            }, false);
        }
    }
}
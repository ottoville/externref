import { UITAB } from "../UITAB.js";

export class BuildingsUI extends UITAB {
    activated: boolean;
    name: string;
    label: string;
    activate: () => void;
    deactivate: () => void;
    constructor(
        private scene: BABYLON.Scene
    ) {
        super();
    }
    public create = (type: string): void => {
        let scene = this.scene;
        let engine = this.scene.getEngine();
        let canvas = engine.getRenderingCanvas();
        if(type == 'house') {
            canvas.addEventListener("pointerdown", function doHouse() {
                canvas.removeEventListener("pointerdown", doHouse);
                var pickInfo = scene.pick(scene.pointerX, scene.pointerY, (m) => {
                    return true;
                });
                let height = 7;
                var myBox = BABYLON.MeshBuilder.CreateBox("myBox", { height: height, width: 8, depth: 8 }, scene);
                myBox.position.x = pickInfo.pickedPoint.x;
                myBox.position.z = pickInfo.pickedPoint.z;
                myBox.position.y = pickInfo.pickedPoint.y + (height*0.5)-0.5;
                console.log(pickInfo);
            }, false);
        }
    }
}
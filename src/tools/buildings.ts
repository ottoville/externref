import { UITAB } from "../UITAB.js";
import { TerraMesh } from "../TerraMesh.js";
import * as BABYLON from "../lib/babylon/index.js"
import { canvasListener } from "../traits/canvasListener.js";
import { Trait } from "../traits/trait.js";
import { ArcRotateCamera } from "../lib/babylon/index.js";
import { Terrain } from "../world/terrain.js";
import { Sea } from "../world/water.js";
import type { Scene } from "../Scene.js";


export class BuildingsUI extends UITAB {
    activate: () => void= () => null;
    destroy: () => void = () => {
        this.traits.forEach(trait => trait.destroy());
    };
    traits: Set<Trait> = new Set();
    #canvasListener = new canvasListener(this);
    constructor(scene: Scene,
        terrain: Terrain,
        camera: ArcRotateCamera,
        sea: Sea,
    ) {
        super(scene, terrain, camera, sea);

    }
    public create = (type: string): void => {
        let scene = this.scene;

        if (type == 'house') {
            this.#canvasListener.addListener("pointerdown", function doHouse() {
                let pickInfo: BABYLON.PickingInfo | null;
                //@ts-ignore
                if (pickInfo = scene.pick(scene.pointerX, scene.pointerY, (m) => {
                    return true;
                })) {
                    if (pickInfo.pickedPoint) {
                        let height = 500;
                        var indices = new Uint32Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);
                        var basePositions = [1, -1, 1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, 1, -1, 1, -1, -1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, 1, -1, 1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, -1, -1, -1, -1, 1];
                        var normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0]);

                        var width = 200;
                        var depth = 200;
                        var scaleArray = [width / 2, height / 2, depth / 2];

                        var positions = basePositions.reduce(
                            (accumulator: Array<number>, currentValue, currentIndex) => accumulator.concat(currentValue * scaleArray[currentIndex % 3]),
                            []
                        );
                        let building = new TerraMesh('building', new Float32Array(positions),indices,normals)
                        building.checkCollisions = true;
                        building.position.x = pickInfo.pickedPoint.x;
                        building.position.z = pickInfo.pickedPoint.z;
                        building.position.y = pickInfo.pickedPoint.y + (height * 0.5) - 0.5
                       // var myBox = BABYLON.MeshBuilder.CreateBox("myBox", { height: height, width: 200, depth: 200 }, scene);
                       /* let orgcheckCollision = myBox._checkCollision;
                        myBox._checkCollision = function (collider) {
                            let r = orgcheckCollision.call(myBox, collider);
                            debugger;
                            return r;
                        }*/
                        
                       /* myBox.position.x = pickInfo.pickedPoint.x;
                        myBox.position.z = pickInfo.pickedPoint.z;
                        myBox.position.y = pickInfo.pickedPoint.y + (height * 0.5) - 0.5;*/
                     /*  myBox.position.x = 0;
                        myBox.position.z = 0;
                        myBox.position.y = 0
                        myBox.checkCollisions=true*/
                        console.log(pickInfo);
                    }
                }

            }, {once:true});
        }
    }
}
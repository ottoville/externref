import { UITAB } from "../UITAB.js";


import { canvasListener } from "../traits/canvasListener.js";
import { Trait } from "../traits/trait.js";

import { Terrain } from "../world/terrain.js";

import { Engine } from "../engine.js";
declare const engine:Engine;

export class BuildingsUI extends UITAB {
    static override label = 'Buildings'
    static menuElem = <div><legend style="background-color:white">
        Buildings
</legend>
        <button class="w3-bar-item w3-button">Create house</button>
</div>;
    activate: () => void= () => null;
    destroy: () => void = () => {
        this.traits.forEach(trait => trait.destroy());
    };
    traits: Set<Trait> = new Set();
    #canvasListener: canvasListener;
    constructor(
        terrain: Terrain,
        canvas: HTMLCanvasElement
    ) {
        super(terrain);
        this.#canvasListener = new canvasListener(this, canvas);

    }
    public create = (type: string): void => {
        const scene = engine.scenes.get('main');

        if (type == 'house') {
            this.#canvasListener.addListener("pointerdown", function doHouse() {
                //@ts-ignore
                let pickInfo: BABYLON.PickingInfo | null;
                //@ts-ignore
                if (pickInfo = scene.pick(scene.pointerX, scene.pointerY, (m) => {
                    return true;
                })) {
                    if (pickInfo.pickedPoint) {
                        const height = 500;
                        const indices = new Uint32Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23]);
                        const basePositions = [1, -1, 1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, 1, -1, 1, -1, -1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, 1, -1, 1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, -1, -1, -1, -1, 1];
                        const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0]);

                        const width = 200;
                        const depth = 200;
                        const scaleArray = [width / 2, height / 2, depth / 2] as const;

                        const positions = basePositions.reduce(
                            //@ts-ignore
                            (accumulator: Array<number>, currentValue, currentIndex) => accumulator.concat(currentValue * scaleArray[currentIndex % 3]),
                            []
                        );
                        //@ts-ignore
                        const building = new TerraMesh('building', new Float32Array(positions),indices,normals)
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
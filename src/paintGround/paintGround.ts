//let tempplane: BABYLON.Mesh | null
//let end_position: Vector2

import type { Terrain } from "../world/terrain.js";
import type { PTResultF } from "../types/interfaces/index.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import { canvasListener } from "../traits/canvasListener.js";
import { TerraScene } from "../TerraScene.js";
import { Sea } from "../world/water.js";

//import { rotateMatrix, translate } from "./math.js";

let width: number;
let height: number;
let rotation: number;
interface addListenerOptions extends AddEventListenerOptions {
    lazy?: number;
}
export enum DrawType {
    plane = 1,
    texture = 2,
    line = 3
};
//type test = keyof HTMLElementEventMap;
export abstract class paintGround {
    protected ang360: Angle = new Angle(0);
    protected ang: Angle = new Angle(0);
    #end_position: Float32Array = new Float32Array(2);
    #start_position: Float32Array = new Float32Array(2);
    constructor(
        protected scene: TerraScene,
        protected camera: ArcRotateCamera,
        protected ground: Terrain,
        protected sea: Sea,
        private uitab: canvasListener
    ) {
    };
    public resolve: PTResultF = () => null;
    public activate(callback: PTResultF, options?: any) {
        this.uitab.addListener("pointerdown", this.mainPointerDown, { once: true });
        this.resolve = callback;
    }
    public destroy() {
        this.camera.attachControl(this.scene.gpuscene.renderPassScreen.canvas, true);
    }

    #drawArea = async (evt:PointerEvent) => {

       // this.scene.mainCamera.updatePickingRay();
        


        const ray = {
            origin: new Vector3(this.scene.TerraCameras[0].pickingRay[0], this.scene.TerraCameras[0].pickingRay[1], this.scene.TerraCameras[0].pickingRay[2]),
            direction: new Vector3(this.scene.TerraCameras[0].pickingRay[3], this.scene.TerraCameras[0].pickingRay[4], this.scene.TerraCameras[0].pickingRay[5])
         }
        let distance: number;

        
        let pikked = await this.ground.mesh.intersects(ray);
        if (pikked.pickedPoint) {
            
            this.#end_position.set([pikked.pickedPoint.x, pikked.pickedPoint.z]);
            let width = this.#start_position[0] - this.#end_position[0];

            distance = Math.sqrt(Math.pow(this.#start_position[0] - this.#end_position[0], 2) + Math.pow(this.#start_position[1] - this.#end_position[1], 2));
            height = distance

            if (width < 0)
                rotation = Math.asin((this.#start_position[1] - this.#end_position[1]) / distance);
            else
                rotation = Math.asin((this.#start_position[1] - this.#end_position[1]) / distance) * -1;
            this.ang = new Angle(Math.abs(rotation));
            this.ang360 = this.ang[360](this.#start_position, this.#end_position);
        }
    }

    abstract onMainPointerDown(startingPoint: Float32Array): void;
    abstract onMainPointerUp(end_position: Float32Array, height: number): void;
    abstract onAreaDraw(width: number): Promise<void>;

    #nextDrawWidth: number = 0;
    #drawqueue: boolean = false;
    #busy: boolean = false;

    #mousemove = async (evt: PointerEvent) => {
        //const ray2 = this.scene.createPickingRay(evt.clientX, evt.clientY);
       // await this.scene.mainCamera.updatePickingRay();
        const ray = {
            origin: new Vector3(this.scene.TerraCameras[0].pickingRay[0], this.scene.TerraCameras[0].pickingRay[1], this.scene.TerraCameras[0].pickingRay[2]),
            direction: new Vector3(this.scene.TerraCameras[0].pickingRay[3], this.scene.TerraCameras[0].pickingRay[4], this.scene.TerraCameras[0].pickingRay[5])
        }
      //  let ray = Ray.Zero();
       // this.sceneDeprecated.createPickingRayToRef(this.sceneDeprecated.pointerX, this.sceneDeprecated.pointerY, Matrix.Identity(), ray, this.camera);
        let pikked = await this.ground.mesh.intersects(ray);
        if (pikked.pickedPoint && this.#end_position) {
            //Distance from first point
            let distance = Math.sqrt(Math.pow(this.#start_position[0] - pikked.pickedPoint.x, 2) + Math.pow(this.#start_position[1] - pikked.pickedPoint.z, 2));
            if (Number.isNaN(distance)) {
                throw ("distance is not a number");
            }
            let ang2 = new Angle(Math.acos(Math.abs(pikked.pickedPoint.x - this.#start_position[0]) / distance))
            let dotang = this.ang360.distance(ang2[360](this.#start_position, new Float32Array([pikked.pickedPoint.x, pikked.pickedPoint.z])).rad);

            let v1 = [this.#start_position[1] - pikked.pickedPoint.z, (this.#start_position[0] - pikked.pickedPoint.x) * -1]
            let v2 = [this.#start_position[0] - this.#end_position[0], this.#start_position[1] - this.#end_position[1]];

            let dotprod = height * distance * Math.cos(dotang.rad);

            let fulldotprod = height * height;
            let shadow = height * (dotprod / fulldotprod);

            width = Math.abs(Math.sqrt(Math.pow(Math.abs(distance), 2) - Math.pow(shadow, 2)));
            if (v1[0] * v2[0] + v1[1] * v2[1] < 0)  //Dot product
                width = Math.abs(width) * -1

            //let timed = new Date().getTime();

            this.#nextDrawWidth = width;
            const me = this;
            if (!this.#busy) {
                this.#busy = true
                queueMicrotask(async function q() {
                    me.#drawqueue = false;
                    await me.onAreaDraw(me.#nextDrawWidth);
                    if (me.#drawqueue)
                        queueMicrotask(q);
                    else
                        me.#busy=false
                });
            } else
                this.#drawqueue = true;

            // console.log('onAreaDraw took ', new Date().getTime() - timed);

        }
    }
    private finalClick = (evt: PointerEvent) => {
        //this.canvas.addEventListener('click', async () => {
        //tempplane.material = new BABYLON.CustomMaterial("mat",scene);
        this.scene.TerraCameras[0].unSubscribePickingRay();
        this.uitab.removeListener('pointermove', this.#mousemove);
        //this.canvas.removeEventListener('pointermove', this.mousemove, false);

        // zones.push({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } });
        //(await me.db).transaction("zones", 'readwrite').objectStore("zones").put({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } })
        this.uitab.addListener('pointerdown', this.mainPointerDown, { once: true });
        this.resolve({ coord: this.#start_position, rad: this.ang360.rad, size: { h: height, w: width } });
      //  this.#end_position = null;
    }
    private mouseMoveRegisterClick = (evt: PointerEvent) => {
        this.uitab.addListener('pointerdown', this.finalClick, { once: true });
    }
    #pointerUp = (evt: PointerEvent) => {
        this.uitab.removeListener('pointermove', this.#drawArea);
        
        this.camera.attachControl(this.scene.canvas, true);
        //fix race condition
        if (this.#end_position[0] == 0)
            return;
        try {
            this.onMainPointerUp(this.#end_position, height);
        } catch (e) {
            console.log(e);
        } finally {
            this.uitab.addListener('pointermove', this.#mousemove, { lazy: 25 });
            this.uitab.addListener('pointermove', this.mouseMoveRegisterClick, { once: true });
        }
    }
    private testcounter = 0;

    private mainPointerDown = async (evt: PointerEvent) => {

        if (evt.button !== 0) {
            return;
        }
        // check if we are under a mesh
      /*  var pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, mesh => {
            return mesh === this.ground
        }, false, this.camera);*/

        var pickInfo = await this.scene.pickPromise(evt.clientX, evt.clientY, mesh => { return mesh === this.ground.mesh }, false);

       // console.log(pickInfo);
        if (!pickInfo) {
            console.log('pick did not hit');
            console.log(pickInfo);
            return;
        }
        if (pickInfo.hit && pickInfo.pickedPoint != null) {
            //@ts-ignore
            /*if (pickInfo.pickedMesh === this.sea) {
                console.log('hitted sea');
                debugger;
                return;
            }*/
            this.#start_position = new Float32Array([pickInfo.pickedPoint.x, pickInfo.pickedPoint.z]);
            this.onMainPointerDown(this.#start_position);
            this.camera.detachControl(this.scene.canvas);
            this.scene.TerraCameras[0].subscribePickingRay();
            this.uitab.addListener("pointermove", this.#drawArea, { lazy: 25 });

            this.uitab.addListener("pointerup", this.#pointerUp, { once: true });
        } else {
            console.debug('no pickinfo pickedpoint');
            console.log(pickInfo);
        }
    };
}


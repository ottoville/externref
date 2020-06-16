let startingPoint: Vector2;
//let tempplane: BABYLON.Mesh | null
//let end_position: Vector2

import { UITAB } from "../UITAB.js";
import type { Terrain } from "../world/terrain.js";
import type { PTResultF } from "../types/interfaces/index.js";
import { Ray } from "../lib/babylon/Culling/ray.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { Mesh } from "../lib/babylon/Meshes/index.js";
import { Vector2 } from "../lib/babylon/Maths/math.vector.js";
import type { WorldScene } from "../world/scene.js";
import { canvasListener } from "../traits/canvasListener.js";
import { GPUCanvas } from "../GPUCanvas.js";

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
    #end_position: Vector2 | null = null;
    constructor(
        protected scene: WorldScene,
        protected camera: ArcRotateCamera,
        protected ground: Terrain,
        protected sea: Mesh,
        private uitab: canvasListener
    ) {
    };
    public resolve: PTResultF = () => null;
    public activate(callback: PTResultF, options?: any) {
        this.uitab.addListener("pointerdown", this.mainPointerDown, { once: true });
        this.resolve = callback;
    }
    public destroy() {
        this.camera.attachControl(GPUCanvas.canvas, true);
    }

    #drawArea = (evt:PointerEvent) => {
        let engine = this.scene.getEngine();
        engine.resize();

        let ray = Ray.Zero();
        this.scene.createPickingRayToRef(this.scene.pointerX, this.scene.pointerY, this.ground.getWorldMatrix(), ray, this.camera);

        let distance: number;

        let pikked = this.ground.intersects(ray);
        if (pikked.pickedPoint) {
            this.#end_position = new Vector2(pikked.pickedPoint.x, pikked.pickedPoint.z);

            let width = startingPoint.x - this.#end_position.x;

            distance = Math.sqrt(Math.pow(startingPoint.x - this.#end_position.x, 2) + Math.pow(startingPoint.y - this.#end_position.y, 2));
            height = distance

            if (width < 0)
                rotation = Math.asin((startingPoint.y - this.#end_position.y) / distance);
            else
                rotation = Math.asin((startingPoint.y - this.#end_position.y) / distance) * -1;
            this.ang = new Angle(Math.abs(rotation));
            //@ts-ignore
            this.ang360 = this.ang[360](startingPoint, this.#end_position);
        }
    }

    abstract onMainPointerDown(startingPoint: Vector2): void;
    abstract onMainPointerUp(end_position: Vector2, height: number): void;
    abstract onAreaDraw(width: number): Promise<void>;

    #nextDrawWidth: number = 0;
    #drawqueue: boolean = false;
    #busy: boolean = false;

    #mousemove = (evt: PointerEvent) => {
        let ray = Ray.Zero();
        this.scene.createPickingRayToRef(this.scene.pointerX, this.scene.pointerY, this.ground.getWorldMatrix(), ray, this.camera);
        let pikked = this.ground.intersects(ray);
        if (pikked.pickedPoint && this.#end_position) {
            //Distance from first point
            let distance = Math.sqrt(Math.pow(startingPoint.x - pikked.pickedPoint.x, 2) + Math.pow(startingPoint.y - pikked.pickedPoint.z, 2));
            if (Number.isNaN(distance)) {
                throw ("distance is not a number");
            }
            let ang2 = new Angle(Math.acos(Math.abs(pikked.pickedPoint.x - startingPoint.x) / distance))
            //@ts-ignore
            let dotang = this.ang360.distance(ang2[360](startingPoint, new Vector2(pikked.pickedPoint.x, pikked.pickedPoint.z)).rad);

            let v1 = [startingPoint.y - pikked.pickedPoint.z, (startingPoint.x - pikked.pickedPoint.x) * -1]
            let v2 = [startingPoint.x - this.#end_position.x, startingPoint.y - this.#end_position.y];

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

        this.uitab.removeListener('pointermove', this.#mousemove);
        //this.canvas.removeEventListener('pointermove', this.mousemove, false);

        // zones.push({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } });
        //(await me.db).transaction("zones", 'readwrite').objectStore("zones").put({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } })
        this.uitab.addListener('pointerdown', this.mainPointerDown, { once: true });
        this.resolve({ coord: startingPoint, rad: this.ang360.rad, size: { h: height, w: width } });
        this.#end_position = null;
    }
    private mouseMoveRegisterClick = (evt: PointerEvent) => {
        this.uitab.addListener('pointerdown', this.finalClick, { once: true });
    }
    #pointerUp = (evt: PointerEvent) => {
        this.uitab.removeListener('pointermove', this.#drawArea);
        this.camera.attachControl(GPUCanvas.canvas, true);
        //fix race condition
        if (this.#end_position == null)
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

        var pickInfo = await this.scene.pickPromise(this.scene.pointerX, this.scene.pointerY, mesh => { return mesh === this.ground }, false, this.camera);

       // console.log(pickInfo);
        if (!pickInfo) {
            console.log('pick did not hit');
            console.log(pickInfo);
            return;
        }
        if (pickInfo.hit && pickInfo.pickedPoint != null) {
            if (pickInfo.pickedMesh === this.sea) {
                console.log('hitted sea');
                return;
            }
            startingPoint = new Vector2(pickInfo.pickedPoint.x, pickInfo.pickedPoint.z);
            console.debug('Calling child onMainPointerDown');
            this.onMainPointerDown(startingPoint);
            this.camera.detachControl(GPUCanvas.canvas);

            this.uitab.addListener("pointermove", this.#drawArea, { lazy: 25 });

            this.uitab.addListener("pointerup", this.#pointerUp, { once: true });
        } else {
            console.debug('no pickinfo pickedpoint');
            console.log(pickInfo);
        }
    };
}


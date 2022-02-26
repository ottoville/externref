//let tempplane: BABYLON.Mesh | null
//let end_position: Vector2
const fullRad = Math.PI * 2
import { TerraVector2, Angle } from "../Math.js";

import type { Terrain } from "../world/terrain.js";
import type { PTResultF } from "../types/interfaces/index.js";
import type { hasCanvasListener } from "../traits/canvasListener.js";
import type { Sea } from "../world/water.js";
import type { Scene } from "../Scene.js";
import { Engine } from "../engine.js";
declare const engine:Engine;


let width: number;
let height: number;
//let rotation: number;

export enum DrawType {
    plane = 1,
    texture = 2,
    line = 3
}
//type test = keyof HTMLElementEventMap;
export abstract class paintGround {
    protected ang360: Angle = new Angle(0);
    #end_position: Float32Array = new Float32Array(2);
    #start_position = new TerraVector2(2);
    constructor(
        protected scene: Scene,
        protected ground: Terrain,
        protected sea: Sea,
        private uitab: hasCanvasListener,
        public resolve: PTResultF
    ) {
        this.uitab.canvasListener.addListener("pointerdown", this.#mainPointerDown, { once: true });
    }
    //public resolve: PTResultF = () => null;
    /* public activate(callback: PTResultF) {
         this.uitab.canvasListener.addListener("pointerdown", this.#mainPointerDown, { once: true });
         this.resolve = callback;
     }*/
    public destroy() {
        this.uitab.canvasListener.destroy();
    }

    #drawVector = new TerraVector2(2);

    #drawArea = async () => {
        const pickInfo = await engine.gpu.renderPassScreen.pickMesh(undefined, mesh => { return mesh === this.ground.mesh });
        if (pickInfo) {
            this.#end_position[0] = pickInfo.position[0];
            this.#end_position[1] = pickInfo.position[2];
            this.#drawVector[0] = this.#start_position[0] - this.#end_position[0];
            this.#drawVector[1] = (this.#start_position[1] - this.#end_position[1]) * -1

            height = Math.sqrt(this.#drawVector[0] * this.#drawVector[0] + this.#drawVector[1] * this.#drawVector[1])

            const rad = Math.atan(Math.abs(this.#drawVector[1]) / Math.abs(this.#drawVector[0]));
            if (this.#drawVector[1] < 0) {
                if (this.#drawVector[0] > 0)
                    this.ang360 = new Angle(fullRad - rad);
                else
                    this.ang360 = new Angle(Math.PI + rad);
            } else if (this.#drawVector[0] < 0)
                this.ang360 = new Angle(Math.PI - rad);
            else
                this.ang360 = new Angle(rad);
        } else {
            console.debug('no pickinfo pickedpoint');
            console.log(pickInfo);
        }

    }

    abstract onMainPointerDown(startingPoint: Float32Array): void;
    abstract onMainPointerUp(height: number, end_position: Float32Array): void;
    abstract onAreaDraw(width: number): void;
    #mousemove = async () => {
        const pickInfo = await engine.gpu.renderPassScreen.pickMesh(undefined, mesh => { return mesh === this.ground.mesh })
        if (pickInfo && this.#end_position) {
            //Distance from first point
            const p0 = this.#start_position[0] - pickInfo.position[0];
            const p1 = this.#start_position[1] - pickInfo.position[2];

            const distanceSquared = p0 * p0 + p1 * p1;

            let rad = Math.atan(Math.abs(p1) / Math.abs(p0));
            if (p1 > 0) {
                if (p0 > 0) {
                    rad = fullRad - rad;
                }
                else
                    rad += Math.PI;
            }
            else if (p0 < 0) {
                rad = Math.PI - rad;
            }

            const dotang = this.ang360.distance(rad);
            //console.log(rad);
            //console.log(dotang);

            /* let dotprod = height * distance * Math.cos(dotang.rad);
                let shadow = dotprod / height;
                width = Math.sqrt(Math.pow(distance, 2) - Math.pow(shadow, 2));*/
            width = Math.sqrt(distanceSquared - distanceSquared * Math.pow(Math.cos(dotang.rad), 2));

            if (p1 * this.#drawVector[0] + p0 * this.#drawVector[1] < 0)  //Dot product
                width *= -1;
            this.onAreaDraw(width);
        }
    }
    #finalClick = () => {
        //this.canvas.addEventListener('click', async () => {
        //tempplane.material = new BABYLON.CustomMaterial("mat",scene);
        this.uitab.canvasListener.removeListener('pointermove', this.#mousemove);
        //this.canvas.removeEventListener('pointermove', this.mousemove, false);

        // zones.push({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } });
        //(await me.db).transaction("zones", 'readwrite').objectStore("zones").put({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } })
        this.uitab.canvasListener.addListener('pointerdown', this.#mainPointerDown, { once: true });
        this.resolve({ coord: this.#start_position, rad: this.ang360.rad, size: { h: height, w: width } });
    }
    private mouseMoveRegisterClick = () => {
        this.uitab.canvasListener.addListener('pointerdown', this.#finalClick, { once: true });
    }
    #pointerUp = () => {
        this.uitab.canvasListener.removeListener('pointermove', this.#drawArea);
        engine.inputManager?.enable();
        //fix race condition
        if (this.#end_position[0] == 0)
            return;
        try {
            this.onMainPointerUp(height, this.#end_position);
        } catch (e) {
            console.log(e);
        } finally {
            this.uitab.canvasListener.addListener('pointermove', this.#mousemove, { lazy: 25 });
            this.uitab.canvasListener.addListener('pointermove', this.mouseMoveRegisterClick, { once: true });
        }
    }

    #mainPointerDown = async (evt: PointerEvent) => {
        if (evt.button !== 0) {
            this.uitab.canvasListener.addListener('pointerdown', this.#mainPointerDown, { once: true });
            return;
        }
        // check if we are under a mesh
        /*  var pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, mesh => {
              return mesh === this.ground
          }, false, this.camera);*/
        const pickInfo = await engine.gpu.renderPassScreen.pickMesh(undefined, mesh => { return mesh === this.ground.mesh });
        if (pickInfo) {
            console.log(pickInfo)
            this.#start_position = new TerraVector2([pickInfo.position[0], pickInfo.position[2]]);
            this.onMainPointerDown(this.#start_position);
            engine.inputManager?.disable();
            this.uitab.canvasListener.addListener("pointermove", this.#drawArea, { lazy: 25 });

            this.uitab.canvasListener.addListener("pointerup", this.#pointerUp, { once: true });
        } else {
            console.debug('no pickinfo pickedpoint');
            console.log(pickInfo);
        }
    };
}


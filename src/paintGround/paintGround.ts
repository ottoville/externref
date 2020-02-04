let startingPoint: Vector2;
//let tempplane: BABYLON.Mesh | null
let end_position: Vector2

import { LazyEval } from "../LazyEval.js";
import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
//import { rotateMatrix, translate } from "./math.js";

let subTextureCache: subTexture;
let planeorgpos: BABYLON.Vector3;
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
    //private type: DrawType;
    protected ang360: Angle = new Angle(0);
    protected ang: Angle = new Angle(0);
    //private forceSharedVertices = true;
    //private updateSubTextureLocal: any;
    constructor(
        public canvas: HTMLElement,
        protected scene: BABYLON.Scene,
        protected camera: BABYLON.ArcRotateCamera,
        protected ground: Terrain,
        protected sea: BABYLON.Mesh,
        private uitab: UITAB
    ) {
    };
    public resolve: PTResultF = () => null;
    public activate(callback: PTResultF, options?) {
        this.uitab.addListener("pointerdown", this.mainPointerDown, { once: true });
        this.resolve = callback;
    }
    public deactivate() {
       /* this.uitab.listeners.forEach((map, type) => {
            map.forEach((proxy, listener) => {
                this.canvas.removeEventListener(type, proxy || listener);
            });
            map.clear();
         });*/
        this.camera.attachControl(this.canvas, true);
    }

    private drawArea = (evt:PointerEvent) => {
        let engine = this.scene.getEngine();
        engine.resize();

        let ray = BABYLON.Ray.Zero();
        this.scene.createPickingRayToRef(this.scene.pointerX, this.scene.pointerY, this.ground.getWorldMatrix(), ray, this.camera);

        let distance: number;

        let pikked = this.ground.intersects(ray);
        if (pikked.pickedPoint) {
            end_position = new Vector2(pikked.pickedPoint.x, pikked.pickedPoint.z);

            let width = startingPoint.x - end_position.x;

            distance = Math.sqrt(Math.pow(startingPoint.x - end_position.x, 2) + Math.pow(startingPoint.y - end_position.y, 2));
            height = distance

            if (width < 0)
                rotation = Math.asin((startingPoint.y - end_position.y) / distance);
            else
                rotation = Math.asin((startingPoint.y - end_position.y) / distance) * -1;
            this.ang = new Angle(Math.abs(rotation));
            this.ang360 = this.ang[360](startingPoint, end_position);
        }
    }

    abstract onMainPointerDown(startingPoint: Vector2): void;
    abstract onMainPointerUp(end_position: Vector2, height: number): void;
    abstract onAreaDraw(width:number): void;
    private mousemove = (evt: PointerEvent) => {
        let ray = BABYLON.Ray.Zero();
        this.scene.createPickingRayToRef(this.scene.pointerX, this.scene.pointerY, this.ground.getWorldMatrix(), ray, this.camera);
        let pikked = this.ground.intersects(ray);
        if (pikked.pickedPoint) {
            //Distance from first point
            let distance = Math.sqrt(Math.pow(startingPoint.x - pikked.pickedPoint.x, 2) + Math.pow(startingPoint.y - pikked.pickedPoint.z, 2));
            if (Number.isNaN(distance)) {
                throw ("distance is not a number");
            }
            let ang2 = new Angle(Math.acos(Math.abs(pikked.pickedPoint.x - startingPoint.x) / distance))

            let dotang = this.ang360.distance(ang2[360](startingPoint, new Vector2(pikked.pickedPoint.x, pikked.pickedPoint.z)).rad);

            let v1 = [startingPoint.y - pikked.pickedPoint.z, (startingPoint.x - pikked.pickedPoint.x) * -1]
            let v2 = [startingPoint.x - end_position.x, startingPoint.y - end_position.y];

            let dotprod = height * distance * Math.cos(dotang.rad);

            let fulldotprod = height * height;
            let shadow = height * (dotprod / fulldotprod);

            width = Math.abs(Math.sqrt(Math.pow(Math.abs(distance), 2) - Math.pow(shadow, 2)));
            if (v1[0] * v2[0] + v1[1] * v2[1] < 0)  //Dot product
                width = Math.abs(width) * -1

            //let timed = new Date().getTime();
            this.onAreaDraw(width);
            // console.log('onAreaDraw took ', new Date().getTime() - timed);

        }
    }
    private finalClick = (evt: PointerEvent) => {
        //this.canvas.addEventListener('click', async () => {
        //tempplane.material = new BABYLON.CustomMaterial("mat",scene);

        this.uitab.removeListener('pointermove', this.mousemove);
        //this.canvas.removeEventListener('pointermove', this.mousemove, false);

        // zones.push({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } });
        //(await me.db).transaction("zones", 'readwrite').objectStore("zones").put({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } })
        this.uitab.addListener('pointerdown', this.mainPointerDown, { once: true });
        this.resolve({ coord: startingPoint, rad: this.ang360.rad, size: { h: height, w: width } });
    }
    private mouseMoveRegisterClick = (evt: PointerEvent) => {
        this.uitab.addListener('pointerdown', this.finalClick, { once: true });
    }
    private pointerUp = (evt:PointerEvent) => {
        try {
            this.uitab.removeListener('pointermove', this.drawArea);
            this.onMainPointerUp(end_position, height);
            this.camera.attachControl(this.canvas, true);
        } catch (e) {
            console.log(e);
        } finally {
            this.uitab.addListener('pointermove', this.mousemove, { lazy: 25 });
            this.uitab.addListener('pointermove', this.mouseMoveRegisterClick, { once: true })
        }
    }
    private testcounter = 0;

    private mainPointerDown = (evt: PointerEvent) => {
        
        if (evt.button !== 0) {
            return;
        }
        // check if we are under a mesh
        var pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, mesh => {
            return mesh === this.ground
        }, false, this.camera);
       // console.log(pickInfo);
        if (!pickInfo)
            return;
        if (pickInfo.hit && pickInfo.pickedPoint!=null) {
            if (pickInfo.pickedMesh === this.sea) {
                console.log('hitted sea');
                return;
            }
            startingPoint = new Vector2(pickInfo.pickedPoint.x, pickInfo.pickedPoint.z);

            this.onMainPointerDown(startingPoint);
            this.camera.detachControl(this.canvas);
            
            this.uitab.addListener("pointermove", this.drawArea, {lazy:25});


            //There is a race condition. this.drawarea is lazyevaled every 25ms. pointerup event need variables initialized by lazy function. If it is too lazy those variables are undefined.

            this.uitab.addListener("pointerup", this.pointerUp, {once:true});
        }
    };
}


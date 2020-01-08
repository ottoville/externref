let startingPoint: Vector3;
//let tempplane: BABYLON.Mesh | null
let end_position: Vector3

import { LazyEval } from "../LazyEval.js";
//import { rotateMatrix, translate } from "./math.js";

let subTextureCache: subTexture;
let planeorgpos: BABYLON.Vector3;
let width: number;
let height: number;
let rotation: number;

export enum DrawType {
    plane = 1,
    texture = 2,
    line = 3
};
export abstract class paintGround {
    //private type: DrawType;
    protected ang360: Angle;
    protected ang: Angle;
    //private forceSharedVertices = true;
    //private updateSubTextureLocal: any;
    constructor(
        public canvas: HTMLElement,
        protected scene: BABYLON.Scene,
        protected camera: BABYLON.ArcRotateCamera,
        protected ground: BABYLON.GroundMesh,
        protected sea: BABYLON.Mesh,
    ) {
    };
    public resolve: PTResultF;
    public activate(callback: PTResultF, options?) {
       /* this.type = type;
        if (type == DrawType.plane) {
            if (typeof (options.forceSharedVertices) !== 'undefined')
                this.forceSharedVertices = options.forceSharedVertices;
        }
        if (type == DrawType.texture)
            this.updateSubTextureLocal = updateSubTexture.bind(this.scene.getEngine());
        */
        
        this.canvas.addEventListener("pointerdown", this.mainPointerDown, {once:true});
        this.resolve = callback;
    }
    public deactivate() {
        this.canvas.removeEventListener("pointerdown", this.mainPointerDown, false);
        this.canvas.removeEventListener('pointermove', this.mousemove, false);
        this.camera.attachControl(this.canvas, true);
       /* if (this.type == DrawType.plane) {
            tempplane.dispose();
            tempplane = null;
        }*/
    }

    private drawArea = evt => {
        this.drawArea2.eval(25, evt)
    }
    private drawArea2 = new LazyEval((evt: PointerEvent) => {
        let engine = this.scene.getEngine();
        engine.resize();

        let ray = BABYLON.Ray.Zero();
        this.scene.createPickingRayToRef(this.scene.pointerX, this.scene.pointerY, this.ground.getWorldMatrix(), ray, this.camera);

        let distance: number;

        let pikked = this.ground.intersects(ray);
        if (pikked.pickedPoint) {
            end_position = new Vector3(pikked.pickedPoint.x, pikked.pickedPoint.y, pikked.pickedPoint.z);
            end_position.y = 1;
            let width = startingPoint.x - end_position.x;

            distance = Math.sqrt(Math.pow(startingPoint.x - end_position.x, 2) + Math.pow(startingPoint.z - end_position.z, 2));
            height = distance

            if (width < 0)
                rotation = Math.asin((startingPoint.z - end_position.z) / distance);
            else
                rotation = Math.asin((startingPoint.z - end_position.z) / distance) * -1;
            this.ang = new Angle(Math.abs(rotation));
            this.ang360 = this.ang[360](startingPoint, end_position);
        }
    });
    abstract onMainPointerDown(startingPoint: Vector3): void;
    abstract onMainPointerUp(end_position: Vector3, height: number): void;
    abstract onAreaDraw(width:number): void;
    private mousemove2 = new LazyEval((evt: PointerEvent) => {
        let ray = BABYLON.Ray.Zero();
        this.scene.createPickingRayToRef(this.scene.pointerX, this.scene.pointerY, this.ground.getWorldMatrix(), ray, this.camera);
        let pikked = this.ground.intersects(ray);
        if (pikked.pickedPoint) {
            //Distance from first point
            let distance = Math.sqrt(Math.pow(startingPoint.x - pikked.pickedPoint.x, 2) + Math.pow(startingPoint.z - pikked.pickedPoint.z, 2));
            if (Number.isNaN(distance)) {
                throw ("distance is not a number");
            }
            let ang2 = new Angle(Math.acos(Math.abs(pikked.pickedPoint.x - startingPoint.x) / distance))

            let dotang = this.ang360.distance(ang2[360](startingPoint, <Vector3><unknown>pikked.pickedPoint).rad);

            let v1 = [startingPoint.z - pikked.pickedPoint.z, (startingPoint.x - pikked.pickedPoint.x)*-1]
            let v2 = [startingPoint.x - end_position.x, startingPoint.z - end_position.z];

            let dotprod = height * distance * Math.cos(dotang.rad);

            let fulldotprod = height * height;
            let shadow = height * (dotprod / fulldotprod);

            width = Math.abs(Math.sqrt(Math.pow(Math.abs(distance), 2) - Math.pow(shadow, 2)));
            if (v1[0] * v2[0] + v1[1] * v2[1] < 0) {  //Dot product
                width = Math.abs(width) * -1
            }
            //let timed = new Date().getTime();
            this.onAreaDraw(width);
           // console.log('onAreaDraw took ', new Date().getTime() - timed);

        }

    });
    private mousemove = (evt: PointerEvent) => {
        this.mousemove2.eval(25, evt)
    }

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
        if (pickInfo.hit) {
            if (pickInfo.pickedMesh === this.sea) {
                console.log('hitted sea');
                return;
            }
            startingPoint = <Vector3><unknown>pickInfo.pickedPoint;

            this.onMainPointerDown(startingPoint);

            this.camera.detachControl(this.canvas);
            this.canvas.addEventListener("pointermove", this.drawArea, false);
            let me = this;

            this.canvas.addEventListener("pointerup", (evt) => {
                try {
                    this.canvas.removeEventListener('pointermove', this.drawArea, false);
                    this.onMainPointerUp(end_position, height);

                    end_position.y = 1;
                    this.camera.attachControl(this.canvas, true);
                } catch (e) {
                    console.log(e);
                } finally {
                    this.canvas.addEventListener('pointermove', this.mousemove, false);
                    this.canvas.addEventListener('pointermove', () => {
                        this.canvas.addEventListener('click', async () => {
                            //tempplane.material = new BABYLON.CustomMaterial("mat",scene);

                            this.canvas.removeEventListener('pointermove', this.mousemove, false);

                            // zones.push({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } });
                            //(await me.db).transaction("zones", 'readwrite').objectStore("zones").put({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } })
                            this.canvas.addEventListener('pointerdown', this.mainPointerDown, { once: true });
                            this.resolve({ coord: startingPoint, ang: this.ang360, size: { h: height, w: width } });
                        }, { once: true });

                    }, {once:true})

                }
            }, {once:true});
        }
    };
}


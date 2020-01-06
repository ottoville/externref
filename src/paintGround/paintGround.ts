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
           // console.log(this.ang360.deg)
        }
        //if (this.type == DrawType.plane) {
        //meshCenter = end_position.subtract(global_position).divide(new BABYLON.Vector3(2, 2, 2));
        // tempplane.position = global_position.add(meshCenter)


        //tempplane.rotation.y = this.ang360.rad;
        //tempplane.scaling.x = height;
        //}
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

            let mouseside = -1;

            let dotang = this.ang360.distance(ang2[360](startingPoint, <Vector3><unknown>pikked.pickedPoint).rad);
            let dotprod = height * distance * Math.cos(dotang.rad);

            let fulldotprod = height * height;
            let shadow = height * (dotprod / fulldotprod);
            width = Math.abs(Math.sqrt(Math.pow(Math.abs(distance), 2) - Math.pow(shadow, 2)));
            //replace mouseside with crossproduct
            if (ang2[360](startingPoint, <Vector3><unknown>pikked.pickedPoint).deg > this.ang[360](startingPoint, end_position).deg) {
                if (ang2[360](startingPoint, <Vector3><unknown>pikked.pickedPoint).deg - this.ang[360](startingPoint, end_position).deg > 180)
                    mouseside = 1
            }
            else if (ang2[360](startingPoint, <Vector3><unknown>pikked.pickedPoint).deg < this.ang[360](startingPoint, end_position).deg) {
                if (this.ang[360](startingPoint, end_position).deg - ang2[360](startingPoint, <Vector3><unknown>pikked.pickedPoint).deg < 180)
                    mouseside = 1
            }
            console.log(mouseside);
            if (mouseside < 0) {
                width = Math.abs(width) * -1
            }
            let timed = new Date().getTime();
            this.onAreaDraw(width);
           // console.log('onAreaDraw took ', new Date().getTime() - timed);

        }
        //let currentpickInfo2 = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => (mesh === this.ground), undefined, this.camera);
        
      /*  let brad = Math.PI / 2 - this.ang.rad;
        let halfw = width / 2;
        let addX = Math.cos(brad) * halfw
        let addZ = Math.sin(brad) * halfw;

        if (this.ang360.deg < 180)
            addX = addX * -1
        if (this.ang360.deg > 270 || this.ang360.deg < 90)
            addZ = addZ * -1*/
       
      /*  if (this.type == DrawType.plane) {
            if (this.forceSharedVertices)
                tempplane.forceSharedVertices();
            tempplane.scaling.z = width;
            tempplane.position.x = planeorgpos.x + addX;
            tempplane.position.z = planeorgpos.z + addZ;


            let positions = tempplane.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            if (positions == null) {
                throw ('getVerticesData returned null');
            }
            var numberOfVertices = positions.length / 3;
            var rotmax = rotateMatrix(this.ang360.rad, "y");
            for (var i = 0; i < numberOfVertices; i++) {
                let posX = (positions[i * 3]) * tempplane.scaling.x
                let posZ = (positions[i * 3 + 2]) * tempplane.scaling.z
                let translated = translate(posX, 0, posZ, rotmax);
                positions[i * 3 + 1] = this.ground.getHeightAtCoordinates(tempplane.position.x + translated.x, tempplane.position.z + translated.z)
            }
            tempplane.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);

        }*/
       /* if (this.type == DrawType.texture) {
            subTextureCache = this.updateSubTextureLocal(this.zonedt, width * -1, height * -1, startingPoint, this.ang360, subTextureCache);
        }*/

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

           /* if (this.type == DrawType.plane) {
                tempplane = BABYLON.MeshBuilder.CreateTiledGround("tgd2", { xmin: -0.5, xmax: 0.5, zmin: -0.5, zmax: 0.5, subdivisions: { w: 10, h: 10 }, precision: { w: 0, h: 0 }, updatable: true }, this.scene);

                tempplane.scaling.z = 10;
                tempplane.scaling.x = 10;
                tempplane.rotation.y = Math.PI / 2;

                tempplane.position.x = startingPoint.x - 0.5

                tempplane.position.z = startingPoint.z - 1

                tempplane.material = new BABYLON.StandardMaterial("planeMat2", this.scene);
                tempplane.material.wireframe = true;
                if (this.forceSharedVertices) {
                    let uvdata = tempplane.getVerticesData(BABYLON.VertexBuffer.UVKind);
                    for (let uv = 0; uv < uvdata.length; uv++) {
                        uvdata[uv] = 0;
                    }
                    tempplane.updateVerticesData(BABYLON.VertexBuffer.UVKind, uvdata);
                }
            }*/
            this.camera.detachControl(this.canvas);
            this.canvas.addEventListener("pointermove", this.drawArea, false);
            let me = this;

            this.canvas.addEventListener("pointerup", (evt) => {
                try {
                    this.canvas.removeEventListener('pointermove', this.drawArea, false);
                    this.onMainPointerUp(end_position, height);
                   /* if (this.type == DrawType.plane) {
                        let meshCenter: Vector3 = end_position.subtract(startingPoint).divide(new Vector3(2, 2, 2));
                        tempplane.position = (<BABYLON.Vector3><unknown>startingPoint).add(new BABYLON.Vector3(meshCenter.x, meshCenter.y, meshCenter.z))
                        tempplane.position.y = 0.2;
                        tempplane.scaling.x = height;
                        tempplane.rotation.y = this.ang360.rad;
                        planeorgpos = tempplane.position.clone();
                    }

                    subTextureCache = null;*/
                    //this.addEventListener('pointermove', me.pmove2, false);
                   
                    end_position.y = 1;
                    /*if (this.type == DrawType.line) {
                        var lines = BABYLON.MeshBuilder.CreateLines("lines", { points: [<BABYLON.Vector3><unknown>startingPoint, <BABYLON.Vector3><unknown>end_position] }, me.scene);
                    }*/
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


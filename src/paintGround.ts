let startingPoint: Vector3;
let tempplane: BABYLON.Mesh
let global_position: BABYLON.Vector3
let end_position: BABYLON.Vector3

import { updateSubTexture } from "./triginometry.js";
//import { rotateMatrix, translate } from "./math.js";


let width: number;
let height: number;
let rotation: number;

export enum DrawType {
    plane=1,
    texture=2,
    line=3
};
export class paintGround {
    private type:DrawType;
    private ang360: Angle;
    private ang: Angle;
    private forceSharedVertices=true;
    constructor(
        public canvas: HTMLElement,
        private scene: BABYLON.Scene,
        private camera: BABYLON.ArcRotateCamera,
        private ground: BABYLON.GroundMesh,
        private sea: BABYLON.Mesh,
        private zonedt:BABYLON.Texture,
    ) {
        
    };
    public resolve: PTResultF;
    public activate(type:DrawType, options: {forceSharedVertices?:boolean}, callback:PTResultF) {
        this.type=type;
        if(type==DrawType.plane) {
            if(typeof(options.forceSharedVertices)!=='undefined')
                this.forceSharedVertices=options.forceSharedVertices;
        }
        tempplane = null;
        console.log('add pointer down to ', this.canvas)
        this.canvas.addEventListener("pointerdown", this.mainPointerDown, false);
        this.resolve=callback;
    }
    public deactivate() {
        this.canvas.removeEventListener("pointerdown", this.mainPointerDown, false);
    }
   
    private drawArea = evt => {
        let engine = this.zonedt.getScene().getEngine();
        engine.resize();

        let ray = BABYLON.Ray.Zero();
        this.scene.createPickingRayToRef(this.scene.pointerX, this.scene.pointerY, this.ground.getWorldMatrix(), ray, this.camera);

        let distance: number;

        let pikked = this.ground.intersects(ray);

        end_position = pikked.pickedPoint;
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

        if (this.type==DrawType.plane) {
            //meshCenter = end_position.subtract(global_position).divide(new BABYLON.Vector3(2, 2, 2));
           // tempplane.position = global_position.add(meshCenter)


            //tempplane.rotation.y = this.ang360.rad;
            //tempplane.scaling.x = height;
        }
    }
    private mainPointerDown = (evt: PointerEvent) => {
        let planeorgpos: BABYLON.Vector3;
        if (evt.button !== 0) {
            console.log('evt.button !== 0');
            return;
        }
        // check if we are under a mesh
        console.log(this.scene.pointerX, this.scene.pointerY);
        var pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, mesh => {
            return mesh === this.ground
        }, false, this.camera);
        if (pickInfo.hit) {
            if (pickInfo.pickedMesh === this.sea) {
                console.log('hitted sea');
                return;
            }
            console.log('hitted other than sea');
            /*if (!this.zoneToggle.checked) {
                this.zoneToggle.checked = true;
                var evtt = document.createEvent("HTMLEvents");
                evtt.initEvent("change", false, true);
                this.zoneToggle.dispatchEvent(evtt);
            }*/
            this.canvas.removeEventListener('pointerdown', this.mainPointerDown, false);
            startingPoint = <Vector3><unknown>pickInfo.pickedPoint;

            var sphereLocalOrigin = BABYLON.MeshBuilder.CreateSphere("sphereLO", { diameter: .5 }, this.scene);
            sphereLocalOrigin.material = new BABYLON.StandardMaterial("origin", this.scene);
            sphereLocalOrigin.position = <BABYLON.Vector3><unknown>startingPoint;
            sphereLocalOrigin.computeWorldMatrix();
            var matrix = sphereLocalOrigin.getWorldMatrix();
            var local_position = new BABYLON.Vector3(0, 1, 0);
            global_position = BABYLON.Vector3.TransformCoordinates(local_position, matrix);
            global_position.y = 50;


            if (this.type==DrawType.plane) {
        
                tempplane = BABYLON.MeshBuilder.CreateTiledGround("tgd2", { xmin: -0.5, xmax: 0.5, zmin: -0.5, zmax: 0.5, subdivisions: { w: 10, h: 10 }, precision: { w: 0, h: 0 }, updatable: true }, this.scene);

                tempplane.scaling.z=10;
                tempplane.scaling.x=10;
                tempplane.rotation.y = Math.PI / 2;
               
                tempplane.position.x = global_position.x - 0.5

                tempplane.position.z = global_position.z - 1

                tempplane.material = new BABYLON.StandardMaterial("planeMat2", this.scene);
                tempplane.material.wireframe=true;
                if(this.forceSharedVertices) {
                    let uvdata = tempplane.getVerticesData(BABYLON.VertexBuffer.UVKind);
                    for (let uv = 0; uv < uvdata.length; uv++) {
                        uvdata[uv] = 0;
                    }
                    tempplane.updateVerticesData(BABYLON.VertexBuffer.UVKind, uvdata);
                }

            }
            this.camera.detachControl(this.canvas);
            this.canvas.addEventListener("pointermove", this.drawArea, false);
            let me = this;

            this.canvas.addEventListener("pointerup", function pup(evt) {
                console.log('pointerup');
                this.removeEventListener('pointermove', me.drawArea, false);
                // let currentpickInfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh === ground; });
               // let ang = new Angle(Math.abs(rotation));
               // let ang360 = ang[360](startingPoint, end_position);
                if (me.type == DrawType.plane) {
                    let meshCenter: BABYLON.Vector3 = end_position.subtract(global_position).divide(new BABYLON.Vector3(2, 2, 2));
                    tempplane.position = <BABYLON.Vector3><unknown>global_position.add(meshCenter)
                    tempplane.position.y = 0.2;
                   tempplane.scaling.x = height;
                   tempplane.rotation.y = me.ang360.rad;
   
                    planeorgpos = tempplane.position.clone();
                }

                let clickListenerAdded = false;
                let subTexture: subTexture;
                if(me.type==DrawType.texture) {
                    var updateSubTextureLocal = updateSubTexture.bind(me.zonedt.getScene().getEngine());
                }
                this.addEventListener('pointermove', function pmove2() {
                    let currentpickInfo2 = me.scene.pick(me.scene.pointerX, me.scene.pointerY, function (mesh) { return mesh === me.ground; },undefined,me.camera);
                    //Distance from first point
                    let distance = Math.sqrt(Math.pow(startingPoint.x - currentpickInfo2.pickedPoint.x, 2) + Math.pow(startingPoint.z - currentpickInfo2.pickedPoint.z, 2));
                    if (Number.isNaN(distance)) {
                        throw ("distance is not a number");
                    }
                    //Distance from second point
                    //let distance2 = Math.sqrt(Math.pow(end_position.x - currentpickInfo2.pickedPoint.x, 2) + Math.pow(end_position.z - currentpickInfo2.pickedPoint.z, 2));

                    let ang2 = new Angle(Math.acos(Math.abs(currentpickInfo2.pickedPoint.x - startingPoint.x) / distance))

                    let mouseside = -1;

                    let dotang = me.ang360.distance(ang2[360](startingPoint, <Vector3><unknown>currentpickInfo2.pickedPoint).rad);
                    let dotprod = height * distance * Math.cos(dotang.rad);

                    let fulldotprod = height * height;
                    let shadow = height * (dotprod / fulldotprod);
                   // console.log('distance ', distance, 'shadow', shadow);
                    width = Math.abs(Math.sqrt(Math.pow(Math.abs(distance), 2) - Math.pow(shadow, 2)));
                    if (ang2[360](startingPoint, <Vector3><unknown>currentpickInfo2.pickedPoint).deg > me.ang[360](startingPoint, end_position).deg) {
                        if (ang2[360](startingPoint, <Vector3><unknown>currentpickInfo2.pickedPoint).deg - me.ang[360](startingPoint, end_position).deg > 180)
                            mouseside = 1
                    }
                    else if (ang2[360](startingPoint, <Vector3><unknown>currentpickInfo2.pickedPoint).deg < me.ang[360](startingPoint, end_position).deg) {
                        if (me.ang[360](startingPoint, end_position).deg - ang2[360](startingPoint, <Vector3><unknown>currentpickInfo2.pickedPoint).deg < 180)
                            mouseside = 1
                    }
                    if (mouseside < 0) {
                        width = Math.abs(width) * -1
                    }

                    let brad = Math.PI / 2 - me.ang.rad;
                    let halfw = width / 2;
                    let addX = Math.cos(brad) * halfw
                    let addZ = Math.sin(brad) * halfw;

                    if (me.ang360.deg < 180)
                        addX = addX * -1
                    if (me.ang360.deg > 270 || me.ang360.deg < 90)
                        addZ = addZ * -1
                    if (me.type==DrawType.plane) {
                        if(me.forceSharedVertices)
                            tempplane.forceSharedVertices();
                        tempplane.scaling.z = width;
                        tempplane.position.x = planeorgpos.x + addX;
                        tempplane.position.z = planeorgpos.z + addZ;
                        
                        
                        let positions = tempplane.getVerticesData(BABYLON.VertexBuffer.PositionKind);

                        var numberOfVertices = positions.length / 3;
                        var rotmax=rotateMatrix(me.ang360.rad,"y");
                        for (var i = 0; i < numberOfVertices; i++) {
                            let posX = (positions[i * 3]) * tempplane.scaling.x
                            let posZ = (positions[i * 3 + 2]) * tempplane.scaling.z
                            let translated=translate(posX,0,posZ,rotmax);
                            positions[i * 3 + 1] = me.ground.getHeightAtCoordinates(tempplane.position.x + translated.x, tempplane.position.z + translated.z)
                        }
                        tempplane.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);

                    }
                    if (me.type==DrawType.texture) {
                        subTexture = updateSubTextureLocal(me.zonedt, width * -1, height * -1, startingPoint, me.ang360, subTexture);
                    }
                    if (!clickListenerAdded) {
                        clickListenerAdded = true;
                        this.addEventListener('click', async function pup2() {
                            //tempplane.material = new BABYLON.CustomMaterial("mat",scene);

                            this.removeEventListener('pointermove', pmove2, false);
                            // zones.push({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } });
                            //(await me.db).transaction("zones", 'readwrite').objectStore("zones").put({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } })
                            this.removeEventListener('click', pup2);
                            this.addEventListener('pointerdown', me.mainPointerDown, false);
                            me.resolve({ coord: startingPoint, ang: me.ang360, size: { h: height, w: width } },tempplane);
                        });
                    }

                }, false);
                end_position.y = 1;
                if (me.type==DrawType.line) {
                    var lines = BABYLON.MeshBuilder.CreateLines("lines", { points: [<BABYLON.Vector3><unknown>global_position, <BABYLON.Vector3><unknown>end_position] }, me.scene);
                }
                me.camera.attachControl(this, true);
                this.removeEventListener('pointerup', pup);
            });
        }
    };
}


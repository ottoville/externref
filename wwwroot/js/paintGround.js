var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
let startingPoint;
let tempplane;
let global_position;
let end_position;
import { updateSubTexture } from "./triginometry.js";
//import { rotateMatrix, translate } from "./math.js";
let width;
let height;
let rotation;
export var DrawType;
(function (DrawType) {
    DrawType[DrawType["plane"] = 1] = "plane";
    DrawType[DrawType["texture"] = 2] = "texture";
    DrawType[DrawType["line"] = 3] = "line";
})(DrawType || (DrawType = {}));
;
export class paintGround {
    constructor(canvas, scene, camera, ground, sea, zonedt) {
        this.canvas = canvas;
        this.scene = scene;
        this.camera = camera;
        this.ground = ground;
        this.sea = sea;
        this.zonedt = zonedt;
        this.forceSharedVertices = true;
        this.drawArea = evt => {
            let distance;
            end_position = this.scene.pick(this.scene.pointerX, this.scene.pointerY, mesh => { return mesh === this.ground; }, undefined, this.camera).pickedPoint;
            end_position.y = 1;
            let width = startingPoint.x - end_position.x;
            distance = Math.sqrt(Math.pow(startingPoint.x - end_position.x, 2) + Math.pow(startingPoint.z - end_position.z, 2));
            height = distance;
            if (width < 0)
                rotation = Math.asin((startingPoint.z - end_position.z) / distance);
            else
                rotation = Math.asin((startingPoint.z - end_position.z) / distance) * -1;
            this.ang = new Angle(Math.abs(rotation));
            this.ang360 = this.ang[360](startingPoint, end_position);
            if (this.type == DrawType.plane) {
                //meshCenter = end_position.subtract(global_position).divide(new BABYLON.Vector3(2, 2, 2));
                // tempplane.position = global_position.add(meshCenter)
                //tempplane.rotation.y = this.ang360.rad;
                //tempplane.scaling.x = height;
            }
        };
        this.mainPointerDown = (evt) => {
            let planeorgpos;
            if (evt.button !== 0) {
                return;
            }
            // check if we are under a mesh
            var pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, mesh => { return mesh === this.ground || mesh === this.sea; }, undefined, this.camera);
            if (pickInfo.hit) {
                if (pickInfo.pickedMesh === this.sea) {
                    //console.log('hitted sea');
                    return;
                }
                /*if (!this.zoneToggle.checked) {
                    this.zoneToggle.checked = true;
                    var evtt = document.createEvent("HTMLEvents");
                    evtt.initEvent("change", false, true);
                    this.zoneToggle.dispatchEvent(evtt);
                }*/
                this.canvas.removeEventListener('pointerdown', this.mainPointerDown, false);
                startingPoint = pickInfo.pickedPoint;
                var sphereLocalOrigin = BABYLON.MeshBuilder.CreateSphere("sphereLO", { diameter: .5 }, this.scene);
                sphereLocalOrigin.material = new BABYLON.StandardMaterial("origin", this.scene);
                sphereLocalOrigin.position = startingPoint;
                sphereLocalOrigin.computeWorldMatrix();
                var matrix = sphereLocalOrigin.getWorldMatrix();
                var local_position = new Vector3(0, 1, 0);
                global_position = Vector3.TransformCoordinates(local_position, matrix);
                global_position.y = 50;
                if (this.type == DrawType.plane) {
                    tempplane = BABYLON.MeshBuilder.CreateTiledGround("tgd2", { xmin: -0.5, xmax: 0.5, zmin: -0.5, zmax: 0.5, subdivisions: { w: 10, h: 10 }, precision: { w: 0, h: 0 }, updatable: true }, this.scene);
                    tempplane.scaling.z = 10;
                    tempplane.scaling.x = 10;
                    tempplane.rotation.y = Math.PI / 2;
                    tempplane.position.x = global_position.x - 0.5;
                    tempplane.position.z = global_position.z - 1;
                    tempplane.material = new BABYLON.StandardMaterial("planeMat2", this.scene);
                    tempplane.material.wireframe = true;
                    if (this.forceSharedVertices) {
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
                    this.removeEventListener('pointermove', me.drawArea, false);
                    // let currentpickInfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh === ground; });
                    // let ang = new Angle(Math.abs(rotation));
                    // let ang360 = ang[360](startingPoint, end_position);
                    if (me.type == DrawType.plane) {
                        let meshCenter = end_position.subtract(global_position).divide(new Vector3(2, 2, 2));
                        tempplane.position = global_position.add(meshCenter);
                        tempplane.position.y = 0.2;
                        tempplane.scaling.x = height;
                        tempplane.rotation.y = me.ang360.rad;
                        planeorgpos = tempplane.position.clone();
                    }
                    let clickListenerAdded = false;
                    let subTexture;
                    if (me.type == DrawType.texture) {
                        var func = updateSubTexture.bind(me.zonedt.getScene().getEngine());
                    }
                    this.addEventListener('pointermove', function pmove2() {
                        let currentpickInfo2 = me.scene.pick(me.scene.pointerX, me.scene.pointerY, function (mesh) { return mesh === me.ground; }, undefined, me.camera);
                        //Distance from first point
                        let distance = Math.sqrt(Math.pow(startingPoint.x - currentpickInfo2.pickedPoint.x, 2) + Math.pow(startingPoint.z - currentpickInfo2.pickedPoint.z, 2));
                        //Distance from second point
                        //let distance2 = Math.sqrt(Math.pow(end_position.x - currentpickInfo2.pickedPoint.x, 2) + Math.pow(end_position.z - currentpickInfo2.pickedPoint.z, 2));
                        let ang2 = new Angle(Math.acos(Math.abs(currentpickInfo2.pickedPoint.x - startingPoint.x) / distance));
                        let mouseside = -1;
                        let dotang = me.ang360.distance(ang2[360](startingPoint, currentpickInfo2.pickedPoint).rad);
                        let dotprod = height * distance * Math.cos(dotang.rad);
                        let fulldotprod = height * height;
                        let shadow = height * (dotprod / fulldotprod);
                        width = Math.abs(Math.sqrt(Math.pow(Math.abs(distance), 2) - Math.pow(shadow, 2)));
                        if (ang2[360](startingPoint, currentpickInfo2.pickedPoint).deg > me.ang[360](startingPoint, end_position).deg) {
                            if (ang2[360](startingPoint, currentpickInfo2.pickedPoint).deg - me.ang[360](startingPoint, end_position).deg > 180)
                                mouseside = 1;
                        }
                        else if (ang2[360](startingPoint, currentpickInfo2.pickedPoint).deg < me.ang[360](startingPoint, end_position).deg) {
                            if (me.ang[360](startingPoint, end_position).deg - ang2[360](startingPoint, currentpickInfo2.pickedPoint).deg < 180)
                                mouseside = 1;
                        }
                        if (mouseside < 0) {
                            width = Math.abs(width) * -1;
                        }
                        let brad = Math.PI / 2 - me.ang.rad;
                        let halfw = width / 2;
                        let addX = Math.cos(brad) * halfw;
                        let addZ = Math.sin(brad) * halfw;
                        if (me.ang360.deg < 180)
                            addX = addX * -1;
                        if (me.ang360.deg > 270 || me.ang360.deg < 90)
                            addZ = addZ * -1;
                        if (me.type == DrawType.plane) {
                            if (me.forceSharedVertices)
                                tempplane.forceSharedVertices();
                            tempplane.scaling.z = width;
                            tempplane.position.x = planeorgpos.x + addX;
                            tempplane.position.z = planeorgpos.z + addZ;
                            let positions = tempplane.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                            var numberOfVertices = positions.length / 3;
                            var rotmax = rotateMatrix(me.ang360.rad, "y");
                            for (var i = 0; i < numberOfVertices; i++) {
                                let posX = (positions[i * 3]) * tempplane.scaling.x;
                                let posZ = (positions[i * 3 + 2]) * tempplane.scaling.z;
                                let translated = translate(posX, 0, posZ, rotmax);
                                positions[i * 3 + 1] = me.ground.getHeightAtCoordinates(tempplane.position.x + translated.x, tempplane.position.z + translated.z);
                            }
                            tempplane.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
                        }
                        if (me.type == DrawType.texture) {
                            subTexture = func(me.zonedt, width * -1, height * -1, startingPoint, me.ang360, subTexture);
                        }
                        if (!clickListenerAdded) {
                            clickListenerAdded = true;
                            this.addEventListener('click', function pup2() {
                                return __awaiter(this, void 0, void 0, function* () {
                                    //tempplane.material = new BABYLON.CustomMaterial("mat",scene);
                                    this.removeEventListener('pointermove', pmove2, false);
                                    // zones.push({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } });
                                    //(await me.db).transaction("zones", 'readwrite').objectStore("zones").put({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } })
                                    this.removeEventListener('click', pup2);
                                    this.addEventListener('pointerdown', me.mainPointerDown, false);
                                    me.resolve({ coord: startingPoint, ang: me.ang360, size: { h: height, w: width } }, tempplane);
                                });
                            });
                        }
                    }, false);
                    end_position.y = 1;
                    if (me.type == DrawType.line) {
                        var lines = BABYLON.MeshBuilder.CreateLines("lines", { points: [global_position, end_position] }, me.scene);
                    }
                    me.camera.attachControl(this, true);
                    this.removeEventListener('pointerup', pup);
                });
            }
        };
    }
    ;
    activate(type, options, callback) {
        this.type = type;
        if (type == DrawType.plane) {
            if (typeof (options.forceSharedVertices) !== 'undefined')
                this.forceSharedVertices = options.forceSharedVertices;
        }
        tempplane = null;
        this.canvas.addEventListener("pointerdown", this.mainPointerDown, false);
        this.resolve = callback;
    }
    deactivate() {
        this.canvas.removeEventListener("pointerdown", this.mainPointerDown, false);
    }
}

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
let size = 10000;
import { paintGround, DrawType } from "../paintGround.js";
import { UITAB } from "../UITAB.js";
export class Zones extends UITAB {
    constructor(ground, db, canvas, groundMaterial, scene, camera, sea, zonedt) {
        super();
        this.ground = ground;
        this.db = db;
        this.canvas = canvas;
        this.groundMaterial = groundMaterial;
        this.scene = scene;
        this.camera = camera;
        this.sea = sea;
        this.zonedt = zonedt;
        this.name = "zonestab";
        this.label = "Zones";
        this.createMenu = (form) => {
            form.innerHTML = `
        <fieldset style="background-color:white">
        <legend style="background-color:white">Draw zone</legend>
        <label>
            Residental
            <input type="checkbox" name="planning" value="residental" />
        </label><br>
        <label>
            Industry
            <input type="checkbox" name="planning" value="industry" />
        </label><br>
        <label>
            Commerce
            <input type="checkbox" name="planning" value="commerce" />
        </label>
    </fieldset>
        `;
        };
        this.activate = () => {
            this.activated = true;
            this.ctx = this.zonedt.getContext();
            this.ground.material = this.zonemateria;
            let centerX = size / 2;
            let centerZ = size / 2;
            this.ctx.beginPath();
            this.ctx.fillStyle = "yellow";
            this.ctx.fillRect(0, 0, 10000, 10000);
            let me = this;
            this.db.transaction("zones").objectStore("zones").getAll().onsuccess = function (evt) {
                this.result.forEach(z => {
                    me.ctx.setTransform(1, 0, 0, 1, 0, 0);
                    me.ctx.lineWidth = 1;
                    me.ctx.strokeStyle = "blue";
                    me.ctx.translate(centerX + z.coord.x, centerZ + z.coord.z * -1);
                    me.ctx.rotate(z.ang._rad);
                    me.ctx.fillStyle = "blue";
                    me.ctx.fillRect(0, 0, z.size.h * -1, z.size.w);
                });
                me.ctx.stroke();
                me.zonedt.update();
            };
            this.PT.activate(DrawType.texture, {}, (response) => __awaiter(this, void 0, void 0, function* () {
                this.db.transaction("zones", 'readwrite').objectStore("zones").put(response);
            }));
        };
        this.deactivate = () => {
            if (this.activated) {
                this.PT.deactivate();
                this.activated = false;
                this.ground.material = this.groundMaterial;
            }
        };
        // let DZ = new drawZone(canvas, scene, camera, ground, sea, DB, DT, groundmateria, grass, terrain);
        this.zonedt = new BABYLON.DynamicTexture("dynamic texture", { width: 10000, height: 10000 }, scene, false);
        this.PT = new paintGround(this.canvas, this.scene, this.camera, this.ground, this.sea, this.zonedt);
        this.zonemateria = new BABYLON.StandardMaterial("zoneMat", scene);
        this.zonemateria.diffuseTexture = this.zonedt;
    }
}

import type { WorldScene } from "./scene";
import { GroundMesh } from "../lib/babylon/Meshes/groundMesh";
import { VertexData } from "../lib/babylon/Meshes/mesh.vertexData";
import { StandardMaterial } from "../lib/babylon/Materials/standardMaterial";
import { Color3 } from "../lib/babylon/Maths/math.color";

export class Sea extends GroundMesh {
    constructor(scene: WorldScene) {
        super('sea', scene);
        this._setReady(false);
        this._subdivisionsX = 1;
        this._subdivisionsY = 1;
        this._width = 10000;
        this._height = 10000;
        this._maxX = this._width / 2;
        this._maxZ = this._height / 2;
        this._minX = -this._maxX;
        this._minZ = -this._maxZ;

        var vertexData = VertexData.CreateGround({
            width: 10000,
            height: 10000,
            subdivisions: 1,
        });

        vertexData.applyToMesh(this, false);
        this.position.y = 3

        var watermaterial = new StandardMaterial("watermaterial", scene);

        watermaterial.diffuseColor = new Color3(0, 0.2, 1);
        watermaterial.specularColor = new Color3(0.0, 0.2, 0.87);
        watermaterial.emissiveColor = new Color3(0, 0.2, 1);
        watermaterial.ambientColor = new Color3(0.0, 0.2, 0.93);

        this.material = watermaterial;

        this._setReady(true);
    }
}
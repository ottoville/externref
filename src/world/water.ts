import type { WorldScene } from "./scene";
import { GroundMesh } from "../lib/babylon/Meshes/groundMesh";
import { VertexData } from "../lib/babylon/Meshes/mesh.vertexData";
import { StandardMaterial } from "../lib/babylon/Materials/standardMaterial";
import { Color3 } from "../lib/babylon/Maths/math.color";
VertexData.CreateGround = function (options: { width?: number, height?: number, subdivisions?: number, subdivisionsX?: number, subdivisionsY?: number }): VertexData {
    var indices = [];
    var positions = [];
    var normals = [];
    var uvs = [];
    var row: number, col: number;

    var width: number = options.width || 1;
    var height: number = options.height || 1;
    var subdivisionsX: number = options.subdivisionsX || options.subdivisions || 1;
    var subdivisionsY: number = options.subdivisionsY || options.subdivisions || 1;

    for (row = 0; row <= subdivisionsY; row++) {
        for (col = 0; col <= subdivisionsX; col++) {
            var position = new Vector3((col * width) / subdivisionsX - (width / 2.0), 0, ((subdivisionsY - row) * height) / subdivisionsY - (height / 2.0));
            var normal = new Vector3(0, 1.0, 0);

            positions.push(position.x, position.y, position.z);
            normals.push(normal.x, normal.y, normal.z);
            uvs.push(col / subdivisionsX, 1.0 - row / subdivisionsY);
        }
    }

    for (row = 0; row < subdivisionsY; row++) {
        for (col = 0; col < subdivisionsX; col++) {
            indices.push(col + 1 + (row + 1) * (subdivisionsX + 1));
            indices.push(col + 1 + row * (subdivisionsX + 1));
            indices.push(col + row * (subdivisionsX + 1));

            indices.push(col + (row + 1) * (subdivisionsX + 1));
            indices.push(col + 1 + (row + 1) * (subdivisionsX + 1));
            indices.push(col + row * (subdivisionsX + 1));
        }
    }

    // Result
    var vertexData = new VertexData();

    vertexData.indices = indices;
    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    return vertexData;
};
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
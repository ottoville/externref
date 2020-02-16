import type { WorldScene } from "./scene";
import { VertexData } from "../lib/babylon/Meshes/mesh.vertexData";
import type { StandardMaterial } from "../lib/babylon/Materials/standardMaterial";
import { Color3 } from "../lib/babylon/Maths/math.color";
import { TerraMesh } from "../TerraMesh";
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
export class Sea extends TerraMesh {

    public _subdivisionsX: number;
    public _subdivisionsY: number;

    public _width: number;
    public _height: number;
    public _minX: number;
    public _maxX: number;
    public _minZ: number;
    public _maxZ: number;

    constructor(scene: WorldScene) {
        super('sea', new Uint32Array([3, 1, 0, 2, 3, 0]), new Float32Array([-5000, 0, 5000, 5000, 0, 5000, -5000, 0, -5000, 5000, 0, -5000]), new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]));
        /*
         * 
        indices: (6) [3, 1, 0, 2, 3, 0]
normals: (12) [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]
positions: (12) [-5000, 0, 5000, 5000, 0, 5000, -5000, 0, -5000, 5000, 0, -5000]
uvs: (8) [0, 1, 1, 1, 0, 0, 1, 0]
         */
        this._setReady(false);
        this._subdivisionsX = 1;
        this._subdivisionsY = 1;
        this._width = 10000;
        this._height = 10000;
        this._maxX = this._width / 2;
        this._maxZ = this._height / 2;
        this._minX = -this._maxX;
        this._minZ = -this._maxZ;
      /*  var vertexData = VertexData.CreateGround({
            width: 10000,
            height: 10000,
            subdivisions: 1,
        });
        console.log('vertexdata');
        console.log(vertexData);
        vertexData.applyToMesh(this, true);*/
        this.position.y = 3

        //var watermaterial = new StandardMaterial("watermaterial", scene);

        var watermaterial = scene.defaultMaterial as StandardMaterial;

        watermaterial.diffuseColor = new Color3(0, 0.2, 1);
        watermaterial.specularColor = new Color3(0.0, 0.2, 0.87);
        watermaterial.emissiveColor = new Color3(0, 0.2, 1);
        watermaterial.ambientColor = new Color3(0.0, 0.2, 0.93);

        this.material = watermaterial;

        this._setReady(true);
    }
}
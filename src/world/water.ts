import { VertexData } from "../lib/babylon/Meshes/mesh.vertexData";
import { TerraScene } from "../TerraScene";

export class Sea {

    public _subdivisionsX: number;
    public _subdivisionsY: number;

    public _width: number;
    public _height: number;
    public _minX: number;
    public _maxX: number;
    public _minZ: number;
    public _maxZ: number;

    constructor(scene: TerraScene) {
        const waterPipeline = scene.gpuscene.lights.lightsBindGroup.addRenderPipeline({
            sampleCount: scene.gpuscene.sampleCount,
            primitiveTopology: 'triangle-strip',
            colorStates: [{
                format: "bgra8unorm",
            }],
            vertexStage: {
                module: scene.gpuscene.shaderModules.get("water.vert")!,
                entryPoint: "main",
            },
            fragmentStage: {
                module: scene.gpuscene.shaderModules.get("water.frag")!,
                entryPoint: "main"
            },
            vertexState: {
                indexFormat: 'uint16' //todo: this is not needed as shader does not use indexes.
            }
        });
        waterPipeline.addDrawable(4);

        /*
         * 
        indices: (6) [3, 1, 0, 2, 3, 0]
normals: (12) [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]
positions: (12) [-5000, 0, 5000, 5000, 0, 5000, -5000, 0, -5000, 5000, 0, -5000]
uvs: (8) [0, 1, 1, 1, 0, 0, 1, 0]
         */
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

        //var watermaterial = new StandardMaterial("watermaterial", scene);

    }
}
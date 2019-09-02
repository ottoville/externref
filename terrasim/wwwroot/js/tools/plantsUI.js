import { UITAB } from "../UITAB.js";
import { paintGround, DrawType } from "../paintGround.js";
export class PlantsUI extends UITAB {
    constructor(ground, db, canvas, scene, camera, sea, zonedt, plantsobj) {
        super();
        this.ground = ground;
        this.db = db;
        this.canvas = canvas;
        this.scene = scene;
        this.camera = camera;
        this.sea = sea;
        this.zonedt = zonedt;
        this.plantsobj = plantsobj;
        this.name = "terraintab";
        this.label = 'Plants';
        this.activated = false;
        /** Set up shape variations for each blade of grass */
        this.createMenu = (form) => {
            let fieldset = form.appendChild(document.createElement('fieldset'));
            fieldset.style.backgroundColor = 'white';
            let legend = fieldset.appendChild(document.createElement('legend'));
            legend.style.backgroundColor = 'white';
            legend.textContent = 'Terrain';
            let button1 = fieldset.appendChild(document.createElement('button'));
            button1.textContent = 'Create grass';
            button1.addEventListener('click', (evt) => {
                evt.preventDefault();
                this.PT.activate(DrawType.plane, { forceSharedVertices: false }, (response, plane) => {
                    this.PT.deactivate();
                    var furMaterial = new BABYLON.FurMaterial("fur3", this.scene);
                    furMaterial.furLength = 5; // Represents the maximum length of the fur, which is then adjusted randomly. Default value is 1.
                    furMaterial.furAngle = 0;
                    furMaterial.furColor = new BABYLON.Color3(0.8, 1, 0.32);
                    furMaterial.diffuseTexture = new BABYLON.Texture("images/grass.jpg", this.scene);
                    furMaterial.furTexture = BABYLON.FurMaterial.GenerateTexture("furTexture", this.scene);
                    furMaterial.furSpacing = 0.5; // Computes the space between shells. In others words, works as the fur height
                    furMaterial.furDensity = 10; // Computes the fur density. More the density is high, more you'll have to zoom on the model
                    furMaterial.furSpeed = 10000; // Divides the animation of fur in time according to the gravity
                    furMaterial.furGravity = new BABYLON.Vector3(0, -1, 0);
                    plane.material = furMaterial;
                    var quality = 30;
                    var shells = PlantsUI.FurifyMesh(plane, quality);
                });
            });
            let button2 = fieldset.appendChild(document.createElement('button'));
            button2.textContent = 'Create poaceae';
            button2.addEventListener('click', (evt) => {
                evt.preventDefault();
                this.PT.activate(DrawType.plane, { forceSharedVertices: false }, (response, plane) => {
                    this.PT.deactivate();
                    this.plantsobj.fillArea(response);
                });
            });
        };
        this.activate = () => {
            this.activated = true;
        };
        this.deactivate = () => {
            this.PT.deactivate();
            this.activated = false;
        };
        this.PT = new paintGround(this.canvas, this.scene, this.camera, this.ground, this.sea, this.zonedt);
    }
    // Creates and returns an array of meshes used as shells for the Fur Material
    // that can be disposed later in your code
    // The quality is in interval [0, 100]
    static FurifyMesh(sourceMesh, quality) {
        var meshes = [sourceMesh];
        var mat = sourceMesh.material;
        var i;
        if (!(mat instanceof BABYLON.FurMaterial)) {
            throw "The material of the source mesh must be a Fur Material";
        }
        sourceMesh.bakeCurrentTransformIntoVertices();
        for (i = 1; i < quality; i++) {
            var offsetFur = new BABYLON.FurMaterial(mat.name + i, sourceMesh.getScene());
            sourceMesh.getScene().materials.pop();
            BABYLON.Tags.EnableFor(offsetFur);
            BABYLON.Tags.AddTagsTo(offsetFur, "furShellMaterial");
            offsetFur.furLength = mat.furLength;
            offsetFur.furAngle = mat.furAngle;
            offsetFur.furGravity = mat.furGravity;
            offsetFur.furSpacing = mat.furSpacing;
            offsetFur.furSpeed = mat.furSpeed;
            offsetFur.furColor = mat.furColor;
            offsetFur.diffuseTexture = mat.diffuseTexture;
            offsetFur.furOffset = i / quality;
            offsetFur.furTexture = mat.furTexture;
            offsetFur.highLevelFur = mat.highLevelFur;
            offsetFur.furTime = mat.furTime;
            offsetFur.furDensity = mat.furDensity;
            var offsetMesh = sourceMesh.clone(sourceMesh.name + i);
            offsetMesh.material = offsetFur;
            offsetMesh.skeleton = sourceMesh.skeleton;
            offsetMesh.position = BABYLON.Vector3.Zero();
            meshes.push(offsetMesh);
        }
        for (i = 1; i < meshes.length; i++) {
            meshes[i].parent = sourceMesh;
        }
        sourceMesh.material._meshes = meshes;
        return meshes;
    }
}

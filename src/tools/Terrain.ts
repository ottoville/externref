import { UITAB } from "../UITAB.js";
import { LazyEval } from "../LazyEval.js";
export class Terrain extends UITAB {
    private helper: BABYLON.Mesh;
    private ray = BABYLON.Ray.Zero();
    private slopeArr = new Int16Array(250 * 250 * 2);
    private facet1Arr = new Float32Array(250 * 250 * 4);
    private facet2Arr = new Float32Array(250 * 250 * 4);

    private mousemove = new LazyEval((evt: MouseEvent) => {
        console.log(evt);
        this.scene.createPickingRayToRef(evt.clientX, evt.clientY, this.ground.getWorldMatrix(), this.ray, this.camera);
        let point = this.ground.intersects(this.ray);
        this.helper.position.x = point.pickedPoint.x;
        this.helper.position.y = point.pickedPoint.y + 3;
        this.helper.position.z = point.pickedPoint.z;
    })
    constructor(
        private scene: BABYLON.Scene,
        private ground: BABYLON.GroundMesh,
        private camera: BABYLON.ArcRotateCamera,
    ) {
        super();

        //private _initHeightQuads(): GroundMesh {
        let subdivisionsX = 250;
        let subdivisionsY = 250;
        let heightQuads = new Array();


        for (var row = 0; row < subdivisionsY; row++) {
            for (var col = 0; col < subdivisionsX; col++) {
                let quad = { slope: BABYLON.Vector2.Zero(), facet1: new BABYLON.Vector4(0.0, 0.0, 0.0, 0.0), facet2: new BABYLON.Vector4(0.0, 0.0, 0.0, 0.0) };
                heightQuads[row * subdivisionsX + col] = quad;
            }
        }


        //private _computeHeightQuads(): GroundMesh {
        let positions = this.ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);

        if (!positions) {
            throw ('no positions');
        }

        let v1 = new BABYLON.Vector3();
        let v2 = new BABYLON.Vector3();
        let v3 = new BABYLON.Vector3();
        let v4 = new BABYLON.Vector3();
        let v1v2 = new BABYLON.Vector3();
        let v1v3 = new BABYLON.Vector3();
        let v1v4 = new BABYLON.Vector3();
        let norm1 = new BABYLON.Vector3();
        let norm2 = new BABYLON.Vector3();
        let i = 0;
        let j = 0;
        let k = 0;
        let cd = 0;     // 2D slope coefficient : z = cd * x + h
        let h = 0;
        let d1 = 0;     // facet plane equation : ax + by + cz + d = 0
        let d2 = 0;

        for (var row = 0; row < subdivisionsY; row++) {
            for (var col = 0; col < subdivisionsX; col++) {
                i = col * 3;
                j = row * (subdivisionsX + 1) * 3;
                k = (row + 1) * (subdivisionsX + 1) * 3;
                v1.x = positions[j + i];
                v1.y = positions[j + i + 1];
                v1.z = positions[j + i + 2];
                v2.x = positions[j + i + 3];
                v2.y = positions[j + i + 4];
                v2.z = positions[j + i + 5];
                v3.x = positions[k + i];
                v3.y = positions[k + i + 1];
                v3.z = positions[k + i + 2];
                v4.x = positions[k + i + 3];
                v4.y = positions[k + i + 4];
                v4.z = positions[k + i + 5];

                // 2D slope V1V4
                cd = (v4.z - v1.z) / (v4.x - v1.x);
                h = v1.z - cd * v1.x;             // v1 belongs to the slope

                // facet equations :
                // we compute each facet normal vector
                // the equation of the facet plane is : norm.x * x + norm.y * y + norm.z * z + d = 0
                // we compute the value d by applying the equation to v1 which belongs to the plane
                // then we store the facet equation in a Vector4
                v2.subtractToRef(v1, v1v2);
                v3.subtractToRef(v1, v1v3);
                v4.subtractToRef(v1, v1v4);
                BABYLON.Vector3.CrossToRef(v1v4, v1v3, norm1);  // caution : CrossToRef uses the Tmp class
                BABYLON.Vector3.CrossToRef(v1v2, v1v4, norm2);
                norm1.normalize();
                norm2.normalize();
                d1 = -(norm1.x * v1.x + norm1.y * v1.y + norm1.z * v1.z);
                d2 = -(norm2.x * v2.x + norm2.y * v2.y + norm2.z * v2.z);
                
                let quad = heightQuads[row * subdivisionsX + col];
                quad.slope.copyFromFloats(cd, h);
                quad.facet1.copyFromFloats(norm1.x, norm1.y, norm1.z, d1);
                quad.facet2.copyFromFloats(norm2.x, norm2.y, norm2.z, d2);

                this.slopeArr.set([cd, h], (row * subdivisionsX + col)*2);
                this.facet1Arr.set([norm1.x, norm1.y, norm1.z, d1], (row * subdivisionsX + col)*4)
                this.facet2Arr.set([norm2.x, norm2.y, norm2.z, d2], (row * subdivisionsX + col)*4)
            }
        }

    }
    activated: boolean;    name: string;
    activate = (): void => {
        let engine = this.scene.getEngine();

        engine.getRenderingCanvas().addEventListener("mousemove", this.mouseListener);
        this.helper = new BABYLON.Mesh("Helper", this.scene);

        let vertices = new Float32Array([
            -0.5,0,-2,
            0.5,0,-3,
            0.5,0,3,
            -0.5, 0, 2,
        ]);
        var indices = new Uint16Array([0,1,2,3])
        var vertexData = new BABYLON.VertexData();
        vertexData.positions = vertices;
        vertexData.indices = indices;

        vertexData.applyToMesh(this.helper);

        let gl: WebGLRenderingContext = this.scene.getEngine()._gl;
        let helpermaterial = new BABYLON.ShaderMaterial("shader", this.scene, "./shaders/helper",
            {
                attributes: ["position", "normal", "uv", "slope"],
                uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"]
            });
        let timed = new Date().getTime();
        this.scene.registerBeforeRender(() => {
            helpermaterial.setFloat("time", (timed - new Date().getTime()) / 1000);
        });
        helpermaterial.fillMode = BABYLON.Material.TriangleFanDrawMode;
        this.helper.material = helpermaterial;
        this.helper._draw = function (subMesh: BABYLON.SubMesh, fillMode: number, instancesCount?: number): BABYLON.Mesh {
            if (!this._geometry || !this._geometry.getVertexBuffers() || (!this._unIndexed && !this._geometry.getIndexBuffer())) {
                return this;
            }
            if (this._internalMeshDataInfo._onBeforeDrawObservable) {
                this._internalMeshDataInfo._onBeforeDrawObservable.notifyObservers(this);
            }
            engine.applyStates();
            engine._drawCalls.addCount(1, false);
            gl.drawElementsInstanced(gl.TRIANGLE_FAN, indices.length, gl.UNSIGNED_SHORT, 0, 8);
            return this;
        }
        let slopeBuffer = new BABYLON.Buffer(engine, this.slopeArr, true, 2, false, false);
        this.helper._geometry.setVerticesBuffer(new BABYLON.VertexBuffer(engine, slopeBuffer, "slope", true, true, 0, false, 0, 2, undefined, undefined, true));
        gl.bindBuffer(gl.ARRAY_BUFFER, slopeBuffer.getBuffer().underlyingResource);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.slopeArr);


    }
    deactivate = (): void => {
        this.scene.getEngine().getRenderingCanvas().removeEventListener("mousemove", this.mouseListener);

    };
    mouseListener = (evt: MouseEvent): void => {
        this.mousemove.eval(50,evt);
    }
    raise = (): void => {

    }
    lower = (): void => {

    }
}
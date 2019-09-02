//import { Vector3 } from "../math.js";
let anglePerMinute = (Math.PI * 2) / 1439;
let meridian = Math.PI * 0.1;
/*class dunamicVector extends BABYLON.Vector3 {
    constructor(
        x: number = 0,
        y: number = 0,
        z: number = 0,
        private getGameTime:() => number

    ) {
        super(x,y,z);
    }
    get x(): number {
        let gameTime=this.getGameTime();
        let secondsOfDay=~~((Number(gameTime)/1000)%86400);
        let minutesOfDay=~~(secondsOfDay/60);

        let sundistance = 149600000000;
        let sunAngle= new Angle(minutesOfDay*anglePerMinute).sub(meridian);
        return sundistance*Math.sin(sunAngle);
    }
    get y(): number {
        return this.arr[1];
    }
    get z(): number {
        return this.arr[2];
    }
}*/
export class Sun {
    constructor(scene) {
        this.sunPosition = new BABYLON.Vector3(0, 0, 0);
        let radius = 1391000000;
        let sunSegments = 15;
        let angleStep = (Math.PI * 2) / sunSegments;
        let vertices = new Float32Array((sunSegments + 1) * 3);
        let angle = 0;
        for (let i = 1; i < sunSegments + 1; i++) {
            vertices[i * 3] = radius * Math.cos(angle);
            vertices[i * 3 + 1] = radius * Math.sin(angle);
            angle += angleStep;
        }
        let engine = scene.getEngine();
        let sun = new BABYLON.Mesh("Sun", scene);
        var indices = Uint16Array.from(Array(sunSegments + 2).keys());
        indices[sunSegments + 1] = 1;
        var vertexData = new BABYLON.VertexData();
        vertexData.positions = vertices;
        vertexData.indices = indices;
        vertexData.applyToMesh(sun);
        sun.billboardMode = 7;
        let gl = engine._gl;
        let sunmaterial = new BABYLON.ShaderMaterial("shader", scene, "./shaders/sun", {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"]
        });
        sunmaterial.fillMode = BABYLON.Material.TriangleFanDrawMode;
        sun.material = sunmaterial;
        scene.onBeforeActiveMeshesEvaluationObservable.add(() => {
            [sun.position.x, sun.position.y, sun.position.z] = DotNet.invokeMethod('BlazorApp1', "sunPosition");
            this.sunPosition = sun.position;
        });
        sun._draw = function (subMesh, fillMode, instancesCount) {
            if (!this._geometry || !this._geometry.getVertexBuffers() || (!this._unIndexed && !this._geometry.getIndexBuffer())) {
                return this;
            }
            if (this._internalMeshDataInfo._onBeforeDrawObservable) {
                this._internalMeshDataInfo._onBeforeDrawObservable.notifyObservers(this);
            }
            let engine = scene.getEngine();
            engine.applyStates();
            engine._drawCalls.addCount(1, false);
            gl.drawElements(gl.TRIANGLE_FAN, subMesh.indexCount, gl.UNSIGNED_SHORT, 0);
            return this;
        };
        sun.position = new BABYLON.Vector3(0, 0, 0);
    }
}

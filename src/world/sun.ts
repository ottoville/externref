import type { WorldScene } from "./scene.js";
import { Vector3 } from "../lib/babylon/Maths/math.vector.js";
import type { SubMesh } from "../lib/babylon/Meshes/subMesh.js";
import { VertexData } from "../lib/babylon/Meshes/mesh.vertexData.js";
import { Mesh } from "../lib/babylon/Meshes/mesh.js";
import { ShaderMaterial } from "../lib/babylon/Materials/shaderMaterial.js";
import { Material } from "../lib/babylon/Materials/material.js";
//import { Vector3 } from "../math.js";
let anglePerMinute=(Math.PI*2)/1439;
let meridian:number=Math.PI*0.1;

export class Sun {
    public sunPosition:Vector3=new Vector3(0,0,0);
    constructor(scene:WorldScene) {
        let radius=1391000000;
        let sunSegments=15;
        let angleStep=(Math.PI*2)/sunSegments;
        let vertices=new Float32Array((sunSegments+1)*3);
        let angle=0;
        for(let i=1;i<sunSegments+1;i++) {
            vertices[i*3]=radius*Math.cos(angle);
            vertices[i*3+1]=radius*Math.sin(angle);
            angle+=angleStep;
        }
        let engine = scene.getEngine();
        let sun = new Mesh("Sun", scene);
        var indices = Uint16Array.from(Array(sunSegments+2).keys())
        indices[sunSegments+1]=1;
        var vertexData = new VertexData();
        vertexData.positions = vertices;
        vertexData.indices = indices;    

        vertexData.applyToMesh(sun);
        sun.billboardMode=7;

        let gl: WebGLRenderingContext = engine._gl
        let sunmaterial = new ShaderMaterial("shader", scene, "./shaders/sun",
        {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"]
        });
        sunmaterial.fillMode=Material.TriangleFanDrawMode;
        sun.material=sunmaterial;

        scene.onBeforeActiveMeshesEvaluationObservable.add(() => {
            let pos = scene.blazor.invokeMethod("sunPosition");
            [sun.position.x, sun.position.y, sun.position.z] = pos;
            [this.sunPosition.x, this.sunPosition.y, this.sunPosition.z] = pos;
        });
        sun._draw=function(subMesh: SubMesh, fillMode: number, instancesCount?: number) :Mesh {
            if (!this._geometry || !this._geometry.getVertexBuffers() || (!this._unIndexed && !this._geometry.getIndexBuffer())) {
                return this;
            }
            //@ts-ignore
            if (this._internalMeshDataInfo._onBeforeDrawObservable) {
                //@ts-ignore
                this._internalMeshDataInfo._onBeforeDrawObservable.notifyObservers(this);
            }
            let engine = scene.getEngine();
            engine.applyStates();
            engine._drawCalls.addCount(1, false);
            gl.drawElements(gl.TRIANGLE_FAN, subMesh.indexCount, gl.UNSIGNED_SHORT, 0);        
            return this;
        }
        sun.position=new Vector3(0,0,0);
    }
}
import type { Scene } from "../../Scene.js";
import { Engine } from "../../engine.js";
import { Triangle as MTriangle } from "../../math.js";
import { SimpleMesh } from "../RenderPipeLines/SimpleMesh.js";
declare const engine:Engine;

const positions = new Float32Array([
    // positions        //normals
    -1.0, 1.0, -1.0,    0.0,1.0,0.0,
    -1.0, 1.0, 1.0,     0.0,1.0,0.0,
    -1.0, -1.0, 1.0,    0.0,1.0,0.0,
])

let uid=0;
export class Triangle extends SimpleMesh {
    colliderTriangle: MTriangle;
    constructor(
        label='triangle'+(uid++),
        color:[number,number,number,number]=[1,0,0,0],
        scenes?: Scene[],
    ) {
        super(positions,label, undefined, scenes)
        this.gpu_custom_data=color;
        const verticesArray=this.verticesArray;
        this.colliderTriangle = new MTriangle([verticesArray[0]!.byteOffset,verticesArray[1]!.byteOffset,verticesArray[2]!.byteOffset],
            () => engine.rust.collider_faces_pointer(this.ptr)
        )
    }
    
    //TODO: This is now actually a sphere collider
    override checkCollide(velocityPerDelta:readonly [number,number,number]) {
        const translation = this.translation;
        const scaledPosition=engine.collider.scaledPosition;
        scaledPosition[0] = translation[0] / this.radius[0];
        scaledPosition[1] = translation[1] / this.radius[1];
        scaledPosition[2] = translation[2] / this.radius[2];
        const scaledVelocity=engine.collider.scaledVelocity;
        scaledVelocity[0] = velocityPerDelta[0] / this.radius[0];
        scaledVelocity[1] = velocityPerDelta[1] / this.radius[1];
        scaledVelocity[2] = velocityPerDelta[2] / this.radius[2];
        engine.collider.collidedMesh = undefined;
        engine.collider._retry = 0;
        engine.collideWithWorld(this);
        return engine.collider.finalPosition;
    }
}
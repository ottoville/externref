import type { Scene } from "../../Scene.js";
import { SimpleIndexedMesh } from "../RenderPipeLines/SimpleIndexedMesh.js";

import { Engine } from "../../engine.js";
declare const engine:Engine;

const positions = new Float32Array([
    // Left face        //normals
    -1.0, 1.0, -1.0,    0.0,1.0,0.0,
    -1.0, 1.0, 1.0,     0.0,1.0,0.0,
    -1.0, -1.0, 1.0,    0.0,1.0,0.0,
    -1.0, -1.0, -1.0,   0.0,1.0,0.0,
    // Right face
    1.0, -1.0, 1.0,     0.0,1.0,0.0,
    1.0, 1.0, 1.0,      0.0,1.0,0.0,
    1.0, 1.0, -1.0,     0.0,1.0,0.0,
    1.0, -1.0, -1.0,    0.0,1.0,0.0,

    // Bottom face
    -1.0, -1.0, 1.0,    0.0,1.0,0.0,
    1.0, -1.0, 1.0,     0.0,1.0,0.0,
    1.0, -1.0, -1.0,    0.0,1.0,0.0,
    -1.0, -1.0, -1.0,   0.0,1.0,0.0,

    // Top face
    1.0, 1.0, -1.0,    0.0,1.0,0.0,
    1.0, 1.0, 1.0,     0.0,1.0,0.0,
    -1.0, 1.0, 1.0,    0.0,1.0,0.0,
    -1.0, 1.0, -1.0,   0.0,1.0,0.0,
    // Back face
    1.0, -1.0, -1.0,   0.0,1.0,0.0,
    1.0, 1.0, -1.0,    0.0,1.0,0.0,
    -1.0, 1.0, -1.0,   0.0,1.0,0.0,
    -1.0, -1.0, -1.0,  0.0,1.0,0.0,

    -1.0, 1.0, 1.0,    0.0,1.0,0.0,
    1.0, 1.0, 1.0,     0.0,1.0,0.0,
    1.0, -1.0, 1.0,    0.0,1.0,0.0,
    -1.0, -1.0, 1.0,   0.0,1.0,0.0,
])

let uid=0;
export class Box extends SimpleIndexedMesh {
    constructor(
        scenes?: Scene[],
        point_light = 0,
        has_physic=false,
        label='box'+(uid++),
        color:[number,number,number,number]=[1,0,0,0]
    ) {
        super(positions, new Uint32Array([
            0, 1, 2, 0, 2, 3,    // front
            4, 5, 6, 4, 6, 7,    // back
            8, 9, 10, 8, 10, 11,   // top
            12, 13, 14, 12, 14, 15,   // bottom
            16, 17, 18, 16, 18, 19,   // right
            20, 21, 22, 20, 22, 23,   // left
        ]),label, undefined, undefined, point_light, has_physic, scenes);
        this.gpu_custom_data=color;
    }
    
    //TODO: This is now actually a sphere collider
    override checkCollide(velocityPerDelta:readonly [number,number,number]) {
        const translation = this.translation;
     //   console.log('checkCollide',...translationDelta)
     //   console.log('translation',...translation)
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
        if(!engine.collider.collision_resolved) {
           //console.log('cant solve collision', this.label)
        }
        return engine.collider.finalPosition;
    }
}
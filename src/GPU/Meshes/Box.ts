import type { Scene } from "../../Scene.js";
import { SimpleIndexedMesh } from "../RenderPipeLines/Simple.js";
import { GPU, GPUBufferUsage } from "../../GPU.js";
import { Engine } from "engine.js";
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
function create(gpu: GPU): [Uint32Array, GPUIndexBuffer, GPUVertexBuffer] {
    const [indicesBuffer, iBuffer] = gpu.createInputBuffer(GPUBufferUsage.INDEX, new Uint32Array([
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // back
        8, 9, 10, 8, 10, 11,   // top
        12, 13, 14, 12, 14, 15,   // bottom
        16, 17, 18, 16, 18, 19,   // right
        20, 21, 22, 20, 22, 23,   // left
    ]));
    // const [verticesBuffer, vBuffer] = scene.gpu.createInputBuffer(GPUBufferUsage.VERTEX, new Float32Array());
    const vBuffer = gpu.device.createBuffer({ usage: GPUBufferUsage.VERTEX, size: positions.byteLength, mappedAtCreation: true }) as GPUVertexBuffer;
    new Float32Array(vBuffer.getMappedRange()).set(positions);
    vBuffer.unmap();

    return [new Uint32Array(indicesBuffer), iBuffer, vBuffer]
}
let uid=0;
export class Box extends SimpleIndexedMesh {
    constructor(
        scenes?: Scene[],
        point_light = 0,
        has_physic=false,
        label='box'+(uid++),
        color:[number,number,number,number]=[1,0,0,0]
    ) {
        super(positions, ...create(engine.gpu),label,point_light,has_physic, scenes);
        this.gpu_custom_data=new Float32Array(color);
        Object.getOwnPropertyNames(Box.prototype).forEach(prop =>  {
            const propDesc=Object.getOwnPropertyDescriptor(Box.prototype, prop);
            if(propDesc)
                Object.defineProperty(this, prop, propDesc);
        });
    }
    
    override checkCollide() {
        const translation = this.get_translation();
        const translationDelta = this.get_velocity();
     //   console.log('checkCollide',...translationDelta)
     //   console.log('translation',...translation)
        const scaledPosition=engine.collider.scaledPosition;
        scaledPosition[0] = translation[0] / engine.collider.radius[0];
        scaledPosition[1] = translation[1] / engine.collider.radius[1];
        scaledPosition[2] = translation[2] / engine.collider.radius[2];
        const scaledVelocity=engine.collider.scaledVelocity;

        const newPosition= [
            translation[0]+translationDelta[0],
            translation[1]+translationDelta[1],
            translation[2]+translationDelta[2]
        ] as const


        scaledVelocity[0] = (newPosition[0]-translation[0])/engine.collider.radius[0];
        scaledVelocity[1] = (newPosition[1]-translation[1])/engine.collider.radius[1];
        scaledVelocity[2] = (newPosition[2]-translation[2])/engine.collider.radius[2];
        engine.collider.collidedMesh = undefined;
        engine.collider._retry = 0;
        engine.collideWithWorld();

        engine.collider.finalPosition[0] *= engine.collider.radius[0]
        engine.collider.finalPosition[1] *= engine.collider.radius[1]
        engine.collider.finalPosition[2] *= engine.collider.radius[2]
    }
}
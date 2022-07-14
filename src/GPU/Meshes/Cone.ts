import type { Scene } from "../../Scene.js";
import { SimpleIndexedMesh } from "../AbstractMeshes/SimpleIndexedMesh.js";
import type { Engine } from "../../engine.js";
declare const engine:Engine;

const douplePI = Math.PI*2;
function strip2List(indices:Uint32Array) {
   const list=new Uint32Array((indices.length - 2) * 3);
   const triangle:number[]=[];
   for(let i=0; i<indices.length;i++) {
        if(triangle.push(indices[i]!) === 3) {
            if(i%2 === 1) {
                triangle.reverse();
            }
            list.set(triangle, (i-2)*3);
            if(i%2 === 1) {
                triangle.reverse();
            }
            triangle.shift();
        }
   }
   return list;
}
function createCircle(faces = 14, cullMode: -1 | 1 = 1, stride=6) {
    const vertices = new Float32Array((faces + 2) * stride);
    const indices = new Uint32Array(faces+2);

    const edges=faces+2;
    const facelen = douplePI/edges;
    let progress=facelen;
    let x = cullMode * Math.sin(progress);
    let z = Math.cos(progress);
    vertices.set(
        [0, 0, 1, /* normals: */ 0, 0, 0,
        x, 0, z, /* normals: */ 0, 0, 0]);
    indices.set([0,1]);
    progress+=facelen;
    for(let i = 0; i<faces; i++) {    
        indices[i+2]=i+2;
        if(i%2 === 0 ) {
            vertices.set(
                [-x, 0, z, /* normals: */ 0, 0, 0], (i+2)*stride);
        } else {
            x = cullMode * Math.sin(progress);
            z = Math.cos(progress);
            vertices.set(
                [x, 0, z, /* normals: */ 0, 0, 0], (i+2)*stride);
            progress+=facelen;
        }
    }
    // normalize vertices
    for (let i = 0; i < vertices.length; i += stride) {
        //0.5 to create vertices from -0.5 to 0.5
        const m = 0.5 / Math.hypot(vertices[i + 0]!, vertices[i + 1]!, vertices[i + 2]!);
        vertices[i + 0] *= m;
        vertices[i + 1] *= m;
        vertices[i + 2] *= m;
    }
    return [vertices, indices] as const;
}
function createCone(faces = 14, stride=6) {
    if(faces%2 !== 0) {
        throw(new Error("Cone must not have odd number of faces"));
    }
    const [circleVertices, circleIndices] = createCircle(faces,-1,stride);
    const coneVertices = Array.from(circleVertices);
    //Lover the vertices to keep 0,0 coordinate in middle.
    for(let i=0; i<coneVertices.length; i=i+stride) {
        coneVertices[i+1]=-0.5;
    }
    const zeroIndice = coneVertices.push(0,0.5,0,  /* normals: */0,0,0)/stride-1;

    let indicesOrder = [0];
    const indicesOrder2:number[] = [];
    for(let i=1; i<faces+3; i++) {
        if(i%2 === 1)
            indicesOrder.push(i);
        else 
            indicesOrder2.push(faces+2-i);
    }
    indicesOrder=indicesOrder.concat(indicesOrder2);
    const coneIndices = Array.from(strip2List(circleIndices));
    const window:number[] = [];
    for(let i=0; i<indicesOrder.length; i++) {
        if(window.push(indicesOrder[i]!) === 2) {
            coneIndices.push(window[1]!, window[0]!, zeroIndice,);
            window.shift();
        }
    }
    return [Float32Array.from(coneVertices), Uint32Array.from(coneIndices)] as const;
}
let uid=0;
export class Cone extends SimpleIndexedMesh {
    constructor(
        scenes?: Scene[],
        point_light = 0,
        has_physic=false,
        label='cone'+(uid++),
        color:[number,number,number,number]=[1,0,0,0]
    ) {
        super(...createCone(14,6),label, undefined, undefined, point_light, has_physic, scenes, undefined, "triangle-list");
        this.color=color;
    }
    override create_collider() {
        return engine.rust.create_cone_collider(this.scale_y/2,this.radius);
    }
    get radius() {
        return this.scale_x * 0.5;
    }
    set radius(radius:number) {
        const scale = radius * 2;
        this.update_scale(scale, this.scale_y, scale);
        const collider_ptr = engine.rust.create_cone_collider(this.scale_y/2, radius);
        engine.rust.add_collider(this.ptr, collider_ptr);
    }
}
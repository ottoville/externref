import type { Scene } from '../../Scene.js';
import { SimpleMesh } from '../AbstractMeshes/SimpleMesh.js';
import { new_rust_mesh } from '../../MainNode.js';
import { allocate_vec } from '../../nodes/DataNode.js';


const positions = new Float32Array([
    // positions        //normals
    -1.0, 1.0, -1.0, 1.0, 0.0, 1.0, 0.0, 1,0
    -1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0,1,0
    -1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 0.0,1,0
])

let uid = 0;
export class Triangle extends SimpleMesh {
    constructor(
        label = 'triangle' + (uid++),
        color: [number, number, number, number] = [1, 0, 0, 0],
        can_collide = false,
        scenes?: Scene[]
    ) {
        super(
            {
                can_collide,
                vertices: {
                    view: allocate_vec(positions),
                },
            },
            new_rust_mesh({
                fixed: true,
                label,
                scenes,
            })
        )
        this.color = color;
    }
}
import type { Scene } from "../../Scene.js";
import { TerraVector3, TerraVector4, Quaternion, MutableTerraVector3 } from "../../Math.js";
import { SimpleIndexedMesh } from "../AbstractMeshes/SimpleIndexedMesh.js";
import { new_rust_mesh } from "../../MainNode.js";
import { allocate_vec } from "../../nodes/DataNode.js";

type Patch = {
    verticesForPatch: TerraVector3[];
    patchPointsA: number[];
    patchPointsB: number[];
    patchPointsC: number[];
};

const HALF_PI = Math.PI * 0.5;
// Clone patch
const tmpVector = new MutableTerraVector3();
const tmpQuaternion = new TerraVector4() as Quaternion;

function tessellate_octasphere_patch(num_subdivisions: number, halfWidth = 0, halfHeight = 0, halfDepth = 0): readonly [vertices: Float32Array, indices: Uint32Array] {
    const n = 2 ** (num_subdivisions + 1)

    const num_faces_per_patch = n * ((n + 1) / 2);
    const cellsPerPatch = (n - 2) * (n - 1) + n - 1;
    const indicesPerPath = cellsPerPatch * 3;
    let indicesCount = indicesPerPath * 8
    const totalFacesCount = num_faces_per_patch * 8
    const totalVerticesCount = totalFacesCount * 4;
    const verticesAndNormals = new Float32Array(totalVerticesCount * 2);
    const verticesStride = 8;
    const verts: TerraVector3[] = new Array(totalFacesCount)
    for (let i = 0; i < totalFacesCount; i++) {
        verts[i] = new MutableTerraVector3(verticesAndNormals.buffer, i * verticesStride * Float32Array.BYTES_PER_ELEMENT);
    }

    // First patch tessellation
    let firstIndex = 0;
    if (halfWidth > 0)
        indicesCount += (n - 1) * 6 * 4;
    if (halfHeight > 0)
        indicesCount += (n - 1) * 6 * 4
    if (halfDepth > 0)
        indicesCount += (n - 1) * 6 * 4


    if (halfWidth > 0 && halfHeight > 0 && halfDepth > 0) {
        indicesCount += 36; //6*6
    } else if ((halfWidth && halfHeight) || (halfWidth && halfDepth) || (halfHeight && halfDepth)) {
        indicesCount += 12; //2*6
    }

    const indices = new Uint32Array(indicesCount)
    let vert_index = 0;
    let indices_count = 0;
    const pointsA: number[] = new Array(n);
    const pointsB: number[] = new Array(n);
    const pointsC: number[] = new Array(n);

    for (let i = 0; i < n; i++) {
        const theta = (HALF_PI * i) / (n - 1);
        const col = n - 1 - i;
        const pointAindex = vert_index++;

        const point_a = verts[pointAindex]!;
        point_a[1] = Math.sin(theta);
        point_a[2] = Math.cos(theta);
        pointsA[i] = pointAindex;
        if (col > 0) {
            if (i === 0)
                pointsC[0] = pointAindex
            const num_segments = n - 1 - i;
            const pointBindex = vert_index + num_segments - 1

            const point_b = verts[pointBindex]!;
            point_b[0] = Math.cos(theta);
            point_b[1] = Math.sin(theta);
            pointsB[i] = pointBindex;
            // compute_geodesic
            const angle_between_endpoints = Math.acos(point_a.dot(point_b));
            const rotation_axis = point_a.CrossToRef(point_b, tmpVector).normalize();
            const dtheta = angle_between_endpoints / num_segments
            for (let point_index = 1; point_index < num_segments; point_index++) {
                point_a.applyRotationQuaternionToRef(rotation_axis.toQuaternionToRef(point_index * dtheta, tmpQuaternion), verts[vert_index++]!);
                if (i === 0) {
                    pointsC[point_index] = vert_index - 1
                }
            }
            if (i === 0)
                pointsC[n - 1] = pointBindex

            vert_index = vert_index + 1;

        } else {
            pointsB[i] = vert_index - 1;
        }
        if (i < n - 1) {
            const a = firstIndex + 1;
            const b = firstIndex + col + 1;
            const c = firstIndex + col + 2;

            for (let row = 0; row < col - 1; row++) {
                indices[indices_count++] = firstIndex + row;
                indices[indices_count++] = a + row;
                indices[indices_count++] = b + row;
                indices[indices_count++] = b + row;
                indices[indices_count++] = a + row;
                indices[indices_count++] = c + row;
            }

            const row = col - 1;
            indices[indices_count++] = firstIndex + row;
            indices[indices_count++] = a + row;
            indices[indices_count++] = b + row;

            firstIndex = b;
        }
    }
    const firstPatch = {
        verticesForPatch: new Array(num_faces_per_patch),
        patchPointsA: pointsA,
        patchPointsB: pointsB,
        patchPointsC: pointsC,
    }
    for (let j = 0; j < num_faces_per_patch; j++) {
        firstPatch.verticesForPatch[j] = verts[j]!;
    }
    const patches = [firstPatch, , , , , , , ,] as unknown as [Patch, Patch, Patch, Patch, Patch, Patch, Patch, Patch];
    for (let i = 0; i < 7; i++) {
        const patchPointsA: number[] = new Array(n);
        const patchPointsB: number[] = new Array(n);
        const patchPointsC: number[] = new Array(n);
        const verticesForPatch: TerraVector3[] = new Array(num_faces_per_patch);
        let indexOf: number;
        for (let j = 0; j < num_faces_per_patch; j++) {
            if (i === 0) {
                verts[vert_index++]!.set([verts[j]![2], verts[j]![1], -verts[j]![0]]);
            } else if (i === 1) {
                verts[vert_index++]!.set([-verts[j]![0], verts[j]![1], -verts[j]![2]]);
            } else if (i === 2) {
                verts[vert_index++]!.set([-verts[j]![2], verts[j]![1], verts[j]![0]]);
            } else if (i === 3) {
                verts[vert_index++]!.set([verts[j]![0], -verts[j]![2], verts[j]![1]]);
            } else if (i === 4) {
                verts[vert_index++]!.set([verts[j]![1], -verts[j]![2], -verts[j]![0]]);
            } else if (i === 5) {
                verts[vert_index++]!.set([-verts[j]![0], -verts[j]![2], -verts[j]![1]]);
            } else if (i === 6) {
                verts[vert_index++]!.set([-verts[j]![1], -verts[j]![2], verts[j]![0]]);
            }
            verticesForPatch[j] = verts[vert_index - 1]!;
            indexOf = pointsA.indexOf(j)
            if (indexOf !== -1) {
                patchPointsA[indexOf] = vert_index - 1;
            }
            indexOf = pointsB.indexOf(j)
            if (pointsB.includes(j)) {
                patchPointsB[indexOf] = vert_index - 1;
            }
            indexOf = pointsC.indexOf(j)
            if (pointsC.includes(j)) {
                patchPointsC[indexOf] = vert_index - 1;
            }
        }
        for (let j = 0; j < cellsPerPatch; j++) {
            indices[indices_count++] = indices[j * 3]! + (i + 1) * num_faces_per_patch;
            indices[indices_count++] = indices[j * 3 + 1]! + (i + 1) * num_faces_per_patch;
            indices[indices_count++] = indices[j * 3 + 2]! + (i + 1) * num_faces_per_patch;
        }
        patches[i + 1] = { verticesForPatch, patchPointsA, patchPointsB, patchPointsC };
    };
    //Copy positions to normals;
    for (let i = 0; i < verticesAndNormals.length; i = i + verticesStride) {
        verticesAndNormals.copyWithin(i + 4, i, i + 4);
    }
    const moveTuple = (
        tuple: readonly [Patch, Patch],
        axel: 0 | 1 | 2,
        half: number
    ) => {
        tuple[0].verticesForPatch.forEach(vertex => {
            vertex[axel] -= half;
        });
        tuple[1].verticesForPatch.forEach(vertex => {
            vertex[axel] += half;
        })
    }
    let pointsLeft: number[] = []
    let pointsRight: number[] = []

    if (halfWidth > 0) {
        const widthTuples = [
            [patches[6]!, patches[5]!],
            [patches[7]!, patches[4]!],
            [patches[3]!, patches[0]!],
            [patches[2]!, patches[1]!],
        ] as const;

        widthTuples.forEach(tuple => {
            moveTuple(tuple, 0, halfWidth);
        });

        let tuple = widthTuples[0];
        pointsLeft.push(...tuple[0].patchPointsA.slice().reverse());
        pointsRight.push(...tuple[1].patchPointsC.slice().reverse());
        const firstPoints = [pointsLeft[0]!, pointsRight[0]!] as const

        if (halfDepth === 0) {
            /*
                BOTTOM
                Do not draw side when its area size is 0.
                Draw what is in buffer and reset it.
            */
            indices_count = drawConnection(pointsLeft, indices, indices_count, pointsRight);
        }

        tuple = widthTuples[1];
        pointsLeft.push(...tuple[0].patchPointsC);
        pointsRight.push(...tuple[1].patchPointsA);
        if (halfHeight === 0) {
            /*
                SIDE 1
            */
            indices_count = drawConnection(pointsLeft, indices, indices_count, pointsRight);
        }

        tuple = widthTuples[2];
        pointsLeft.push(...tuple[0].patchPointsB);
        pointsRight.push(...tuple[1].patchPointsA);
        if (halfDepth === 0) {
            /*
                TOP
                Do not draw side when its area size is 0.
                Draw what is in buffer and reset it.
            */
            indices_count = drawConnection(pointsLeft, indices, indices_count, pointsRight);
        }
        tuple = widthTuples[3];
        pointsLeft.push(...tuple[0].patchPointsA.slice().reverse());
        pointsRight.push(...tuple[1].patchPointsB.slice().reverse());

        if (halfHeight > 0) {
            /*
                SIDE 2
            */
            pointsLeft.push(firstPoints[0])
            pointsRight.push(firstPoints[1])
        }

        indices_count = drawConnection(pointsLeft, indices, indices_count, pointsRight);
    }
    if (halfDepth > 0) {
        const depthTuples = [
            [patches[5]!, patches[4]!],
            [patches[6]!, patches[7]!],
            [patches[2]!, patches[3]!], 
            [patches[1]!, patches[0]!], 

        ] as const;

        depthTuples.forEach(tuple => {
            moveTuple(tuple, 2, halfDepth);
        });

        let tuple = depthTuples[0];
        pointsLeft.push(...tuple[0].patchPointsA.slice().reverse());
        pointsRight.push(...tuple[1].patchPointsC.slice().reverse());

        const firstPoints = [pointsLeft[0]!, pointsRight[0]!] as const

        /*
            BOTTOM has already been draw with width-draw
            Flush the buffer.
        */
        indices_count = drawConnection(pointsLeft, indices, indices_count, pointsRight);

        tuple = depthTuples[1];
        pointsLeft.push(...tuple[0].patchPointsC);
        pointsRight.push(...tuple[1].patchPointsA);

        if (halfHeight === 0) {
            /*
            SIDE 3
                Do not draw side when its area size is 0.
                Draw what is in buffer and reset it.
            */
            indices_count = drawConnection(pointsLeft, indices, indices_count, pointsRight);
        }

        tuple = depthTuples[2];
        pointsLeft.push(...tuple[0].patchPointsB);
        pointsRight.push(...tuple[1].patchPointsA);
        /*
            TOP has already been draw with width-draw
            Flush the buffer.
        */
        indices_count = drawConnection(pointsLeft, indices, indices_count, pointsRight);

        tuple = depthTuples[3];
        pointsLeft.push(...tuple[0].patchPointsA.slice().reverse());
        pointsRight.push(...tuple[1].patchPointsB.slice().reverse());
        if (halfHeight > 0) {
            /*
                SIDE 4
                auringon puoleinen
                Do not draw side when its area size is 0.
                Close the circle
            */
            pointsLeft.push(firstPoints[0])
            pointsRight.push(firstPoints[1])
        }
        indices_count = drawConnection(pointsLeft, indices, indices_count, pointsRight);
    }
    if (halfHeight > 0) {
        const heightTuples = [
            [patches[7]!, patches[3]!],
            [patches[6]!, patches[2]!],
            [patches[5]!, patches[1]!],
            [patches[4]!, patches[0]!],
        ] as const;
        heightTuples.forEach(tuple => {
            moveTuple(tuple, 1, halfHeight);
            pointsLeft.push(...tuple[0].patchPointsB);
            pointsRight.push(...tuple[1].patchPointsC.slice().reverse());
            indices_count = drawConnection(pointsLeft, indices, indices_count, pointsRight);
        });
    }
    // Normalize coordinates
    if (halfWidth > 0 || halfHeight > 0 || halfDepth > 0) {
        const max = 1 + Math.max(halfWidth, halfHeight, halfDepth);
        if (max !== 1) {
            verts.forEach(vert => {
                vert[0] /= max;
                vert[1] /= max;
                vert[2] /= max;
            });
        }
    }

    return [verticesAndNormals, indices] as const;
}

export type OctaSphereProps = {
    width?: number,
    height?: number,
    depth?: number
}

let uid = 0;
export class OctaSphere extends SimpleIndexedMesh {
    protected width: number;
    protected height: number;
    protected depth: number;

    constructor(
        {
            width = 0,
            height = 0,
            depth = 0
        }: OctaSphereProps,
        label = 'OctaSphere' + (uid++),
        can_collide = false,
        fixed = false,
        scenes?: Scene[],
    ) {
        const [vertices, indices] = tessellate_octasphere_patch(2, width, height, depth);
        const mesh_id = new_rust_mesh({
            label,
            scenes,
            fixed
        });
        super(
            {
                vertices: {
                    view: allocate_vec(vertices)
                },
                can_collide,
                frontFace: 'ccw'
            },
            mesh_id,
            allocate_vec(indices))

        this.width = width;
        this.height = height;
        this.depth = depth;

    }
}

function drawConnection(neighbor: number[], indices: Uint32Array, indices_count: number, myPoints: number[]) {
    neighbor.forEach((point, index) => {
        if (index === neighbor.length - 1)
            return;
        indices[indices_count++] = point;
        indices[indices_count++] = myPoints[index]!
        indices[indices_count++] = neighbor[index + 1]!;

        indices[indices_count++] = neighbor[index + 1]!;
        indices[indices_count++] = myPoints[index]!
        indices[indices_count++] = myPoints[index + 1]!
    });
    neighbor.length = 0;
    myPoints.length = 0;
    return indices_count;
}
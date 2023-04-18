import type { Scene } from "../../Scene.js";
import { TerraVector3, TerraVector4, Quaternion, MutableTerraVector3 } from "../../Math.js";
import { SimpleIndexedMesh } from "../AbstractMeshes/SimpleIndexedMesh.js";

type Patch = {
    verticesForPatch: TerraVector3[];
    patchPointsA: number[];
    patchPointsB: number[];
    patchPointsC: number[];
    quat: {
        euler: number[];
        quaternion: Quaternion | null;
    };
};

const HALF_PI = Math.PI * 0.5;
// Clone patch
const pathchesQuats = ([
    { euler: [0, 1, 0], quaternion: null }, //d
    { euler: [0, 2, 0], quaternion: null }, //d //w
    { euler: [0, 3, 0], quaternion: null }, //w
    { euler: [1, 0, 0], quaternion: null },
    { euler: [1, 1, 0], quaternion: null }, //d
    { euler: [1, 2, 0], quaternion: null }, //d //w
    { euler: [1, 3, 0], quaternion: null } //w
] as unknown as {
    euler: number[];
    quaternion: Quaternion | null;
}[]);
pathchesQuats.forEach(patch =>
    patch.quaternion = Quaternion.FromRotationYawPitchRoll(patch.euler[1]! * HALF_PI, patch.euler[0]! * HALF_PI, patch.euler[2]! * HALF_PI)
);
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

    const cornerPointsWidthDepth: number[] = new Array(8);
    const cornerPointsWidthHeight: number[] = new Array(8);
    const cornerPointsDepthHeight: number[] = new Array(8);
    for (let i = 0; i < 4; i++) {
        cornerPointsWidthDepth[i] = i * num_faces_per_patch + (num_faces_per_patch - 1)
    }

    cornerPointsWidthHeight[0] = 5 * num_faces_per_patch + n - 1;
    cornerPointsWidthHeight[1] = 2 * num_faces_per_patch;
    cornerPointsWidthHeight[2] = 1 * num_faces_per_patch + n - 1;
    cornerPointsWidthHeight[3] = 6 * num_faces_per_patch + (num_faces_per_patch - 1);

    cornerPointsWidthHeight[4] = 7 * num_faces_per_patch + n - 1;
    cornerPointsWidthHeight[5] = 0 * num_faces_per_patch;
    cornerPointsWidthHeight[6] = 3 * num_faces_per_patch + n - 1;
    cornerPointsWidthHeight[7] = 4 * num_faces_per_patch + (num_faces_per_patch - 1);

    cornerPointsDepthHeight[0] = 0 * num_faces_per_patch + n - 1;
    cornerPointsDepthHeight[1] = 1 * num_faces_per_patch;
    cornerPointsDepthHeight[2] = 4 * num_faces_per_patch + n - 1;
    cornerPointsDepthHeight[3] = 5 * num_faces_per_patch + (num_faces_per_patch - 1);

    cornerPointsDepthHeight[4] = 6 * num_faces_per_patch + n - 1;
    cornerPointsDepthHeight[5] = 7 * num_faces_per_patch + (num_faces_per_patch - 1);
    cornerPointsDepthHeight[6] = 2 * num_faces_per_patch + n - 1;
    cornerPointsDepthHeight[7] = 3 * num_faces_per_patch;


    for (let i = 4; i < 8; i++) {
        cornerPointsWidthDepth[i] = i * num_faces_per_patch
    }



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
        quat: {
            euler: [0, 0, 0],
            quaternion: null
        }
    }
    for (let j = 0; j < num_faces_per_patch; j++) {
        firstPatch.verticesForPatch[j] = verts[j]!;
    }
    const patches = pathchesQuats.map((quat, i) => {
        const patchPointsA: number[] = new Array(n);
        const patchPointsB: number[] = new Array(n);
        const patchPointsC: number[] = new Array(n);
        const verticesForPatch: TerraVector3[] = new Array(num_faces_per_patch);
        let indexOf: number;
        for (let j = 0; j < num_faces_per_patch; j++) {
            const vertice = verts[j]!.applyRotationQuaternionToRef(quat.quaternion!, verts[vert_index++]!);
            verticesForPatch[j] = vertice;
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
        return { verticesForPatch, patchPointsA, patchPointsB, patchPointsC, quat } as Patch;
    });
    patches.unshift(firstPatch)

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
    let idx: 0 | 1
    const ConstructDepthAndWidth = (
        tuples: readonly [readonly [Patch, Patch], readonly [Patch, Patch], readonly [Patch, Patch], readonly [Patch, Patch]]) => {
        tuples.forEach((tuple, i) => {
            moveTuple(tuple, 0, halfWidth);
            idx = i % 2 as 0 | 1;
            const leftPatch = tuple[idx ? 0 : 1];
            indices_count = drawConnection(i < 2 ? leftPatch.patchPointsB : leftPatch.patchPointsC, indices, indices_count, tuple[idx].patchPointsA)
        });
    }
    if (halfWidth > 0) {
        const widthTuples = [
            [patches[2]!, patches[1]!],
            [patches[3]!, patches[0]!],
            [patches[6]!, patches[5]!],
            [patches[7]!, patches[4]!]
        ] as const;
        ConstructDepthAndWidth(widthTuples);
    }
    if (halfDepth > 0) {
        const depthTuples = [
            [patches[1]!, patches[0]!],
            [patches[2]!, patches[3]!],
            [patches[5]!, patches[4]!],
            [patches[6]!, patches[7]!]
        ] as const;
        ConstructDepthAndWidth(depthTuples);
    }
    if (halfHeight > 0) {
        const heightTuples = [
            [patches[4]!, patches[0]!],
            [patches[5]!, patches[1]!],
            [patches[6]!, patches[2]!],
            [patches[7]!, patches[3]!]
        ] as const;

        heightTuples.forEach((tuple, i) => {
            moveTuple(tuple, 1, halfHeight);
            idx = i % 2 as 0 | 1;
            const [leftPoints, rightPoints] = idx ? [tuple[0].patchPointsB, tuple[1].patchPointsC] : [tuple[1].patchPointsC, tuple[0].patchPointsB]
            indices_count = drawConnection(leftPoints, indices, indices_count, rightPoints, true);
        })
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

    if (halfWidth > 0 && halfDepth > 0) {
        indices[indices_count++] = cornerPointsWidthDepth[0]!;
        indices[indices_count++] = cornerPointsWidthDepth[1]!;
        indices[indices_count++] = cornerPointsWidthDepth[2]!;

        indices[indices_count++] = cornerPointsWidthDepth[0]!;
        indices[indices_count++] = cornerPointsWidthDepth[2]!;
        indices[indices_count++] = cornerPointsWidthDepth[3]!;

        indices[indices_count++] = cornerPointsWidthDepth[6]!;
        indices[indices_count++] = cornerPointsWidthDepth[5]!;
        indices[indices_count++] = cornerPointsWidthDepth[4]!;

        indices[indices_count++] = cornerPointsWidthDepth[7]!;
        indices[indices_count++] = cornerPointsWidthDepth[6]!;
        indices[indices_count++] = cornerPointsWidthDepth[4]!;
    }
    if (halfWidth > 0 && halfHeight > 0) {
        indices[indices_count++] = cornerPointsWidthHeight[0]!;
        indices[indices_count++] = cornerPointsWidthHeight[1]!;
        indices[indices_count++] = cornerPointsWidthHeight[2]!;

        indices[indices_count++] = cornerPointsWidthHeight[3]!;
        indices[indices_count++] = cornerPointsWidthHeight[1]!;
        indices[indices_count++] = cornerPointsWidthHeight[0]!;

        indices[indices_count++] = cornerPointsWidthHeight[7]!;
        indices[indices_count++] = cornerPointsWidthHeight[5]!;
        indices[indices_count++] = cornerPointsWidthHeight[6]!;

        indices[indices_count++] = cornerPointsWidthHeight[4]!;
        indices[indices_count++] = cornerPointsWidthHeight[7]!;
        indices[indices_count++] = cornerPointsWidthHeight[6]!;
    }
    if (halfDepth > 0 && halfHeight > 0) {
        indices[indices_count++] = cornerPointsDepthHeight[2]!;
        indices[indices_count++] = cornerPointsDepthHeight[1]!;
        indices[indices_count++] = cornerPointsDepthHeight[0]!;

        indices[indices_count++] = cornerPointsDepthHeight[1]!;
        indices[indices_count++] = cornerPointsDepthHeight[2]!;
        indices[indices_count++] = cornerPointsDepthHeight[3]!;

        indices[indices_count++] = cornerPointsDepthHeight[4]!;
        indices[indices_count++] = cornerPointsDepthHeight[5]!;
        indices[indices_count++] = cornerPointsDepthHeight[6]!;

        indices[indices_count++] = cornerPointsDepthHeight[5]!;
        indices[indices_count++] = cornerPointsDepthHeight[7]!;
        indices[indices_count++] = cornerPointsDepthHeight[6]!;
    }
    return [verticesAndNormals, indices] as const;
}

let uid = 0;
export class OctaSphere extends SimpleIndexedMesh {
    constructor(
        label = 'OctaSphere' + (uid++),
        can_collide = false,
        fixed = false,
        protected width = 0,
        protected height = 0,
        protected depth = 0,
        scenes?: Scene[],
    ) {
        const [vertices, indices] = tessellate_octasphere_patch(2, width, height, depth);
        super(
            {
                vertices: {
                    view: vertices
                },
                can_collide,
                frontFace: 'ccw'
            },
            {
                label,
                scenes,
                fixed
            },
            indices)
    }
}

function drawConnection(neighbor: number[], indices: Uint32Array, indices_count: number, myPoints: number[], reverse = false) {
    neighbor.forEach((point, index) => {
        if (index === neighbor.length - 1)
            return;
        const idx = reverse ? (myPoints.length - 1) - index : index
        indices[indices_count++] = point;
        indices[indices_count++] = myPoints[idx]!
        indices[indices_count++] = neighbor[index + 1]!;

        indices[indices_count++] = neighbor[index + 1]!;
        indices[indices_count++] = myPoints[idx]!
        indices[indices_count++] = myPoints[idx + (reverse ? -1 : 1)]!
    });
    return indices_count;
}
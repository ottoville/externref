importScripts("/js/commonMath.js");
importScripts("/webworkers/ray.js");
let meshes = new Map();
class Mesh {
    private positionsView: Float32Array;
    private indicesView: Uint32Array;
    private normalsView: Float32Array | null;
    constructor(private indices: SharedArrayBuffer, private positions: SharedArrayBuffer, private normals: SharedArrayBuffer = null) {
        this.positionsView = new Float32Array(positions);
        this.indicesView = new Uint32Array(indices);
        if (normals)
            this.normalsView = new Float32Array(normals);
    }
    intersects(boundingBox: BoundingBox, boundingSphere: BoundingSphere, origin: Vector3, direction: Vector3, fastCheck?: boolean, trianglePredicate?: TrianglePickingPredicate): PickingInfo {
        let pickingInfo = new PickingInfo();
        //const boundingInfo = this._boundingInfo;
        let ray = new Ray(new Vector3(origin.x, origin.y, origin.z), new Vector3(direction.x, direction.y, direction.z));
        if (!ray.intersectsSphere(boundingSphere, 0) || !ray.intersectsBox(boundingBox, 0)) {
            return pickingInfo;
        }

        var intersectInfo: Nullable<IntersectionInfo> = null;

        if (!ray.intersectsBox(boundingBox)) {
            return pickingInfo;
        }

        // Triangles test
        let p0 = new Vector3();
        let p1 = new Vector3();
        let p2 = new Vector3();

        for (var index = 0; index < this.indicesView.length; index += 3) {
            p0.x = this.positionsView[this.indicesView[index] * 3]
            p0.y = this.positionsView[this.indicesView[index] * 3 + 1]
            p0.z = this.positionsView[this.indicesView[index] * 3 + 2]

            p1.x = this.positionsView[this.indicesView[index + 1] * 3]
            p1.y = this.positionsView[this.indicesView[index + 1] * 3 + 1]
            p1.z = this.positionsView[this.indicesView[index + 1] * 3 + 2]

            p2.x = this.positionsView[this.indicesView[index + 2] * 3]
            p2.y = this.positionsView[this.indicesView[index + 2] * 3 + 1]
            p2.z = this.positionsView[this.indicesView[index + 2] * 3 + 2]

            if (trianglePredicate && !trianglePredicate(p0, p1, p2, ray)) {
                continue;
            }
            var currentIntersectInfo = ray.intersectsTriangle(p0, p1, p2);

            if (currentIntersectInfo) {
                if (currentIntersectInfo.distance < 0) {
                    continue;
                }

                if (fastCheck || !intersectInfo || currentIntersectInfo.distance < intersectInfo.distance) {
                    intersectInfo = currentIntersectInfo;
                    intersectInfo.faceId = index / 3;

                    if (fastCheck) {
                        break;
                    }
                }
            }
        }
        if (intersectInfo) {
            // Get picked point
            const direction = new Vector3();
            ray.direction.scaleToRef(intersectInfo.distance, direction);
            //const worldDirection = Vector3.TransformNormal(direction, world);
            const pickedPoint = direction.addInPlace(ray.origin);

            // Return result
            pickingInfo.hit = true;
            pickingInfo.distance = Vector3.Distance(ray.origin, pickedPoint);
            pickingInfo.pickedPoint = pickedPoint;
            //pickingInfo.pickedMesh = this;
            pickingInfo.bu = intersectInfo.bu || 0;
            pickingInfo.bv = intersectInfo.bv || 0;
            pickingInfo.faceId = intersectInfo.faceId;
            pickingInfo.subMeshId = intersectInfo.subMeshId;
            return pickingInfo;
        }
        return pickingInfo;
    }
    /**
 * Compute normals for given positions and indices
 * @param positions an array of vertex positions, [...., x, y, z, ......]
 * @param indices an array of indices in groups of three for each triangular facet, [...., i, j, k, ......]
 * @param normals an array of vertex normals, [...., x, y, z, ......]
 * @param options an object used to set the following optional parameters for the TorusKnot, optional
  * * facetNormals : optional array of facet normals (vector3)
  * * facetPositions : optional array of facet positions (vector3)
  * * facetPartitioning : optional partitioning array. facetPositions is required for facetPartitioning computation
  * * ratio : optional partitioning ratio / bounding box, required for facetPartitioning computation
  * * bInfo : optional bounding info, required for facetPartitioning computation
  * * bbSize : optional bounding box size data, required for facetPartitioning computation
  * * subDiv : optional partitioning data about subdivsions on  each axis (int), required for facetPartitioning computation
  * * useRightHandedSystem: optional boolean to for right handed system computation
  * * depthSort : optional boolean to enable the facet depth sort computation
  * * distanceTo : optional Vector3 to compute the facet depth from this location
  * * depthSortedFacets : optional array of depthSortedFacets to store the facet distances from the reference location
 */
    ComputeNormals(options?: {
        facetNormals?: any, facetPositions?: any, facetPartitioning?: any, ratio?: number, bInfo?: any, bbSize?: Vector3, subDiv?: any,
        useRightHandedSystem?: boolean, depthSort?: boolean, distanceTo?: { x: number, number: number, z: number }, depthSortedFacets?: any
    }): SharedArrayBuffer {

        if (this.normals === null) {
            this.normals = new SharedArrayBuffer(this.positionsView.byteLength);
            this.normalsView = new Float32Array(this.normals)
        }

        // temporary scalar variables
        var index = 0;                      // facet index
        var p1p2x = 0.0;                    // p1p2 vector x coordinate
        var p1p2y = 0.0;                    // p1p2 vector y coordinate
        var p1p2z = 0.0;                    // p1p2 vector z coordinate
        var p3p2x = 0.0;                    // p3p2 vector x coordinate
        var p3p2y = 0.0;                    // p3p2 vector y coordinate
        var p3p2z = 0.0;                    // p3p2 vector z coordinate
        var faceNormalx = 0.0;              // facet normal x coordinate
        var faceNormaly = 0.0;              // facet normal y coordinate
        var faceNormalz = 0.0;              // facet normal z coordinate
        var length = 0.0;                   // facet normal length before normalization
        var v1x = 0;                        // vector1 x index in the positions array
        var v1y = 0;                        // vector1 y index in the positions array
        var v1z = 0;                        // vector1 z index in the positions array
        var v2x = 0;                        // vector2 x index in the positions array
        var v2y = 0;                        // vector2 y index in the positions array
        var v2z = 0;                        // vector2 z index in the positions array
        var v3x = 0;                        // vector3 x index in the positions array
        var v3y = 0;                        // vector3 y index in the positions array
        var v3z = 0;                        // vector3 z index in the positions array
        var computeFacetNormals = false;
        var computeFacetPositions = false;
        var computeFacetPartitioning = false;
        var computeDepthSort = false;
        var faceNormalSign = 1;
        let ratio = 0;
        var distanceTo = null;
        if (options) {
            computeFacetNormals = (options.facetNormals) ? true : false;
            computeFacetPositions = (options.facetPositions) ? true : false;
            computeFacetPartitioning = (options.facetPartitioning) ? true : false;
            faceNormalSign = (options.useRightHandedSystem === true) ? -1 : 1;
            ratio = options.ratio || 0;
            computeDepthSort = (options.depthSort) ? true : false;
            distanceTo = (options.distanceTo);
            if (computeDepthSort) {
                if (distanceTo === undefined) {
                    distanceTo = { x: 0, y: 0, z: 0 }
                }
                var depthSortedFacets = options.depthSortedFacets;
            }
        }

        // facetPartitioning reinit if needed
        let xSubRatio = 0;
        let ySubRatio = 0;
        let zSubRatio = 0;
        let subSq = 0;
        if (computeFacetPartitioning && options && options.bbSize) {
            var ox = 0;                 // X partitioning index for facet position
            var oy = 0;                 // Y partinioning index for facet position
            var oz = 0;                 // Z partinioning index for facet position
            var b1x = 0;                // X partitioning index for facet v1 vertex
            var b1y = 0;                // Y partitioning index for facet v1 vertex
            var b1z = 0;                // z partitioning index for facet v1 vertex
            var b2x = 0;                // X partitioning index for facet v2 vertex
            var b2y = 0;                // Y partitioning index for facet v2 vertex
            var b2z = 0;                // Z partitioning index for facet v2 vertex
            var b3x = 0;                // X partitioning index for facet v3 vertex
            var b3y = 0;                // Y partitioning index for facet v3 vertex
            var b3z = 0;                // Z partitioning index for facet v3 vertex
            var block_idx_o = 0;        // facet barycenter block index
            var block_idx_v1 = 0;       // v1 vertex block index
            var block_idx_v2 = 0;       // v2 vertex block index
            var block_idx_v3 = 0;       // v3 vertex block index

            var bbSizeMax = (options.bbSize.x > options.bbSize.y) ? options.bbSize.x : options.bbSize.y;
            bbSizeMax = (bbSizeMax > options.bbSize.z) ? bbSizeMax : options.bbSize.z;
            xSubRatio = options.subDiv.X * ratio / options.bbSize.x;
            ySubRatio = options.subDiv.Y * ratio / options.bbSize.y;
            zSubRatio = options.subDiv.Z * ratio / options.bbSize.z;
            subSq = options.subDiv.max * options.subDiv.max;
            options.facetPartitioning.length = 0;
        }

        // reset the normals
        for (index = 0; index < positions.length; index++) {
            this.normalsView[index] = 0.0;
        }

        // Loop : 1 indice triplet = 1 facet
        var nbFaces = (this.indicesView.length / 3) | 0;
        for (index = 0; index < nbFaces; index++) {

            // get the indexes of the coordinates of each vertex of the facet
            v1x = this.indicesView[index * 3] * 3;
            v1y = v1x + 1;
            v1z = v1x + 2;
            v2x = this.indicesView[index * 3 + 1] * 3;
            v2y = v2x + 1;
            v2z = v2x + 2;
            v3x = this.indicesView[index * 3 + 2] * 3;
            v3y = v3x + 1;
            v3z = v3x + 2;

            p1p2x = positions[v1x] - positions[v2x];          // compute two vectors per facet : p1p2 and p3p2
            p1p2y = positions[v1y] - positions[v2y];
            p1p2z = positions[v1z] - positions[v2z];

            p3p2x = positions[v3x] - positions[v2x];
            p3p2y = positions[v3y] - positions[v2y];
            p3p2z = positions[v3z] - positions[v2z];

            // compute the face normal with the cross product
            faceNormalx = faceNormalSign * (p1p2y * p3p2z - p1p2z * p3p2y);
            faceNormaly = faceNormalSign * (p1p2z * p3p2x - p1p2x * p3p2z);
            faceNormalz = faceNormalSign * (p1p2x * p3p2y - p1p2y * p3p2x);
            // normalize this normal and store it in the array facetData
            length = Math.sqrt(faceNormalx * faceNormalx + faceNormaly * faceNormaly + faceNormalz * faceNormalz);
            length = (length === 0) ? 1.0 : length;
            faceNormalx /= length;
            faceNormaly /= length;
            faceNormalz /= length;

            if (computeFacetNormals && options) {
                options.facetNormals[index].x = faceNormalx;
                options.facetNormals[index].y = faceNormaly;
                options.facetNormals[index].z = faceNormalz;
            }

            if (computeFacetPositions && options) {
                // compute and the facet barycenter coordinates in the array facetPositions
                options.facetPositions[index].x = (positions[v1x] + positions[v2x] + positions[v3x]) / 3.0;
                options.facetPositions[index].y = (positions[v1y] + positions[v2y] + positions[v3y]) / 3.0;
                options.facetPositions[index].z = (positions[v1z] + positions[v2z] + positions[v3z]) / 3.0;
            }

            if (computeFacetPartitioning && options) {
                // store the facet indexes in arrays in the main facetPartitioning array :
                // compute each facet vertex (+ facet barycenter) index in the partiniong array
                ox = Math.floor((options.facetPositions[index].x - options.bInfo.minimum.x * ratio) * xSubRatio);
                oy = Math.floor((options.facetPositions[index].y - options.bInfo.minimum.y * ratio) * ySubRatio);
                oz = Math.floor((options.facetPositions[index].z - options.bInfo.minimum.z * ratio) * zSubRatio);
                b1x = Math.floor((positions[v1x] - options.bInfo.minimum.x * ratio) * xSubRatio);
                b1y = Math.floor((positions[v1y] - options.bInfo.minimum.y * ratio) * ySubRatio);
                b1z = Math.floor((positions[v1z] - options.bInfo.minimum.z * ratio) * zSubRatio);
                b2x = Math.floor((positions[v2x] - options.bInfo.minimum.x * ratio) * xSubRatio);
                b2y = Math.floor((positions[v2y] - options.bInfo.minimum.y * ratio) * ySubRatio);
                b2z = Math.floor((positions[v2z] - options.bInfo.minimum.z * ratio) * zSubRatio);
                b3x = Math.floor((positions[v3x] - options.bInfo.minimum.x * ratio) * xSubRatio);
                b3y = Math.floor((positions[v3y] - options.bInfo.minimum.y * ratio) * ySubRatio);
                b3z = Math.floor((positions[v3z] - options.bInfo.minimum.z * ratio) * zSubRatio);

                block_idx_v1 = b1x + options.subDiv.max * b1y + subSq * b1z;
                block_idx_v2 = b2x + options.subDiv.max * b2y + subSq * b2z;
                block_idx_v3 = b3x + options.subDiv.max * b3y + subSq * b3z;
                block_idx_o = ox + options.subDiv.max * oy + subSq * oz;

                options.facetPartitioning[block_idx_o] = options.facetPartitioning[block_idx_o] ? options.facetPartitioning[block_idx_o] : new Array();
                options.facetPartitioning[block_idx_v1] = options.facetPartitioning[block_idx_v1] ? options.facetPartitioning[block_idx_v1] : new Array();
                options.facetPartitioning[block_idx_v2] = options.facetPartitioning[block_idx_v2] ? options.facetPartitioning[block_idx_v2] : new Array();
                options.facetPartitioning[block_idx_v3] = options.facetPartitioning[block_idx_v3] ? options.facetPartitioning[block_idx_v3] : new Array();

                // push each facet index in each block containing the vertex
                options.facetPartitioning[block_idx_v1].push(index);
                if (block_idx_v2 != block_idx_v1) {
                    options.facetPartitioning[block_idx_v2].push(index);
                }
                if (!(block_idx_v3 == block_idx_v2 || block_idx_v3 == block_idx_v1)) {
                    options.facetPartitioning[block_idx_v3].push(index);
                }
                if (!(block_idx_o == block_idx_v1 || block_idx_o == block_idx_v2 || block_idx_o == block_idx_v3)) {
                    options.facetPartitioning[block_idx_o].push(index);
                }
            }

            if (computeDepthSort && options && options.facetPositions) {
                var dsf = depthSortedFacets[index];
                dsf.ind = index * 3;
                //dsf.sqDistance = Vector3.DistanceSquared(options.facetPositions[index], distanceTo!);

                var x = options.facetPositions[index].x - distanceTo.x;
                var y = options.facetPositions[index].y - distanceTo.y;
                var z = options.facetPositions[index].z - distanceTo.z;

                dsf.sqDistance = (x * x) + (y * y) + (z * z);


            }

            // compute the normals anyway
            this.normalsView[v1x] += faceNormalx;                         // accumulate all the normals per face
            this.normalsView[v1y] += faceNormaly;
            this.normalsView[v1z] += faceNormalz;
            this.normalsView[v2x] += faceNormalx;
            this.normalsView[v2y] += faceNormaly;
            this.normalsView[v2z] += faceNormalz;
            this.normalsView[v3x] += faceNormalx;
            this.normalsView[v3y] += faceNormaly;
            this.normalsView[v3z] += faceNormalz;
        }
        // last normalization of each normal
        for (index = 0; index < this.normalsView.length / 3; index++) {
            faceNormalx = this.normalsView[index * 3];
            faceNormaly = this.normalsView[index * 3 + 1];
            faceNormalz = this.normalsView[index * 3 + 2];

            length = Math.sqrt(faceNormalx * faceNormalx + faceNormaly * faceNormaly + faceNormalz * faceNormalz);
            length = (length === 0) ? 1.0 : length;
            faceNormalx /= length;
            faceNormaly /= length;
            faceNormalz /= length;

            this.normalsView[index * 3] = faceNormalx;
            this.normalsView[index * 3 + 1] = faceNormaly;
            this.normalsView[index * 3 + 2] = faceNormalz;
        }
        return this.normals;
    }
}
onmessage = async (e: WorkerMessage<{meshId: number, args: any[]}>) => {
    if (e.data.action == 'init') {
        meshes.set(e.data.data.meshId, new Mesh(...<[SharedArrayBuffer, SharedArrayBuffer, SharedArrayBuffer | null]>e.data.data.args));
        //meshes.set(e.data.data.meshId, new Mesh(e.data.data.indices, e.data.data.positions, e.data.data.normals));
    } else {
        let mesh: Mesh = null;
        if (mesh = meshes.get(e.data.data.meshId)) {
            console.log(e);
            //TypeError: mesh[e.data.action] is not iterable (cannot read property Symbol(Symbol.iterator))
            let r = mesh[e.data.action](...e.data.data.args);
            this.postMessage({ id: e.data.id, data: r });
        }
    }
}
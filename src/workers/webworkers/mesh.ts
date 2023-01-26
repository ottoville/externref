//importScripts("/js/workers/webworkers/ray.js");

const meshes: Map<number, Mesh> = new Map();
interface pickInfo {
    pickMesh?: number;
    faceId?: number;
    bv?: number;
    bu?: number;
    pickedMesh?: number;
    distance?: number;
    hit: boolean;

}
class Mesh {

    /* static async collissionCheck(rayFunction: (mesh: Mesh) => any, boundables: IterableIterator<Mesh>, pickResult: PickingInfo | null, fastCheck?: boolean, predicate?: (mesh: Mesh) => boolean): Promise<PickingInfo | null> {
         let boundableMesh: Mesh;
         do {
             const boundable = boundables.next();
             if (boundable.done)
                 return new Promise(res => res(pickResult));
             boundableMesh = boundable.value;

         } while (predicate ? !predicate(boundableMesh) : false);

         const ray = rayFunction(boundableMesh);
         const result = await boundableMesh.intersects(ray.origin, ray.direction);
         if (!result || !result.hit)
             return this.collissionCheck(rayFunction, boundables, pickResult, fastCheck, predicate);
         if (!fastCheck && pickResult != null && result.distance >= pickResult.distance)
             return this.collissionCheck(rayFunction, boundables, pickResult, fastCheck, predicate);
         pickResult = result;
         if (fastCheck)
             return result;
         else
             return this.collissionCheck(rayFunction, boundables, pickResult);
     }*/


    readonly #positionsView: Float32Array;
    readonly #indicesView: Uint32Array | undefined;
    readonly #boundingBox: Float32Array;
    #pickingPoint: Float32Array;
    #pickingDistance: Float32Array;
    constructor(
        public readonly uniqueID: number,
        readonly indices: SharedArrayBuffer | undefined,
        readonly positions: SharedArrayBuffer,
        private readonly positionsStride: number,
        private readonly boundingBoxBuffer: SharedArrayBuffer,
        readonly pickingBuffer: SharedArrayBuffer
    ) {
        this.#boundingBox = new Float32Array(this.boundingBoxBuffer);
        this.#positionsView = new Float32Array(positions);
        this.#pickingPoint = new Float32Array(pickingBuffer, 0, 3);
        this.#pickingDistance = new Float32Array(pickingBuffer, 3 * 4, 1);

        if (indices)
            this.#indicesView = new Uint32Array(indices);
    }
    intersectsRay(rayArrBuff: ArrayBuffer, fastCheck?: boolean, trianglePredicate?: TrianglePickingPredicate): void {

        //boundingBox: { min: { x: number, y: number, z: number }, max: { x: number, y: number, z: number } },
        // let boundingBox = { min: { x: this.boundingBox[0], y: this.boundingBox[1], z: this.boundingBox[2] }, max: { x: this.boundingBox[3], y: this.boundingBox[4], z: this.boundingBox[5] } }
        /*let pickingInfo: pickInfo = {
            hit: false,
        };*/
        this.#pickingPoint.set([NaN, NaN, NaN]);
        this.#pickingDistance.set([NaN]);


        //const boundingInfo = this._boundingInfo;
        const ray = new Ray(new Float32Array(rayArrBuff, 0, 3) as unknown as [number, number, number], new Float32Array(rayArrBuff, 3 * 4) as unknown as [number, number, number]);

        if (!ray.intersectsBoxMinMax({ x: this.#boundingBox[0], y: this.#boundingBox[1], z: this.#boundingBox[2] }, { x: this.#boundingBox[3], y: this.#boundingBox[4], z: this.#boundingBox[5] })) {
            return; // pickingInfo;
        }
        var intersectInfo: IntersectionInfo | null = null;

        // Triangles test
        const p0: [number, number, number] = [0, 0, 0]
        const p1: [number, number, number] = [0, 0, 0]
        const p2: [number, number, number] = [0, 0, 0]
        if (!this.#indicesView) {
            console.error('Intersection with non indexed mesh not coded');
            return; // pickingInfo;
        }
        for (var index = 0; index < this.#indicesView.length; index += 3) {
            p0[0] = this.#positionsView[this.#indicesView[index] * this.positionsStride]
            p0[1] = this.#positionsView[this.#indicesView[index] * this.positionsStride + 1]
            p0[2] = this.#positionsView[this.#indicesView[index] * this.positionsStride + 2]

            p1[0] = this.#positionsView[this.#indicesView[index + 1] * this.positionsStride]
            p1[1] = this.#positionsView[this.#indicesView[index + 1] * this.positionsStride + 1]
            p1[2] = this.#positionsView[this.#indicesView[index + 1] * this.positionsStride + 2]

            p2[0] = this.#positionsView[this.#indicesView[index + 2] * this.positionsStride]
            p2[1] = this.#positionsView[this.#indicesView[index + 2] * this.positionsStride + 1]
            p2[2] = this.#positionsView[this.#indicesView[index + 2] * this.positionsStride + 2]

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
            const direction: [number, number, number] = [0, 0, 0]
            //ray.direction.scaleToRef(intersectInfo.distance, direction);
            direction[0] = ray.direction[0] * intersectInfo.distance
            direction[1] = ray.direction[1] * intersectInfo.distance
            direction[2] = ray.direction[2] * intersectInfo.distance

            //const worldDirection = Vector3.TransformNormal(direction, world);
            //  const pickedPoint = direction.addInPlace(ray.origin);
            direction[0] += ray.origin[0]
            direction[1] += ray.origin[1]
            direction[2] += ray.origin[2]
            const pickedPoint = direction
            // Return result
            this.#pickingPoint.set([pickedPoint[0], pickedPoint[1], pickedPoint[2]]);
            // this.#pickingDistance.set([Vector3.Distance(ray.origin, pickedPoint)]);
            const x = ray.origin[0] - pickedPoint[0]
            const y = ray.origin[1] - pickedPoint[1]
            const z = ray.origin[2] - pickedPoint[2]

            this.#pickingDistance.set([Math.sqrt(x * x + y * y + z * z)]);


            /* pickingInfo.hit = true;
             pickingInfo.distance = Vector3.Distance(ray.origin, pickedPoint);
             pickingInfo.pickedPoint = pickedPoint;
             pickingInfo.pickMesh = this.uniqueID;
             pickingInfo.bu = intersectInfo.bu || 0;
             pickingInfo.bv = intersectInfo.bv || 0;
             pickingInfo.faceId = intersectInfo.faceId;*/
            //pickingInfo.subMeshId = intersectInfo.subMeshId;

            return; //pickingInfo;
        }
        return; //pickingInfo;
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
    /*  ComputeNormals(options?: {
          facetNormals?: any, facetPositions?: any, facetPartitioning?: any, ratio?: number, bInfo?: any, bbSize?: Vector3, subDiv?: any,
          useRightHandedSystem?: boolean, depthSort?: boolean, distanceTo?: { x: number, y: number, z: number }, depthSortedFacets?: any
      }): SharedArrayBuffer {

          if (this.normals === null) {
              this.normals = new SharedArrayBuffer(this.positionsView.byteLength);
          }
          let normalsView = new Float32Array(this.normals)
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
          for (index = 0; index < this.positionsView.length; index++) {
              normalsView[index] = 0.0;
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

              p1p2x = this.positionsView[v1x] - this.positionsView[v2x];          // compute two vectors per facet : p1p2 and p3p2
              p1p2y = this.positionsView[v1y] - this.positionsView[v2y];
              p1p2z = this.positionsView[v1z] - this.positionsView[v2z];

              p3p2x = this.positionsView[v3x] - this.positionsView[v2x];
              p3p2y = this.positionsView[v3y] - this.positionsView[v2y];
              p3p2z = this.positionsView[v3z] - this.positionsView[v2z];

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
                  options.facetPositions[index].x = (this.positionsView[v1x] + this.positionsView[v2x] + this.positionsView[v3x]) / 3.0;
                  options.facetPositions[index].y = (this.positionsView[v1y] + this.positionsView[v2y] + this.positionsView[v3y]) / 3.0;
                  options.facetPositions[index].z = (this.positionsView[v1z] + this.positionsView[v2z] + this.positionsView[v3z]) / 3.0;
              }

              if (computeFacetPartitioning && options) {
                  // store the facet indexes in arrays in the main facetPartitioning array :
                  // compute each facet vertex (+ facet barycenter) index in the partiniong array
                  ox = Math.floor((options.facetPositions[index].x - options.bInfo.minimum.x * ratio) * xSubRatio);
                  oy = Math.floor((options.facetPositions[index].y - options.bInfo.minimum.y * ratio) * ySubRatio);
                  oz = Math.floor((options.facetPositions[index].z - options.bInfo.minimum.z * ratio) * zSubRatio);
                  b1x = Math.floor((this.positionsView[v1x] - options.bInfo.minimum.x * ratio) * xSubRatio);
                  b1y = Math.floor((this.positionsView[v1y] - options.bInfo.minimum.y * ratio) * ySubRatio);
                  b1z = Math.floor((this.positionsView[v1z] - options.bInfo.minimum.z * ratio) * zSubRatio);
                  b2x = Math.floor((this.positionsView[v2x] - options.bInfo.minimum.x * ratio) * xSubRatio);
                  b2y = Math.floor((this.positionsView[v2y] - options.bInfo.minimum.y * ratio) * ySubRatio);
                  b2z = Math.floor((this.positionsView[v2z] - options.bInfo.minimum.z * ratio) * zSubRatio);
                  b3x = Math.floor((this.positionsView[v3x] - options.bInfo.minimum.x * ratio) * xSubRatio);
                  b3y = Math.floor((this.positionsView[v3y] - options.bInfo.minimum.y * ratio) * ySubRatio);
                  b3z = Math.floor((this.positionsView[v3z] - options.bInfo.minimum.z * ratio) * zSubRatio);

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

                  var x = options.facetPositions[index].x - distanceTo!.x;
                  var y = options.facetPositions[index].y - distanceTo!.y;
                  var z = options.facetPositions[index].z - distanceTo!.z;

                  dsf.sqDistance = (x * x) + (y * y) + (z * z);


              }
              // compute the normals anyway
              normalsView[v1x] += faceNormalx;                         // accumulate all the normals per face
              normalsView[v1y] += faceNormaly;
              normalsView[v1z] += faceNormalz;
              normalsView[v2x] += faceNormalx;
              normalsView[v2y] += faceNormaly;
              normalsView[v2z] += faceNormalz;
              normalsView[v3x] += faceNormalx;
              normalsView[v3y] += faceNormaly;
              normalsView[v3z] += faceNormalz;
          }
          // last normalization of each normal
          for (index = 0; index < normalsView.length / 3; index++) {
              faceNormalx = normalsView[index * 3];
              faceNormaly = normalsView[index * 3 + 1];
              faceNormalz = normalsView[index * 3 + 2];

              length = Math.sqrt(faceNormalx * faceNormalx + faceNormaly * faceNormaly + faceNormalz * faceNormalz);
              length = (length === 0) ? 1.0 : length;
              faceNormalx /= length;
              faceNormaly /= length;
              faceNormalz /= length;

              normalsView[index * 3] = faceNormalx;
              normalsView[index * 3 + 1] = faceNormaly;
              normalsView[index * 3 + 2] = faceNormalz;
          }
          return this.normals;
      }*/
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
onmessage = (e: WorkerMessageObject<{ objId?: number, args: any[] }, Mesh>) => {
    if (e.data.action == 'init') {
        meshes.set(e.data.data.objId!, new Mesh(e.data.data.objId!, ...<[SharedArrayBuffer, SharedArrayBuffer, number, SharedArrayBuffer, SharedArrayBuffer]>e.data.data.args));
        //meshes.set(e.data.data.meshId, new Mesh(e.data.data.indices, e.data.data.positions, e.data.data.normals));
    } else if ('objId' in e.data.data) {
        let mesh: Mesh | undefined;
        if (mesh = meshes.get(e.data.data.objId!)) {
            //@ts-ignore
            const r = mesh[e.data.action](...e.data.data.args);
            if (typeof (e.data.id) !== 'undefined') {
                self.postMessage({ id: e.data.id, data: r });
            }
        }
    } else {
        //@ts-ignore
        const r = Mesh[e.data.action](...e.data.data.args);
        if (typeof (e.data.id) !== 'undefined')
            self.postMessage({ id: e.data.id, data: r });
    }
}
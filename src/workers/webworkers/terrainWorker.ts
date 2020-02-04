importScripts("/js/commonMath.js");
importScripts("/webworkers/ray.js");


let terrainPositions: Float32Array;
let terrainIndices: Uint32Array;
let terrainNormals: Float32Array;
let slopeArr: Int16Array;
let facet1Arr: Float32Array;
let facet2Arr: Float32Array;

function VERTEX_CreateGroundFromHeightMap(options: { width: number, height: number, subdivisions: number, minHeight: number, maxHeight: number, colorFilter: number[], buffer: Uint8ClampedArray, bufferWidth: number, bufferHeight: number, alphaFilter: number }) {
    var indices = [];
    var positions = [];
    var normals = [];
    var uvs = [];
    var row, col;
    var filter = options.colorFilter || [0.3, 0.59, 0.11];
    var alphaFilter = options.alphaFilter || 0.0;
    var invert = false;

    if (options.minHeight > options.maxHeight) {
        invert = true;
        let temp = options.maxHeight;
        options.maxHeight = options.minHeight;
        options.minHeight = temp;
    }
    var position = {
        x: 0,
        y: 0,
        z: 0
    }
    // Vertices
    for (row = 0; row <= options.subdivisions; row++) {
        for (col = 0; col <= options.subdivisions; col++) {
            position.x = (col * options.width) / options.subdivisions - (options.width / 2.0);
            position.z = ((options.subdivisions - row) * options.height) / options.subdivisions - (options.height / 2.0);


            // Compute height
            var heightMapX = (((position.x + options.width / 2) / options.width) * (options.bufferWidth - 1)) | 0;
            var heightMapY = ((1.0 - (position.z + options.height / 2) / options.height) * (options.bufferHeight - 1)) | 0;

            var pos = (heightMapX + heightMapY * options.bufferWidth) * 4;
            var r = options.buffer[pos] / 255.0;
            var g = options.buffer[pos + 1] / 255.0;
            var b = options.buffer[pos + 2] / 255.0;
            var a = options.buffer[pos + 3] / 255.0;

            if (invert) {
                r = 1.0 - r;
                g = 1.0 - g;
                b = 1.0 - b;
            }

            var gradient = r * filter[0] + g * filter[1] + b * filter[2];

            // If our alpha channel is not within our filter then we will assign a 'special' height
            // Then when building the indices, we will ignore any vertex that is using the special height
            if (a >= alphaFilter) {
                position.y = options.minHeight + (options.maxHeight - options.minHeight) * gradient;
            }
            else {
                position.y = options.minHeight - Epsilon; // We can't have a height below minHeight, normally.
            }

            // Add  vertex
            positions.push(position.x, position.y, position.z);
            normals.push(0, 0, 0);
            uvs.push(col / options.subdivisions, 1.0 - row / options.subdivisions);
        }
    }

    // Indices
    for (row = 0; row < options.subdivisions; row++) {
        for (col = 0; col < options.subdivisions; col++) {
            // Calculate Indices
            var idx1 = (col + 1 + (row + 1) * (options.subdivisions + 1));
            var idx2 = (col + 1 + row * (options.subdivisions + 1));
            var idx3 = (col + row * (options.subdivisions + 1));
            var idx4 = (col + (row + 1) * (options.subdivisions + 1));

            // Check that all indices are visible (based on our special height)
            // Only display the vertex if all Indices are visible
            // Positions are stored x,y,z for each vertex, hence the * 3 and + 1 for height
            var isVisibleIdx1 = positions[idx1 * 3 + 1] >= options.minHeight;
            var isVisibleIdx2 = positions[idx2 * 3 + 1] >= options.minHeight;
            var isVisibleIdx3 = positions[idx3 * 3 + 1] >= options.minHeight;
            if (isVisibleIdx1 && isVisibleIdx2 && isVisibleIdx3) {
                indices.push(idx1);
                indices.push(idx2);
                indices.push(idx3);
            }

            var isVisibleIdx4 = positions[idx4 * 3 + 1] >= options.minHeight;
            if (isVisibleIdx4 && isVisibleIdx1 && isVisibleIdx3) {
                indices.push(idx4);
                indices.push(idx1);
                indices.push(idx3);
            }
        }
    }

    // Normals
    //ComputeNormals(positions, indices, normals);

    // Result
    var vertexData = { indices: [], positions: [], uvs: [] };

    vertexData.indices = indices;
    vertexData.positions = positions;
    //vertexData.normals = normals;
    vertexData.uvs = uvs;

    return vertexData;
};

function intersects(boundingBox: BoundingBox, boundingSphere: BoundingSphere, ray: Ray, fastCheck?: boolean, trianglePredicate?: TrianglePickingPredicate): PickingInfo {
    let pickingInfo = new PickingInfo();
    //const boundingInfo = this._boundingInfo;
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

    for (var index = 0; index < terrainIndices.length; index += 3) {


        p0.x = terrainPositions[terrainIndices[index] * 3]
        p0.y = terrainPositions[terrainIndices[index] * 3 + 1]
        p0.z = terrainPositions[terrainIndices[index] * 3 + 2]

        p1.x = terrainPositions[terrainIndices[index + 1] * 3]
        p1.y = terrainPositions[terrainIndices[index + 1] * 3 + 1]
        p1.z = terrainPositions[terrainIndices[index + 1] * 3 + 2]

        p2.x = terrainPositions[terrainIndices[index + 2] * 3]
        p2.y = terrainPositions[terrainIndices[index + 2] * 3 + 1]
        p2.z = terrainPositions[terrainIndices[index + 2] * 3 + 2]

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

let pickInfo: PickingInfo;
let _facesOfVertices: any[];
let _groundFacesNormals: Vector3[];
let _subdivisionsOfVertices: any[];
let heightMax = 500;
let heightMin = -500;
let _selectedVertices: { vertice: number, distance: number, col: number, row: number }[] | null = null;
let _subdivisionsY:number;
let _subdivisionsX:number;

const nearScreenSource = new Vector3();
const farScreenSource = new Vector3();
const nearVec3 = new Vector3();
const farVec3 = new Vector3();

let boundingBox;
let boundingSphere;


let methods2: { [index: string]: (e: WMessage<any>) => void} = {
    init: (e: WMessage<{ positions: any, indices: any, normals: any, slopeArr: any, facet1Arr: any, facet2Arr: any, subdivisionsX: any, subdivisionsY: any, boundingBox: any, boundingSphere: any }>) => {
        terrainPositions = new Float32Array(e.data.positions);
        terrainIndices = new Uint32Array(e.data.indices);
        terrainNormals = new Float32Array(e.data.normals);
        slopeArr = new Int16Array(e.data.slopeArr);
        facet1Arr = new Float32Array(e.data.facet1Arr);
        facet2Arr = new Float32Array(e.data.facet2Arr);
        _subdivisionsX = e.data.subdivisionsX;
        _subdivisionsY = e.data.subdivisionsY;

        boundingBox = e.data.boundingBox;
        boundingSphere = e.data.boundingSphere;
        if (_facesOfVertices == null) {
            _facesOfVertices = [];

            _groundFacesNormals = [];
            let v1v2 = new Vector3();
            let v3v2 = new Vector3();
            for (let index = 0; index < terrainIndices.length / 3; index++) {
                //var faceInfo = this._getFaceVerticesIndex(index);
                let faceInfo = new Uint32Array(e.data.indices, (index * 3) << 2, 3);

                v1v2.x = terrainPositions[faceInfo[0] * 3] - terrainPositions[faceInfo[1] * 3];
                v1v2.y = terrainPositions[faceInfo[0] * 3 + 1] - terrainPositions[faceInfo[1] * 3 + 1];
                v1v2.z = terrainPositions[faceInfo[0] * 3 + 2] - terrainPositions[faceInfo[1] * 3 + 2];

                v3v2.x = terrainPositions[faceInfo[2] * 3] - terrainPositions[faceInfo[1] * 3];
                v3v2.y = terrainPositions[faceInfo[2] * 3 + 1] - terrainPositions[faceInfo[1] * 3 + 1];
                v3v2.z = terrainPositions[faceInfo[2] * 3 + 2] - terrainPositions[faceInfo[1] * 3 + 2];
                _groundFacesNormals[index] = Vector3.Normalize(Vector3.Cross(v1v2, v3v2));
            }
            //this._getFacesOfVertices();
            _facesOfVertices = [];
            _subdivisionsOfVertices = [];
            var index;
            let length = terrainPositions.length / 3;
            for (index = 0; index < length; index++) {
                _facesOfVertices[index] = [];
                _subdivisionsOfVertices[index] = [];
            }
            for (index = 0; index < terrainIndices.length; index++) {
                _facesOfVertices[terrainIndices[index]].push((index / 3) | 0);
            }
        }
        methods2.createHeights(e);
        this.postMessage({ id: e.id, data: { } });
    },
    saveTexture: (arrayBuffer: WMessage<ArrayBuffer>) => {
        //@ts-ignore
        let c = new OffscreenCanvas(...new Int32Array(arrayBuffer.data, 0, 2))

        let ctx = c.getContext("2d");
        if (!ctx)
            throw ('get 2d context failed');
        ctx.putImageData(new ImageData(new Uint8ClampedArray(arrayBuffer.data, Int32Array.BYTES_PER_ELEMENT * 2), c.width, c.height), 0, 0);
        c.toBlob(async b => {
            if (b) {
                vdata.texture = b;
                queueMicrotask(async () => {
                    (await DB).transaction('maps', 'readwrite').objectStore('maps').put(vdata);
                });
            } else {
                trej('To Blob failed')
            }
        }, 'image/webp', 1);
    },
    createHeightMap: async (d: { id?: number }) => {
        try {
            let img = await fetch('/images/tenerife3_75.webp');
            let b = await img.blob();

            let bitmap = await createImageBitmap(b);

            /* RangeError: Array buffer allocation failed */
            //let totalbufferdata = new SharedArrayBuffer(10000 * 10000 * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT);
            let totalbufferdata = new SharedArrayBuffer(250 * 250 * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT);

            let align = (250 - bitmap.width) / 2

            let partcount = 2;
            let readycount = 0;
            let workers: Worker[] = [];
            self.postMessage({ type: 'setProgress', data: { progress: 41 } });
            (function initWorker(bitmap) {
                let worker = new Worker('bitmapWorker.js');
                workers.push(worker);
                /* progress 42 and 43 are reserved for this */
                self.postMessage({ type: 'setProgress', data: { progress: 41 + (2 * (workers.length / partcount)) } });
                worker.postMessage({ bitmap: bitmap, buffer: totalbufferdata, partcount: partcount, partnumber: workers.length - 1, align: align }, [bitmap]);
                worker.onmessage = e => {
                    try {
                        if (e.data.type == 'init') {
                            if (workers.length < partcount) {
                                bitmap = e.data.bitmap;
                                initWorker(bitmap);
                            } else {
                                self.postMessage({ type: 'setProgress', data: { progress: 45 } });
                                bitmap.close();
                                self.postMessage({ type: 'setProgress', data: { progress: 46 } });
                            }
                        } else if (e.data.type == 'ready') {
                            if (++readycount == partcount) {
                                self.postMessage({ type: 'setProgress', data: { progress: 48 } });
                                self.postMessage({
                                    id: d.id, data: VERTEX_CreateGroundFromHeightMap({
                                        width: 10000, height: 10000,
                                        subdivisions: 250,
                                        minHeight: -2, maxHeight: 250, colorFilter: [0.3, 0.59, 0.11],
                                        buffer: new Uint8ClampedArray(totalbufferdata), bufferWidth: 250, bufferHeight: 250,
                                        alphaFilter: 0.0
                                    })
                                });
                                workers.forEach(w => w.terminate());
                            }
                        } else if (e.data.type == 'rejected') {
                            throw (e.data.data);
                        }
                    } catch (e) {
                        if (e instanceof DOMException) {
                            self.postMessage({ id: d.id, rejected: true, data: e.message });
                        } else
                            self.postMessage({ id: d.id, rejected: true, data: e });
                    }
                }
            })(bitmap);
        } catch (e) {
            if (e instanceof DOMException) {
                self.postMessage({ id: d.id, rejected: true, data: e.name + ': ' + e.message });
            } else
                self.postMessage({ id: d.id, rejected: true, data: e });
        }
    },
    mousemove: (e: WMessage<{x:number, y:number, viewportWidth:number, viewportHeight:number, projection: any, view:any}>) => {
        let ray = Ray.Zero();
        /* ray.unprojectRayToRef(e.data.x,
             e.data.y,
             e.data.viewportWidth, e.data.viewportHeight,
             Matrix.FromArray(e.data.view), Matrix.FromArray(e.data.projection));
             */


        /* unprojectRayToRef start */
        let view = Matrix.FromArray(e.data.view);
        view.multiplyToRef(Matrix.FromArray(e.data.projection), <Matrix>view);
        //view.multiply(Matrix.FromArray(e.data.projection));
        view.invert();
        nearScreenSource.x = e.data.x / e.data.viewportWidth * 2 - 1;
        nearScreenSource.y = -(e.data.y / e.data.viewportHeight * 2 - 1);
        nearScreenSource.z = -1.0;
        //var farScreenSource = new Vector3().copyFromFloats(nearScreenSource.x, nearScreenSource.y, 1.0);
        farScreenSource.x = nearScreenSource.x;
        farScreenSource.y = nearScreenSource.y;
        farScreenSource.z = 1.0;

        Vector3._UnprojectFromInvertedMatrixToRef(nearScreenSource, view, nearVec3);
        Vector3._UnprojectFromInvertedMatrixToRef(farScreenSource, view, farVec3);

        ray.origin.copyFrom(nearVec3);
        farVec3.subtractToRef(nearVec3, ray.direction);
        ray.direction.normalize();
        /* unprojectRayToRef end */

        pickInfo = intersects(boundingBox, boundingSphere, ray);
        _selectedVertices = null
        if (pickInfo.pickedPoint) {
            self.postMessage({ id: e.id, data: { x: pickInfo.pickedPoint.x, y: pickInfo.pickedPoint.z } });
        }
    },
    elevateFaces: (e: WMessage<{radius:number, height:number, direction: number}>) => {
        let radiusPow = Math.pow(e.data.radius, 2);
        // Impact zone
        if (_selectedVertices == null) {
            _selectedVertices = [];
            let sphereCenter = new Vector2(pickInfo.pickedPoint.x, pickInfo.pickedPoint.z);

            let position = new Vector2();
            let length = terrainPositions.length / 3;
            for (let index = 0; index < length; index++) {
                position.x = terrainPositions[index * 3];
                position.y = terrainPositions[index * 3 + 2];
                let distance = Vector2.DistanceSquared(position, sphereCenter);
                if (distance < radiusPow) {
                    _selectedVertices.push({
                        col: 250 / (10000 / (5000 + position.x)) | 0,
                        row: 250 / (10000 / (5000 - position.y)) | 0,
                        vertice: index,
                        distance: Math.sqrt(distance)
                    });
                }
            }
        }

        // Elevate vertices
        let faces: {
            faceID: number,
            indices: Uint32Array
        }[] = [];
        let v1v2 = new Vector3();
        let v3v2 = new Vector3();
        _selectedVertices.forEach(sv => {
            //let positiony = this._groundPositions[sv.vertice].y;
            let positiony = terrainPositions[sv.vertice * 3 + 1];
            var fullHeight = e.data.height * e.data.direction;
            if (sv.distance < e.data.radius * 0.3) {
                positiony += fullHeight;
            } else {
                positiony += fullHeight * (1.0 - (sv.distance - e.data.radius * 0.3) / (e.data.radius * 0.7));
            }

            if (positiony > heightMax)
                positiony = heightMax;
            else if (positiony < heightMin)
                positiony = heightMin;

            terrainPositions[sv.vertice * 3 + 1] = positiony;

            //this._updateSubdivisions(sv.vertice);


            var faceOfVertices = _facesOfVertices[sv.vertice];
            for (let index = 0; index < faceOfVertices.length; index++) {

                let indices = new Uint32Array(terrainIndices.buffer, (faceOfVertices[index] * 3) << 2, 3);

                v1v2.x = terrainPositions[indices[0] * 3] - terrainPositions[indices[1] * 3];
                v1v2.y = terrainPositions[indices[0] * 3 + 1] - terrainPositions[indices[1] * 3 + 1];
                v1v2.z = terrainPositions[indices[0] * 3 + 2] - terrainPositions[indices[1] * 3 + 2];

                v3v2.x = terrainPositions[indices[2] * 3] - terrainPositions[indices[1] * 3];
                v3v2.y = terrainPositions[indices[2] * 3 + 1] - terrainPositions[indices[1] * 3 + 1];
                v3v2.z = terrainPositions[indices[2] * 3 + 2] - terrainPositions[indices[1] * 3 + 2];

                _groundFacesNormals[faceOfVertices[index]] = Vector3.Normalize(Vector3.Cross(v1v2, v3v2));

                indices.forEach(vertexIndex => {
                    var faces = _facesOfVertices[vertexIndex];
                    // let normal = BABYLON.Vector3.Zero();
                    let x = 0;
                    let y = 0;
                    let z = 0;
                    for (var index = 0; index < faces.length; index++) {
                        let facenormal = _groundFacesNormals[faces[index]];
                        x += facenormal.x;
                        y += facenormal.y;
                        z += facenormal.z;
                        //normal = normal.add(this._groundFacesNormals[faces[index]]);
                    }
                    let fc = 1.0 / faces.length;
                    x *= fc;
                    y *= fc;
                    z *= fc;
                    //Normalize
                    let scale = 1 / Math.sqrt(x * x + y * y + z * z);
                    x *= scale;
                    y *= scale;
                    z *= scale;

                    // normal = BABYLON.Vector3.Normalize(normal.scale(1.0 / faces.length));
                    terrainNormals.set([x, y, z], vertexIndex * 3);
                });
            };
            ((ypos) => {
                //let ypos = this.terrain.positions[vertexIndex * 3 + 1];
                //for (var index = 0; index < this._subdivisionsOfVertices[vertexIndex].length; index++) {
                    //var sub = this._subdivisionsOfVertices[vertexIndex][index];
                    //let boundingBox = e.data.boundingBox;
                    //let boundingSphere = sub.getBoundingInfo().boundingSphere;

                    if (ypos < boundingBox.minimum.y) {
                        boundingSphere.radius += Math.abs(ypos - boundingBox.minimum.y);
                        boundingBox.minimum.y = ypos;
                    } else if (ypos > boundingBox.maximum.y) {
                        boundingBox.maximum.y = ypos;
                    }
                //}

                /*var boundingBox = this.terrain.getBoundingInfo().boundingBox;
                var boundingSphere = this.terrain.getBoundingInfo().boundingSphere;
                if (ypos < boundingBox.minimum.y) {
                    boundingSphere.radius += Math.abs(ypos - boundingBox.minimum.y);
                    boundingBox.minimum.y = ypos;
                } else if (ypos > boundingBox.maximum.y) {
                    boundingBox.maximum.y = ypos;
                }*/
            })(positiony);
        });
        self.postMessage({
            type: 'bounding', data: {
                boundingSphereRadius: boundingSphere.radius,
                boundingBox: { minY: boundingBox.minimum.y, maxY: boundingBox.maximum.y}
            }
        });

        // Normals
        let normalsMin = Math.min(...faces.map(f => Math.min(...f.indices))) * 3;
        let normalsMax = Math.max(...faces.map(f => Math.max(...f.indices))) * 3;
        let subvertices = _selectedVertices.map(sv => sv.vertice);
        let min = Math.min(...subvertices) * 3;
        let max = Math.max(...subvertices) * 3;


        let minCol = Math.min(..._selectedVertices.map(v => v.col));
        let maxCol = Math.max(..._selectedVertices.map(v => v.col));
        let minRow = Math.min(..._selectedVertices.map(v => v.row));
        let maxRow = Math.max(..._selectedVertices.map(v => v.row));


        let v1v3 = new Vector3();
        let v1v4 = new Vector3();
        let norm1 = new Float32Array(3);
        let norm2 = new Float32Array(3);

        for (let row = minRow - 1; row <= maxRow + 1; row++) {
            for (let col = minCol - 1; col <= maxCol + 1; col++) {

                let i = col * 3;
                let j = row * (_subdivisionsX + 1) * 3;
                let k = (row + 1) * (_subdivisionsX + 1) * 3;

                let v1arr = [
                    terrainPositions[j + i],
                    terrainPositions[j + i + 1],
                    terrainPositions[j + i + 2],
                ]
                let v2arr = [
                    terrainPositions[j + i + 3],
                    terrainPositions[j + i + 4],
                    terrainPositions[j + i + 5],
                ]
                v1v3.x = terrainPositions[k + i + 0] - v1arr[0];
                v1v3.y = terrainPositions[k + i + 1] - v1arr[1];
                v1v3.z = terrainPositions[k + i + 2] - v1arr[2];
                v1v4.x = terrainPositions[k + i + 3] - v1arr[0];
                v1v4.y = terrainPositions[k + i + 4] - v1arr[1];
                v1v4.z = terrainPositions[k + i + 5] - v1arr[2];

                // facet equations :
                // we compute each facet normal vector
                // the equation of the facet plane is : norm.x * x + norm.y * y + norm.z * z + d = 0
                // we compute the value d by applying the equation to v1 which belongs to the plane
                // then we store the facet equation in a Vector4

                v1v2.x = v2arr[0] - v1arr[0];
                v1v2.y = v2arr[1] - v1arr[1];
                v1v2.z = v2arr[2] - v1arr[2];
                // v2.subtractToRef(v1, v1v2);
                //v3.subtractToRef(v1, v1v3);

                //v4.subtractToRef(v1, v1v4);

                norm1[0] = v1v4.y * v1v3.z - v1v4.z * v1v3.y;
                norm1[1] = v1v4.z * v1v3.x - v1v4.x * v1v3.z;
                norm1[2] = v1v4.x * v1v3.y - v1v4.y * v1v3.x;

                //BABYLON.Vector3.CrossToRef(v1v4, v1v3, norm1);  // caution : CrossToRef uses the Tmp class

                norm2[0] = v1v2.y * v1v4.z - v1v2.z * v1v4.y;
                norm2[1] = v1v2.z * v1v4.x - v1v2.x * v1v4.z;
                norm2[2] = v1v2.x * v1v4.y - v1v2.y * v1v4.x;
                // BABYLON.Vector3.CrossToRef(v1v2, v1v4, norm2);

                let norm1length = 1 / Math.sqrt(norm1[0] * norm1[0] + norm1[1] * norm1[1] + norm1[2] * norm1[2]);
                let norm2length = 1 / Math.sqrt(norm1[0] * norm1[0] + norm1[1] * norm1[1] + norm1[2] * norm1[2]);
                norm1[0] *= norm1length;
                norm1[1] *= norm1length;
                norm1[2] *= norm1length;
                norm2[0] *= norm2length;
                norm2[1] *= norm2length;
                norm2[2] *= norm2length;
                //norm1.normalize();
                //norm2.normalize();

                let d1 = -(norm1[0] * v1arr[0] + norm1[1] * v1arr[1] + norm1[2] * v1arr[2]);
                let d2 = -(norm2[0] * v2arr[0] + norm2[1] * v2arr[1] + norm2[2] * v2arr[2]);

                facet1Arr.set([norm1[0], norm1[1], norm1[2], d1], (row * _subdivisionsX + col) * 4);
                facet2Arr.set([norm2[0], norm2[1], norm2[2], d2], (row * _subdivisionsX + col) * 4);
            }
            self.postMessage({
                type: 'SubHeights', data: {
                    offsetX: minCol - 1,
                    endX: maxCol + 1,
                    offsetY: row,
                    srcOffset: (row * _subdivisionsX + minCol - 1) * 4
                }
            });
        }
        self.postMessage({ id: e.id, data: { min: min << 2, max: max << 2, normalsMin: normalsMin << 2, normalsMax: normalsMax << 2 } });

        //this.postMessage({ type: 'heights', data: {} });
        //methods2.createHeights();
    },
    createHeights: (e) => {
        //native: 95
        //212
        let v1arr = [];
        let v2arr = [];
        let v1v2 = { x: 0, y: 0, z: 0 };
        let v1v3 = { x: 0, y: 0, z: 0 };
        let v1v4 = { x: 0, y: 0, z: 0 };
        let norm1 = new Float32Array(3);
        let norm2 = new Float32Array(3);
        let i = 0;
        let j = 0;
        let k = 0;
        let cd = -1;     // 2D slope coefficient : z = cd * x + h
        let h = 0;
        let d1 = 0;     // facet plane equation : ax + by + cz + d = 0
        let d2 = 0;

        for (var row = 0; row < _subdivisionsY; row++) {
            for (var col = 0; col < _subdivisionsX; col++) {
                //calculateHeightSquad(row, col);
                i = col * 3;
                j = row * (_subdivisionsX + 1) * 3;
                k = (row + 1) * (_subdivisionsX + 1) * 3;

                v1arr = [
                    terrainPositions[j + i],
                    terrainPositions[j + i + 1],
                    terrainPositions[j + i + 2],
                ]
                v2arr = [
                    terrainPositions[j + i + 3],
                    terrainPositions[j + i + 4],
                    terrainPositions[j + i + 5],
                ]
                v1v3.x = terrainPositions[k + i + 0] - v1arr[0];
                v1v3.y = terrainPositions[k + i + 1] - v1arr[1];
                v1v3.z = terrainPositions[k + i + 2] - v1arr[2];
                v1v4.x = terrainPositions[k + i + 3] - v1arr[0];
                v1v4.y = terrainPositions[k + i + 4] - v1arr[1];
                v1v4.z = terrainPositions[k + i + 5] - v1arr[2];

                //   cd = (terrainPositions[k + i + 2] - v1arr[2]) / (terrainPositions[k + i + 3] - v1arr[0]);

                h = v1arr[2] - cd * v1arr[0];             // v1 belongs to the slope

                // facet equations :
                // we compute each facet normal vector
                // the equation of the facet plane is : norm.x * x + norm.y * y + norm.z * z + d = 0
                // we compute the value d by applying the equation to v1 which belongs to the plane
                // then we store the facet equation in a Vector4

                v1v2.x = v2arr[0] - v1arr[0];
                v1v2.y = v2arr[1] - v1arr[1];
                v1v2.z = v2arr[2] - v1arr[2];
                // v2.subtractToRef(v1, v1v2);
                //v3.subtractToRef(v1, v1v3);

                //v4.subtractToRef(v1, v1v4);

                norm1[0] = v1v4.y * v1v3.z - v1v4.z * v1v3.y;
                norm1[1] = v1v4.z * v1v3.x - v1v4.x * v1v3.z;
                norm1[2] = v1v4.x * v1v3.y - v1v4.y * v1v3.x;

                //BABYLON.Vector3.CrossToRef(v1v4, v1v3, norm1);  // caution : CrossToRef uses the Tmp class

                norm2[0] = v1v2.y * v1v4.z - v1v2.z * v1v4.y;
                norm2[1] = v1v2.z * v1v4.x - v1v2.x * v1v4.z;
                norm2[2] = v1v2.x * v1v4.y - v1v2.y * v1v4.x;
                // BABYLON.Vector3.CrossToRef(v1v2, v1v4, norm2);

                let norm1length = 1 / Math.sqrt(norm1[0] * norm1[0] + norm1[1] * norm1[1] + norm1[2] * norm1[2]);
                let norm2length = 1 / Math.sqrt(norm1[0] * norm1[0] + norm1[1] * norm1[1] + norm1[2] * norm1[2]);
                norm1[0] *= norm1length;
                norm1[1] *= norm1length;
                norm1[2] *= norm1length;
                norm2[0] *= norm2length;
                norm2[1] *= norm2length;
                norm2[2] *= norm2length;
                //norm1.normalize();
                //norm2.normalize();

                d1 = -(norm1[0] * v1arr[0] + norm1[1] * v1arr[1] + norm1[2] * v1arr[2]);
                d2 = -(norm2[0] * v2arr[0] + norm2[1] * v2arr[1] + norm2[2] * v2arr[2]);

                slopeArr[row * _subdivisionsX + col] = h;
                facet1Arr.set([norm1[0], norm1[1], norm1[2], d1], (row * _subdivisionsX + col) * 4)
                facet2Arr.set([norm2[0], norm2[1], norm2[2], d2], (row * _subdivisionsX + col) * 4);

            }
        }
        self.postMessage({ type: 'heights', data: {} });
    }
}
onmessage = async (e: WorkerMessage<any>) => {
    methods2[e.data.action](e.data);
}
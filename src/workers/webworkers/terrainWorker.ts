importScripts("/js/commonMath.js");
importScripts("/webworkers/ray.js");
interface WMessage {
    type: WorkerReturn,
    action: string,
    data: any,
    id?: number
}
let terrainPositions: Float32Array;
let terrainIndices: Uint32Array;
let terrainNormals: Float32Array;
let slopeArr: Int16Array;
let facet1Arr: Float32Array;
let facet2Arr: Float32Array;

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
let _selectedVertices = null;
let _subdivisionsY = 250;
let _subdivisionsX = 250;
let methods2 = {
    init: (e) => {
        terrainPositions = new Float32Array(e.data.positions);
        terrainIndices = new Uint32Array(e.data.indices);
        terrainNormals = new Float32Array(e.data.normals);
        slopeArr = new Int16Array(e.data.slopeArr);
        facet1Arr = new Float32Array(e.data.facet1Arr);
        facet2Arr = new Float32Array(e.data.facet2Arr);
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

            //for (var subIndex = 0; subIndex < this.terrain.subMeshes.length; subIndex++) {
            //var subMesh = this.terrain.subMeshes[subIndex];
            //for (index = subMesh.verticesStart; index < subMesh.verticesStart + subMesh.verticesCount; index++) {
            // _subdivisionsOfVertices[index].push(subMesh);
            //}
            //}
        }
    },
    mousemove: (e: WMessage) => {
        let ray = Ray.Zero();
        ray.unprojectRayToRef(e.data.x,
            e.data.y,
            e.data.viewportWidth, e.data.viewportHeight,
            Matrix.FromArray(e.data.view), Matrix.FromArray(e.data.projection));
        pickInfo = intersects(e.data.boundingBox, e.data.boundingSphere, ray);
        _selectedVertices = null
        if (pickInfo.pickedPoint) {
            this.postMessage({ id: e.id, data: { x: pickInfo.pickedPoint.x, y: pickInfo.pickedPoint.z } });
        }
    },
    elevateFaces: (e: WMessage) => {

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
                        vertice: index,
                        distance: Math.sqrt(distance)
                    });
                }
            }
        }
        //}

        // Elevate vertices
        let faces: {
            faceID: number,
            indices: Uint32Array
        }[] = [];
        let v1v2 = new Vector3();
        let v3v2 = new Vector3();
        let selectedFaces = [];
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


            /* CREATE HEIGHTS */

                //let cd = (terrainPositions[indices[0] * 3 + 2] - terrainPositions[indices[2] * 3 + 2]) / (terrainPositions[indices[0] * 3 + 3] - terrainPositions[indices[2] * 3]);
                //  h = v1arr[2] - cd * v1arr[0]
                let h = terrainPositions[indices[2] * 3 + 2] - (-1) * terrainPositions[indices[2] * 3]
              //  console.log(h);

                /****** */




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
            }
        });

        // Normals
        //this._reComputeNormals();


        let normalsMin = Math.min(...faces.map(f => Math.min(...f.indices))) * 3;
        let normalsMax = Math.max(...faces.map(f => Math.max(...f.indices))) * 3;
        let subvertices = _selectedVertices.map(sv => sv.vertice);
        let min = Math.min(...subvertices) * 3;
        let max = Math.max(...subvertices) * 3;
        this.postMessage({ id: e.id, data: { min: min << 2, max: max << 2, normalsMin: normalsMin << 2, normalsMax: normalsMax << 2 } });

        methods2.createHeights();
    },
    createHeights: () => {
        //native: 95
        //212
        let v1arr = [];
        let v2arr = [];
        let v1v2 = { x: 0, y: 0, z: 0 };
        let v1v3 = { x: 0, y: 0, z: 0 };
        let v1v4 = { x: 0, y: 0, z: 0 };
        let norm1 = { x: 0, y: 0, z: 0 };
        let norm2 = { x: 0, y: 0, z: 0 };
        let i = 0;
        let j = 0;
        let k = 0;
        let cd = -1;     // 2D slope coefficient : z = cd * x + h
        let h = 0;
        let d1 = 0;     // facet plane equation : ax + by + cz + d = 0
        let d2 = 0;

        for (var row = 0; row < _subdivisionsY; row++) {
            for (var col = 0; col < _subdivisionsX; col++) {
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
                //console.log(cd);
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


                norm1.x = v1v4.y * v1v3.z - v1v4.z * v1v3.y;
                norm1.y = v1v4.z * v1v3.x - v1v4.x * v1v3.z;
                norm1.z = v1v4.x * v1v3.y - v1v4.y * v1v3.x;

                //BABYLON.Vector3.CrossToRef(v1v4, v1v3, norm1);  // caution : CrossToRef uses the Tmp class

                norm2.x = v1v2.y * v1v4.z - v1v2.z * v1v4.y;
                norm2.y = v1v2.z * v1v4.x - v1v2.x * v1v4.z;
                norm2.z = v1v2.x * v1v4.y - v1v2.y * v1v4.x;
                // BABYLON.Vector3.CrossToRef(v1v2, v1v4, norm2);

                let norm1length = 1 / Math.sqrt(norm1.x * norm1.x + norm1.y * norm1.y + norm1.z * norm1.z);
                let norm2length = 1 / Math.sqrt(norm1.x * norm1.x + norm1.y * norm1.y + norm1.z * norm1.z);
                norm1.x *= norm1length;
                norm1.y *= norm1length;
                norm1.z *= norm1length;
                norm2.x *= norm2length;
                norm2.y *= norm2length;
                norm2.z *= norm2length;
                //norm1.normalize();
                //norm2.normalize();

                d1 = -(norm1.x * v1arr[0] + norm1.y * v1arr[1] + norm1.z * v1arr[2]);
                d2 = -(norm2.x * v2arr[0] + norm2.y * v2arr[1] + norm2.z * v2arr[2]);

               // let oldvalues = slopeArr.subarray((row * _subdivisionsX + col) * 2, ((row * _subdivisionsX + col) * 2) + 2);
               // if (oldvalues[0] != cd && oldvalues[1] != h) {
                    //console.log(k + i, j + i)
                //slopeArr.set([cd, h], (row * _subdivisionsX + col) * 2);

                slopeArr[row * _subdivisionsX + col] = h;
                if (facet1Arr[(row * _subdivisionsX + col) * 4] != norm1.x) {
                    console.log('new value ', (row * _subdivisionsX + col) * 4);

                }

                    facet1Arr.set([norm1.x, norm1.y, norm1.z, d1], (row * _subdivisionsX + col) * 4)
                    facet2Arr.set([norm2.x, norm2.y, norm2.z, d2], (row * _subdivisionsX + col) * 4);
               // }

                /*let d = {
                    slopeArr: {
                        offset: (row * _subdivisionsX + col) * 2,
                        length: 2
                    },
                    facet1Arr: {
                        offset: (row * _subdivisionsX + col) * 4,
                        length: 4
                    },
                    facet2Arr: {
                        offset: (row * _subdivisionsX + col) * 4,
                        length: 4
                    }
                }*/
            }
        }
        this.postMessage({ type: 'heights', data: {} });
    }
}
onmessage = async (e: WorkerMessage) => {
    methods2[e.data.action](e.data);
}
importScripts("/js/commonMath.js");
importScripts("/webworkers/ray.js");
importScripts("/js/DB.js");

//let terrainPositions: Float32Array;
let terrainIndices: Uint32Array;

const normalsView: Float32Array[] = [];
const positionsView: Float32Array[] = [];

//let terrainNormals: Float32Array;
let slopeArr: Int32Array;
let facet1Arr: Float32Array;
let facet2Arr: Float32Array;

const facetSize = 250 * 250 * 4;

let _facesOfVertices: number[][];
let _groundFacesNormals: Float32Array[];
let _subdivisionsOfVertices: any[];
let heightMax = 500;
let heightMin = -500;
let _selectedVertices: { vertice: number, distance: number, col: number, row: number }[] = [];
let _subdivisionsY: number;
let _subdivisionsX: number;

const nearScreenSource = new Vector3();
const farScreenSource = new Vector3();
const nearVec3 = new Vector3();
const farVec3 = new Vector3();
//@ts-ignore
let boundingBox: {
    min: Float32Array,
    max: Float32Array
} = {};
//@ts-ignore
let pickInfo: {
    point: Float32Array,
    distance: Float32Array
} = {};
const debugs: Map<number, any> = new Map();
const mousePosition: [number, number] = [0, 0]
let _groundFacesNormalsView: Float32Array;
const byteStride = 4 * 8;
let terrainPositionAndUvsAndNormalsCPUSwap: Float32Array;
let methods2: { [index: string]: (e: WMessage<any>) => void } = {
    init: (e: WMessage<{ positionsAndNormals: any, indices: any, subdivisionsX: any, subdivisionsY: any, boundingBox: SharedArrayBuffer, pickInfo: SharedArrayBuffer, _groundFacesNormalsBuffer: SharedArrayBuffer }>) => {

        terrainPositionAndUvsAndNormalsCPUSwap = new Float32Array(e.data.positionsAndNormals);
        const faceCount = e.data._groundFacesNormalsBuffer.byteLength / 4 / 4;
        _groundFacesNormals = [];

        _groundFacesNormalsView = new Float32Array(e.data._groundFacesNormalsBuffer);
        for (let i = 0; i < faceCount; i++) {
            _groundFacesNormals.push(new Float32Array(e.data._groundFacesNormalsBuffer, i << 4,4))
        }
        const verticesAmount = e.data.positionsAndNormals.byteLength / (8 * 4);
        if (normalsView.length == 0) {
            for (let i = 0; i < verticesAmount; i++) {
                positionsView.push(new Float32Array(e.data.positionsAndNormals, i * byteStride, 3));
                normalsView.push(new Float32Array(e.data.positionsAndNormals, i * byteStride + 5 * 4, 3));
            }
        }
        terrainIndices = new Uint32Array(e.data.indices);
        _subdivisionsX = e.data.subdivisionsX;
        _subdivisionsY = e.data.subdivisionsY;

        boundingBox.min = new Float32Array(e.data.boundingBox, 0, 3);
        boundingBox.max = new Float32Array(e.data.boundingBox, 3 * 4, 3);


        pickInfo.point = new Float32Array(e.data.pickInfo, 0, 3);
        pickInfo.distance = new Float32Array(e.data.pickInfo, 3 * 4, 1);

        _facesOfVertices = [];

        _subdivisionsOfVertices = [];
        var index;
        for (index = 0; index < verticesAmount; index++) {
            _facesOfVertices[index] = [];
            _subdivisionsOfVertices[index] = [];
        }
        for (index = 0; index < terrainIndices.length; index++) {
            _facesOfVertices[terrainIndices[index]].push((index / 3) | 0);
        }
        console.log('_facesOfVertices');
        console.log(_facesOfVertices);
        this.postMessage({ id: e.id, data: {} });
    },
    saveTexture: async (e: WMessage<ArrayBuffer>) => {
        let c = new OffscreenCanvas(5120, 5120);
        let ctx = c.getContext("2d");
        if (!ctx)
            throw ('get 2d context failed');
        ctx.putImageData(new ImageData(new Uint8ClampedArray(e.data), c.width, c.height), 0, 0);
        let blob = await c.convertToBlob({ type: "image/webp", quality: 1 });
        let response = new Response(blob);
        response.headers.set('content-length', blob.size.toString());
        (await caches.open('save')).put(new Request('/terrainTexture.webp'), response);

    },
    elevateFaces: (e: WMessage<{ radius: number, height: number, direction: number }>) => {
        if (pickInfo.distance[0] = NaN)
            return;
        //1.5-2 ms
        let radiusPow = Math.pow(e.data.radius, 2);

        // Impact zone
        if (mousePosition[0] != pickInfo.point[0] || mousePosition[1] != pickInfo.point[2]) {
            mousePosition[0] = pickInfo.point[0];
            mousePosition[1] = pickInfo.point[2];
            // console.time('selecting vertices');
            _selectedVertices = [];

            let length = terrainPositionAndUvsAndNormalsCPUSwap.length;
            for (let index = 0; index < length; index += 8) {
                let distance = Math.pow(terrainPositionAndUvsAndNormalsCPUSwap[index] - pickInfo.point[0], 2) + Math.pow(terrainPositionAndUvsAndNormalsCPUSwap[index+2] - pickInfo.point[2], 2)
                if (distance < radiusPow) {
                    _selectedVertices.push({
                        col: 250 / (10000 / (5000 + terrainPositionAndUvsAndNormalsCPUSwap[index])) | 0,
                        row: 250 / (10000 / (5000 - terrainPositionAndUvsAndNormalsCPUSwap[index+2])) | 0,
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
        let faceOfVertices: number[] = [];
        console.log('half from', _groundFacesNormals.length)
        const half = _groundFacesNormals.length >> 1;
        let v1: Float32Array
        let v2: Float32Array
        let v3: Float32Array

        

        _selectedVertices.forEach(sv => {
            let positiony = terrainPositionAndUvsAndNormalsCPUSwap[sv.vertice+1];
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
            terrainPositionAndUvsAndNormalsCPUSwap[sv.vertice + 1] = positiony;

            //this._updateSubdivisions(sv.vertice);

            faceOfVertices = _facesOfVertices[sv.vertice/8];
            
            
            for (let index = 0; index < faceOfVertices.length; index++) {
                let indices = new Uint32Array(terrainIndices.buffer, (faceOfVertices[index] * 3) << 2, 3);

                indices.forEach(vertexIndex => {
                    var faces = _facesOfVertices[vertexIndex];
                    // let normal = BABYLON.Vector3.Zero();
                    let x = 0;
                    let y = 0;
                    let z = 0;


                    for (var index = 0; index < faces.length; index++) {
                        // let facenormal = _groundFacesNormals[faces[index]];

                        if (faces[index] % 2 == 0) {
                            var facenormal = _groundFacesNormals[faces[index] >> 1];
                        } else {
                            var facenormal = _groundFacesNormals[half + (faces[index] >> 1)];
                        }

                        // let facenormal = _groundFacesNormals[faces[index]];
                        x += facenormal[0];
                        y += facenormal[1];
                        z += facenormal[2];
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



                    normalsView[vertexIndex].set([x, y, z])


                    //terrainNormals.set([x, y, z], vertexIndex * 3);
                });
            };
            ((ypos) => {
                //let ypos = this.terrain.positions[vertexIndex * 3 + 1];
                //for (var index = 0; index < this._subdivisionsOfVertices[vertexIndex].length; index++) {
                //var sub = this._subdivisionsOfVertices[vertexIndex][index];
                //let boundingBox = e.data.boundingBox;
                //let boundingSphere = sub.getBoundingInfo().boundingSphere;

                if (ypos < boundingBox.min[1]) {
                    boundingBox.min[1] = ypos;
                } else if (ypos > boundingBox.max[1]) {
                    boundingBox.max[1] = ypos;
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

        //TODO; move after Y update
        _selectedVertices.forEach(sv => {
            faceOfVertices = _facesOfVertices[sv.vertice / 8];
            for (let index = 0; index < faceOfVertices.length; index++) {
                /* if (faceOfVertices[index] % 2 == 0) {
                     var indices = new Uint32Array(terrainIndices.buffer, ((faceOfVertices[index] * 3) - 6) << 2, 3);
                 }
                 else*/
                var indices = new Uint32Array(terrainIndices.buffer, (faceOfVertices[index] * 3) << 2, 3);

                v1 = positionsView[indices[0]];
                v2 = positionsView[indices[1]];
                v3 = positionsView[indices[2]];

                //console.log(v1, v2, v3)

                v1v2.x = v1[0] - v2[0];
                v1v2.y = v1[1] - v2[1];
                v1v2.z = v1[2] - v2[2];

                v3v2.x = v3[0] - v2[0];
                v3v2.y = v3[1] - v2[1];
                v3v2.z = v3[2] - v2[2];

                const normalized = Vector3.Normalize(Vector3.Cross(v1v2, v3v2));

                let d1 = -(normalized.x * v2[0] + normalized.y * v2[1] + normalized.z * v2[2]);

                if (faceOfVertices[index] % 2 == 0) {
                   // console.log('half', half)
                    //This is wrong
                    _groundFacesNormals[half + (faceOfVertices[index] >> 1)].set([normalized.x, normalized.y, normalized.z, d1]);


                   // debugs.set(((faceOfVertices[index] - 1) >> 1) * 4, [normalized.x, normalized.y, normalized.z, d1, indices, new Uint32Array(terrainIndices.buffer, ((faceOfVertices[index] * 3) - 6) << 2, 3)]);



                    // _groundFacesNormalsView.set([normalized.x, normalized.y, normalized.z, d1], (half + ((faceOfVertices[index] - 1) >> 1)) * 4)
                    // _groundFacesNormals[(faceOfVertices[index] >> 1)].set([0, 0, 0, 0]);
                } else {
                    //works
                    _groundFacesNormals[faceOfVertices[index] >> 1].set([normalized.x, normalized.y, normalized.z, d1]);
                    //_groundFacesNormals[half + (faceOfVertices[index] >> 1)].set([0, 0, 0, 0]);
                    console.log(d1)
                }
            }
        })

    /* console.log('_selectedVertices', _selectedVertices);
_selectedVertices.forEach(sv => {
 faceOfVertices = _facesOfVertices[sv.vertice / 8];
 console.log('faceOfVertices', faceOfVertices)
})
debugger;*/
        //console.log('faces:');
        
        self.postMessage({
            type: 'bounding', data: {
                boundingBox: { minY: boundingBox.min[1], maxY: boundingBox.max[1] }
            }
        });

        // Normals
        let normalsMin = Math.min(...faces.map(f => Math.min(...f.indices))) * 3;
        let normalsMax = Math.max(...faces.map(f => Math.max(...f.indices))) * 3;
        let subvertices = _selectedVertices.map(sv => sv.vertice);
        let min = Math.min(...subvertices)*4;
        let max = Math.max(...subvertices)*4+byteStride;


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

                let i = col;
                let j = row * (_subdivisionsX + 1);
                let k = (row + 1) * (_subdivisionsX + 1);

                const indices = [
                    j + i,
                    j + i + 1,
                    k + i,
                    k + i + 1
                ]


                let v1arr = [
                    positionsView[indices[0]][0],
                    positionsView[indices[0]][1],
                    positionsView[indices[0]][2],
                ]
                let v2arr = [
                    positionsView[indices[1]][0],
                    positionsView[indices[1]][1],
                    positionsView[indices[1]][2],
                ]
                //indices0: 0, 2, 3
                //indices1: 0,1,3
                v1v3.x = positionsView[indices[2]][0] - v1arr[0];
                v1v3.y = positionsView[indices[2]][1] - v1arr[1];
                v1v3.z = positionsView[indices[2]][2] - v1arr[2];
                v1v4.x = positionsView[indices[3]][0] - v1arr[0];
                v1v4.y = positionsView[indices[3]][1] - v1arr[1];
                v1v4.z = positionsView[indices[3]][2] - v1arr[2];



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

               // let norm1length = 1 / Math.sqrt(norm1[0] * norm1[0] + norm1[1] * norm1[1] + norm1[2] * norm1[2]);
               // let norm2length = 1 / Math.sqrt(norm2[0] * norm2[0] + norm2[1] * norm2[1] + norm2[2] * norm2[2]);
                let norm1length = 1 / Math.hypot(norm1[0], norm1[1], norm1[2])
                let norm2length = 1 / Math.hypot(norm2[0], norm2[1], norm2[2]);

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

                if (debugs.has((row * _subdivisionsX + col) * 4)) {
                    console.log(debugs.get((row * _subdivisionsX + col) * 4))
                    console.log((row * _subdivisionsX + col) * 4);
                    //debugger;
                }
                if (debugs.has(facetSize + (row * _subdivisionsX + col) * 4)) {
                    console.log(debugs.get(facetSize + (row * _subdivisionsX + col) * 4));
                    console.log(facetSize + (row * _subdivisionsX + col) * 4);
                    //debugger;
                }

                //_groundFacesNormalsView.set([norm1[0], norm1[1], norm1[2], d1], (row * _subdivisionsX + col) * 4)
               // _groundFacesNormalsView.set([norm2[0], norm2[1], norm2[2], d2], facetSize+(row * _subdivisionsX + col) * 4)


                //Disabled for now
                //  facet1Arr.set([norm1[0], norm1[1], norm1[2], d1], (row * _subdivisionsX + col) * 4);
                // facet2Arr.set([norm2[0], norm2[1], norm2[2], d2], (row * _subdivisionsX + col) * 4);


            }
            const srcOffset = (row * _subdivisionsX + minCol - 1) * 4;
            self.postMessage({
                type: 'SubHeights', data: {
                    offsetX: minCol - 1,
                    endX: maxCol + 1,
                    offsetY: row,
                    srcOffset: srcOffset,
                    length: ((row * _subdivisionsX + maxCol + 1) * 4) - srcOffset
                }
            });
        }
        self.postMessage({ id: e.id, data: { min: min, max: max, normalsMin: normalsMin << 2, normalsMax: normalsMax << 2 } });

        //this.postMessage({ type: 'heights', data: {} });
        //methods2.createHeights();
    }
}
onmessage = async (e: WorkerMessage<any>) => {
    methods2[e.data.action](e.data);
}
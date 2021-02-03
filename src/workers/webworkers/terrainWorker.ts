
//let terrainPositions: Float32Array;
let terrainIndices: Uint32Array;

const normalsView: Float32Array[] = [];
const positionsView: Float32Array[] = [];

const facetSize = 250 * 250 * 4;

let _facesOfVertices: number[][];
let _groundFacesNormals: Float32Array[];
let _subdivisionsOfVertices: any[];
let heightMax = 500;
let heightMin = -500;
let _selectedVertices: { vertice: number, distance: number, col: number, row: number }[] = [];
let _subdivisionsY: number;
let _subdivisionsX: number;

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

const mousePosition: [number, number] = [0, 0]
let _groundFacesNormalsView: Float32Array;
let byteStride:number
let terrainPositionAndUvsAndNormalsCPUSwap: Float32Array;
let methods2: { [index: string]: (e: WMessage<any>) => void } = {
    init: (e: WMessage<{
        positionsAndNormals: any,
        indices: any,
        subdivisionsX: any,
        subdivisionsY: any,
        boundingBox: SharedArrayBuffer,
        pickInfo: SharedArrayBuffer,
        _groundFacesNormalsBuffer: SharedArrayBuffer,
        byteStride:number
    }>) => {
        byteStride = e.data.byteStride
        terrainPositionAndUvsAndNormalsCPUSwap = new Float32Array(e.data.positionsAndNormals);
        const faceCount = e.data._groundFacesNormalsBuffer.byteLength / 4 / 4;
        _groundFacesNormals = [];

        _groundFacesNormalsView = new Float32Array(e.data._groundFacesNormalsBuffer);
        for (let i = 0; i < faceCount; i++) {
            _groundFacesNormals.push(new Float32Array(e.data._groundFacesNormalsBuffer, i << 4,4))
        }
        const verticesAmount = e.data.positionsAndNormals.byteLength / e.data.byteStride;
        if (normalsView.length == 0) {
            for (let i = 0; i < verticesAmount; i++) {
                positionsView.push(new Float32Array(e.data.positionsAndNormals, i * e.data.byteStride, 3));
                normalsView.push(new Float32Array(e.data.positionsAndNormals, i * e.data.byteStride + 16, 3));
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

        // Impact zone
        if (mousePosition[0] != pickInfo.point[0] || mousePosition[1] != pickInfo.point[2]) {
            mousePosition[0] = pickInfo.point[0];
            mousePosition[1] = pickInfo.point[2];
            _selectedVertices = [];

            let radiusPow = Math.pow(e.data.radius, 2);

            let length = terrainPositionAndUvsAndNormalsCPUSwap.length;
            for (let index = 0; index < length; index += 12) {
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
        let v1v2 = new Float32Array(3);
        let v3v2 = new Float32Array(3);
        let faceOfVertices: number[] = [];
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


            faceOfVertices = _facesOfVertices[sv.vertice/12];
            

            for (let index = 0; index < faceOfVertices.length; index++) {
                let indices = new Uint32Array(terrainIndices.buffer, (faceOfVertices[index] * 3) << 2, 3);

                indices.forEach(vertexIndex => {
                    var faces = _facesOfVertices[vertexIndex];
                    const norm = normalsView[vertexIndex];
                    norm.set([0, 0, 0]);
                    for (var index = 0; index < faces.length; index++) {
                        // let facenormal = _groundFacesNormals[faces[index]];

                        if (faces[index] % 2 == 0) {
                            var facenormal = _groundFacesNormals[faces[index] >> 1];
                        } else {
                            var facenormal = _groundFacesNormals[half + (faces[index] >> 1)];
                        }
                        norm[0] += facenormal[0];
                        norm[1] += facenormal[1];
                        norm[2] += facenormal[2];
                    }
                    let fc = 1.0 / faces.length;
                    norm[0] *= fc;
                    norm[1] *= fc;
                    norm[2] *= fc;
                    //Normalize
                    let scale = 1 / Math.hypot(norm[0], norm[1], norm[2]);
                    norm[0] *= scale;
                    norm[1] *= scale;
                    norm[2] *= scale;
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

        _selectedVertices.forEach(sv => {
            faceOfVertices = _facesOfVertices[sv.vertice / 12];
            for (let index = 0; index < faceOfVertices.length; index++) {
                var indices = new Uint32Array(terrainIndices.buffer, (faceOfVertices[index] * 3) << 2, 3);

                v1 = positionsView[indices[0]];
                v2 = positionsView[indices[1]];
                v3 = positionsView[indices[2]];

                v1v2[0] = v1[0] - v2[0];
                v1v2[1] = v1[1] - v2[1];
                v1v2[2] = v1[2] - v2[2];

                v3v2[0] = v3[0] - v2[0];
                v3v2[1] = v3[1] - v2[1];
                v3v2[2] = v3[2] - v2[2];

                if ((faceOfVertices[index] & 1) == 0)
                    var normalized = _groundFacesNormals[half + (faceOfVertices[index] >> 1)];
                else
                    var normalized = _groundFacesNormals[faceOfVertices[index] >> 1];
                normalized[0] = v1v2[1] * v3v2[2] - v1v2[2] * v3v2[1]
                normalized[1] = v1v2[2] * v3v2[0] - v1v2[0] * v3v2[2]
                normalized[2] = v1v2[0] * v3v2[1] - v1v2[1] * v3v2[0]

                const scale = 1 / Math.hypot(normalized[0], normalized[1], normalized[2]);
                normalized[0] *= scale;
                normalized[1] *= scale;
                normalized[2] *= scale;
                normalized[3] = -(normalized[0] * v2[0] + normalized[1] * v2[1] + normalized[2] * v2[2]);
            }
        })        

        if (_selectedVertices.length) {
            self.postMessage({
                type: 'bounding', data: {
                    boundingBox: { minY: boundingBox.min[1], maxY: boundingBox.max[1] }
                }
            });
            let subvertices = _selectedVertices.map(sv => sv.vertice);
            let min = Math.min(...subvertices) * 4;
            let max = Math.max(...subvertices) * 4 + byteStride;
            self.postMessage({ id: e.id, data: { min: min, max: max } });
        }

    }
}
onmessage = async (e: WorkerMessage<any>) => {
    methods2[e.data.action](e.data);
}
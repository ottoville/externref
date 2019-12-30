importScripts("/js/commonMath.js");
importScripts("/webworkers/ray.js");

let terrainPositions: Float32Array;
let terrainIndices: Uint32Array;

function intersects(boundingInfo, ray: Ray, fastCheck ?: boolean, trianglePredicate ?: TrianglePickingPredicate): PickingInfo {
    var pickingInfo = new PickingInfo();
    const intersectionThreshold = 0;
    //const boundingInfo = this._boundingInfo;
    if (!this.subMeshes || !boundingInfo || !ray.intersectsSphere(boundingInfo.boundingSphere, intersectionThreshold) || !ray.intersectsBox(boundingInfo.boundingBox, intersectionThreshold)) {
        return pickingInfo;
    }

    if (!this._generatePointsArray()) {
        return pickingInfo;
    }

    var intersectInfo: Nullable<IntersectionInfo> = null;

    //var subMeshes = this._scene.getIntersectingSubMeshCandidates(this, ray);
    //var len: number = subMeshes.length;
    //for (var index = 0; index < len; index++) {
        //var subMesh = subMeshes.data[index];

        // Bounding test

        //if (len > 1 && !subMesh.canIntersects(ray)) {
        if (!ray.intersectsBox(boundingInfo.boundingBox)) {
            return pickingInfo;
        }

        //subMesh._intersectTriangles(ray, positions, indices, fastCheck, trianglePredicate);
        /*var currentIntersectInfo = subMesh.intersects(ray, (<Vector3[]>this._positions),
            (<IndicesArray>this.getIndices()), fastCheck,
            trianglePredicate);*/

    // Triangles test
    let p0 = new Vector3();
    let p1 = new Vector3();
    let p2 = new Vector3();

    let currentIntersectInfo = ((ray: Ray, positions: Vector3[], indices: IndicesArray,
        fastCheck?: boolean, trianglePredicate?: TrianglePickingPredicate) => {
        //for (var index = 0; index < this.indexStart + this.indexCount; index += 3) {
        for (var index = 0; index < terrainIndices.length; index += 3) {
           /* var p0 = positions[indices[index]];
            var p1 = positions[indices[index + 1]];
            var p2 = positions[indices[index + 2]];*/

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
        return intersectInfo;
    })(ray, (<Vector3[]>this._positions),
        (<IndicesArray>this.getIndices()), fastCheck,
        trianglePredicate);


        if (currentIntersectInfo) {
            if (fastCheck || !intersectInfo || currentIntersectInfo.distance < intersectInfo.distance) {
                intersectInfo = currentIntersectInfo;
                //intersectInfo.subMeshId = index;

               /* if (fastCheck) {
                    break;
                }*/
            }
        }
    //}

    if (intersectInfo) {
        // Get picked point
        const world = this.getWorldMatrix();
        const worldOrigin = new Vector3();
        const direction = new Vector3();
        Vector3.TransformCoordinatesToRef(ray.origin, world, worldOrigin);
        ray.direction.scaleToRef(intersectInfo.distance, direction);
        const worldDirection = Vector3.TransformNormal(direction, world);
        const pickedPoint = worldDirection.addInPlace(worldOrigin);

        // Return result
        pickingInfo.hit = true;
        pickingInfo.distance = Vector3.Distance(worldOrigin, pickedPoint);
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

let methods2 = {
    init: (e) => {
        terrainPositions = new Float32Array(e.data.positions);
        terrainIndices = new Uint32Array(e.data.indices);
    },
    mousemove: (e) => {
        //console.log(e);
        let ray = Ray.Zero();
        ray.unprojectRayToRef(e.data.x,
            e.data.y,
            e.data.viewportWidth, e.data.viewportHeight,
            Matrix.FromArray(e.data.world),
            Matrix.FromArray(e.data.view), Matrix.FromArray(e.data.projection));
        intersects(e.boundingInfo, ray);
    },
    createHeights: () => {
        //native: 95
        //212
        let v1arr = [];
        let v2arr = [];
        let v1v2 = {x:0,y:0,z:0};
        let v1v3 = { x: 0, y: 0, z: 0 };
        let v1v4 = { x: 0, y: 0, z: 0 };
        let norm1 = { x: 0, y: 0, z: 0 };
        let norm2 = { x: 0, y: 0, z: 0 };
        let i = 0;
        let j = 0;
        let k = 0;
        let cd = 0;     // 2D slope coefficient : z = cd * x + h
        let h = 0;
        let d1 = 0;     // facet plane equation : ax + by + cz + d = 0
        let d2 = 0;
        let positionsView = this.positionsView;
        for (var row = 0; row < this._subdivisionsY; row++) {
            for (var col = 0; col < this._subdivisionsX; col++) {
                i = col * 3;
                j = row * (this._subdivisionsX + 1) * 3;
                k = (row + 1) * (this._subdivisionsX + 1) * 3;

                v1arr = [
                    positionsView.getFloat32((j + i) << 2, true),
                    positionsView.getFloat32((j + i + 1) << 2, true),
                    positionsView.getFloat32((j + i + 2) << 2, true),
                ]
                v2arr = [
                    positionsView.getFloat32((j + i + 3) << 2, true),
                    positionsView.getFloat32((j + i + 4) << 2, true),
                    positionsView.getFloat32((j + i + 5) << 2, true),
                ]
                v1v3.x = positionsView.getFloat32((k + i + 0) << 2, true) - v1arr[0];
                v1v3.y = positionsView.getFloat32((k + i + 1) << 2, true) - v1arr[1];
                v1v3.z = positionsView.getFloat32((k + i + 2) << 2, true) - v1arr[2];
                v1v4.x = positionsView.getFloat32((k + i + 3) << 2, true) - v1arr[0];
                v1v4.y = positionsView.getFloat32((k + i + 4) << 2, true) - v1arr[1];
                v1v4.z = positionsView.getFloat32((k + i + 5) << 2, true) - v1arr[2];

                cd = (positionsView.getFloat32((k + i + 2) << 2, true) - v1arr[2]) / (positionsView.getFloat32((k + i + 3) << 2, true) - v1arr[0]);
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

                let norm1length = 1/Math.sqrt(norm1.x * norm1.x + norm1.y * norm1.y + norm1.z * norm1.z);
                let norm2length = 1/Math.sqrt(norm1.x * norm1.x + norm1.y * norm1.y + norm1.z * norm1.z);
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
                this.slopeArr.set([cd, h], (row * this._subdivisionsX + col) * 2);
                this.facet1Arr.set([norm1.x, norm1.y, norm1.z, d1], (row * this._subdivisionsX + col) * 4)
                this.facet2Arr.set([norm2.x, norm2.y, norm2.z, d2], (row * this._subdivisionsX + col) * 4)
            }
        }
    }
}
onmessage = async (e: WorkerMessage) => {
    methods2[e.data.action](e.data);
}
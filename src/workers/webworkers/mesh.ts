importScripts("/js/commonMath.js");
importScripts("/webworkers/ray.js");
let meshes = new Map();
class Mesh {
    private positionsView: Float32Array;
    private indicesView: Uint32Array;
    private normalsView: Float32Array;
    constructor(private indices: SharedArrayBuffer, private positions: SharedArrayBuffer, private normals: SharedArrayBuffer) {
        this.positionsView = new Float32Array(positions);
        this.indicesView = new Uint32Array(indices);
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
}
onmessage = async (e: WorkerMessage) => {
    if (e.data.action == 'init') {
        meshes.set(e.data.data.meshId, new Mesh(e.data.data.indices, e.data.data.positions, e.data.data.normals));
    } else {
        let mesh: Mesh = null;
        if (mesh = meshes.get(e.data.data.meshId)) {
            let r = mesh[e.data.action](...e.data.data.args);
            this.postMessage({ id: e.data.id, data: r });
        }
    }
}
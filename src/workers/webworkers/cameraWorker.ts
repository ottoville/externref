importScripts("/js/commonMath.js");

const cameras: Map<number, CameraWorker> = new Map();
class CameraWorker {
    projectionViewArr: Float32Array;
    viewArr: Float32Array;
    cameraArr: Float32Array;
    projectionArr: Float32Array;
    pickingRay: Float32Array;
    mousePosition: Uint16Array;


    constructor(viewProjectionPositionBuffer: SharedArrayBuffer, projection: SharedArrayBuffer, pickingRayBuffer: SharedArrayBuffer,mousePositionBuffer: SharedArrayBuffer, private size: { width: number, height: number }) {
        this.projectionViewArr = new Float32Array(viewProjectionPositionBuffer, 0, 16);
        this.viewArr = new Float32Array(viewProjectionPositionBuffer, 64, 16);;
        this.cameraArr = new Float32Array(viewProjectionPositionBuffer, 128, 3);
        this.projectionArr = new Float32Array(projection);

        this.pickingRay = new Float32Array(pickingRayBuffer);
        this.mousePosition = new Uint16Array(mousePositionBuffer);
    }
    onResize(width: number, height: number) {
        this.size.width = width;
        this.size.height = height;
    }
   // subscribed = false;
    subscribeTimeID = 0
    lastMousePosition = 0;
    subscribePickingRay() {
        const me = this;
        this.subscribeTimeID = setTimeout(function waitChange() {
            Atomics.wait(new Int32Array(me.mousePosition.buffer), 0, me.lastMousePosition);
            me.lastMousePosition = new Int32Array(me.mousePosition.buffer)[0]
            me.updatePickingRay();
            me.subscribeTimeID = setTimeout(waitChange, 25);
        }, 25)
    }
    unSubscribePickingRay() {
        clearTimeout(this.subscribeTimeID);
       // this.subscribed = false;
    }
    createPickingRay(matrix?: SharedArrayBuffer) {

    }
    updatePickingRay(worldPosition?: SharedArrayBuffer) {
        const nearScreenSource = Vector3.Zero()
        nearScreenSource.x = this.mousePosition[0] / this.size.width * 2 - 1;
        nearScreenSource.y = -(this.mousePosition[1] / this.size.height * 2 - 1);
        nearScreenSource.z = -1.0;
        var farScreenSource = (new Vector3()).copyFromFloats(nearScreenSource.x, nearScreenSource.y, 1.0);

        //Todo, reuse matrix and vector

        //const matrix = world.multiply(viewProjection);
        if (worldPosition) {
            var matrix = Matrix.Zero();
            const worldM = Matrix.FromArray(Array.from(new Float32Array(worldPosition)))
            worldM.multiplyToRef(Matrix.FromArray(Array.from(this.viewArr)), matrix);
        } else
            var matrix = Matrix.FromArray(Array.from(this.viewArr));
        matrix.multiplyToRef(Matrix.FromArray(Array.from(this.projectionArr)), matrix);

        //TODO use matrixMultiply64 and matrixInvert64

        // matrixInvert64(matrix);
        // const inverted = Matrix.FromArray(matrix);
        //const inverted = Matrix.FromArray(matrix).invert();
        const inverted = matrix.invert();
        const nearVec3 = new Vector3();
        const farVec3 = new Vector3();

        Vector3._UnprojectFromInvertedMatrixToRef(nearScreenSource, inverted, nearVec3);
        Vector3._UnprojectFromInvertedMatrixToRef(farScreenSource, inverted, farVec3);
        const direction = new Vector3();
        farVec3.subtractToRef(nearVec3, direction);
        direction.normalize();
        this.pickingRay.set(nearVec3.asArray());
        this.pickingRay.set(direction.asArray(), 3);
    }
}
onmessage = async (e: WorkerMessageObject<{ objId?: number, args: any[] }, CameraWorker>) => {
    if (typeof e.data.data.objId !== 'undefined') {
        let a: keyof CameraWorker;
        if (e.data.action == 'init') {
            cameras.set(e.data.data.objId, new CameraWorker(...<[SharedArrayBuffer, SharedArrayBuffer, SharedArrayBuffer, SharedArrayBuffer, { width: number, height: number }]>e.data.data.args));
            //meshes.set(e.data.data.meshId, new Mesh(e.data.data.indices, e.data.data.positions, e.data.data.normals));
        } else {
            let camera = cameras.get(e.data.data.objId);
            if (camera) {
                //@ts-ignore
                let r = camera[e.data.action](...e.data.data.args);
                if (typeof (e.data.id) !=='undefined')
                    self.postMessage({ id: e.data.id, data: r });
            }
        }
    }
    else {
        //@ts-ignore
        let r = CameraWorker[e.data.action](...e.data.data.args);
        if (typeof (e.data.id) !== 'undefined')
            self.postMessage({ id: e.data.id, data: r });
    }
}
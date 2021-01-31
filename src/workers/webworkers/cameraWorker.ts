importScripts("/js/commonMath.js");


function TransformCoordinatesToRef(source: [number, number, number], transformation: DeepImmutable < Matrix >, result: [number,number,number]): void {
    const m = transformation.m;
    const x = source[0]
    const y = source[1]
    const z = source[2]
    var rx = x * m[0] + y * m[4] + z * m[8] + m[12];
    var ry = x * m[1] + y * m[5] + z * m[9] + m[13];
    var rz = x * m[2] + y * m[6] + z * m[10] + m[14];
    var rw = 1 / (x * m[3] + y * m[7] + z * m[11] + m[15]);

    result[0] = rx * rw;
    result[1] = ry * rw;
    result[2] = rz * rw;
}

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
        const nearScreenSource : [number, number, number] = [0, 0, 0];
        nearScreenSource[0] = this.mousePosition[0] / this.size.width * 2 - 1;
        nearScreenSource[1] = -(this.mousePosition[1] / this.size.height * 2 - 1);
        nearScreenSource[2] = -1.0;
       // var farScreenSource = (new Vector3()).copyFromFloats(nearScreenSource.x, nearScreenSource.y, 1.0);
        var farScreenSource :[number, number, number] = [nearScreenSource[0], nearScreenSource[1], 1.0]

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
        const nearVec3 :[number,number,number]= [0,0,0];
        const farVec3: [number, number, number] = [0, 0, 0]

       // Vector3._UnprojectFromInvertedMatrixToRef(nearScreenSource, inverted, nearVec3);
        TransformCoordinatesToRef(nearScreenSource, matrix, nearVec3);
        const m = inverted.m;
        var num = nearScreenSource[0] * m[3] + nearScreenSource[1] * m[7] + nearScreenSource[2] * m[11] + m[15];
        if (Scalar.WithinEpsilon(num, 1.0)) {
            //nearVec3.scaleInPlace(1.0 / num);
            const scale = 1.0 / num
            nearVec3[0] /= scale;
            nearVec3[1] /= scale;
            nearVec3[2] /= scale;
        }



       // Vector3._UnprojectFromInvertedMatrixToRef(farScreenSource, inverted, farVec3);
        TransformCoordinatesToRef(farScreenSource, matrix, farVec3);
       // const m = inverted.m;
        var num = farScreenSource[0] * m[3] + farScreenSource[1] * m[7] + farScreenSource[2] * m[11] + m[15];
        if (Scalar.WithinEpsilon(num, 1.0)) {
            //nearVec3.scaleInPlace(1.0 / num);
            const scale = 1.0 / num
            farVec3[0] /= scale;
            farVec3[1] /= scale;
            farVec3[2] /= scale;
        }


        const direction :[number,number,number]=[0,0,0]
      //  farVec3.subtractToRef(nearVec3, direction);
        direction[0] = farVec3[0] - nearVec3[0]
        direction[1] = farVec3[1] - nearVec3[1]
        direction[2] = farVec3[2] - nearVec3[2]

        //direction.normalize();

        const len=Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2)
        if (!(len == 1 || len == 0)) {
            const scale = 1.0 / len
            direction[0] /= scale;
            direction[1] /= scale;
            direction[2] /= scale;
        }

        this.pickingRay.set(nearVec3);
        this.pickingRay.set(direction, 3);
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
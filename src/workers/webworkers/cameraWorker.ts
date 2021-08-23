
//import { TerraMatrix } from "/js/Math.js";
import { TerraMatrix } from "../../Math.js";

const cameras: Map<number, CameraWorker> = new Map();
class CameraWorker {
    projectionViewArr: Float32Array;
    viewArr: TerraMatrix;
    //@ts-expect-error
    tempView: TerraMatrix;
    cameraArr: Float32Array;
    projectionArr: TerraMatrix;
    pickingRay: Float32Array;
    mousePosition: Uint16Array;


    constructor(viewProjectionPositionBuffer: SharedArrayBuffer, projection: SharedArrayBuffer, pickingRayBuffer: SharedArrayBuffer,mousePositionBuffer: SharedArrayBuffer, private size: { width: number, height: number }) {
        this.projectionViewArr = new Float32Array(viewProjectionPositionBuffer, 0, 16);
        this.viewArr = new TerraMatrix(viewProjectionPositionBuffer, 64);
        this.cameraArr = new Float32Array(viewProjectionPositionBuffer, 128, 3);
        //this.tempView = new TerraMatrix(viewProjectionPositionBuffer, 144);
        this.projectionArr = new TerraMatrix(projection);

        this.pickingRay = new Float32Array(pickingRayBuffer);
        this.mousePosition = new Uint16Array(mousePositionBuffer);
    }
    onResize(width: number, height: number) {
        console.log('onResize', width,height)
        this.size.width = width;
        this.size.height = height;
    }
   // subscribed = false;
    subscribeTimeID = 0
    lastMousePosition = 0;
    
}
onmessage = async (e: WorkerMessageObject<{ objId?: number, args: any[] }, CameraWorker>) => {
    if (typeof e.data.data.objId !== 'undefined') {
        if (e.data.action == 'init') {
            cameras.set(e.data.data.objId, new CameraWorker(...<[SharedArrayBuffer, SharedArrayBuffer, SharedArrayBuffer, SharedArrayBuffer, { width: number, height: number }]>e.data.data.args));
            //meshes.set(e.data.data.meshId, new Mesh(e.data.data.indices, e.data.data.positions, e.data.data.normals));
        } else {
            const camera = cameras.get(e.data.data.objId);
            if (camera) {
                //@ts-ignore
                const r = camera[e.data.action](...e.data.data.args);
                if (typeof (e.data.id) !=='undefined')
                    self.postMessage({ id: e.data.id, data: r });
            }
        }
    }
    else {
        //@ts-ignore
        const r = CameraWorker[e.data.action](...e.data.data.args);
        if (typeof (e.data.id) !== 'undefined')
            self.postMessage({ id: e.data.id, data: r });
    }
}
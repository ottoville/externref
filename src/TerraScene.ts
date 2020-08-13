import { GPUScene } from "./GPUScene";
import { TerraMesh } from "./TerraMesh";
import { Bounding, boundable, PickingInfo } from "./traits/Boundable";
import { TerraMatrix } from "./traits/worldPosition";
import { Ray } from "./lib/babylon/Culling/ray";
import { Matrix,Vector3 } from "./lib/babylon/Maths/math.js";

/*interface Ray {
    origin: any,
    direction: any,
}*/
//const _tempPickingRay: Ray = Ray.Zero();
function rotateMatrix(rad: number, axis: "x" | "y" | "z"): Float32Array {
    // https://www.3dgep.com/3d-math-primer-for-game-programmers-matrices/#Rotation

   // let m = new Matrix();
  //  if (axis == "x") {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    return new Float32Array([
        1, 0, 0, 0,
        0,c, s * -1, 0,
        0, s, c, 0,
        0, 0, 0, 1
    ]);
   /*     m.setRow(0, new Vector4(1, 0, 0, 0));
        m.setRow(1, new Vector4(0, Math.cos(rad), Math.sin(rad) * -1, 0));
        m.setRow(2, new Vector4(0, Math.sin(rad), Math.cos(rad), 0));
        m.setRow(3, new Vector4(0, 0, 0, 1));*/
  //  } else if (axis == "y") {
       /* m.setRow(0, new Vector4(Math.cos(rad), 0, Math.sin(rad), 0));
        m.setRow(1, new Vector4(0, 1, 0, 0));
        m.setRow(2, new Vector4(Math.sin(rad) * -1, 0, Math.cos(rad), 0));
        m.setRow(3, new Vector4(0, 0, 0, 1));*/
   // } else {
      /*  m.setRow(0, new Vector4(Math.cos(rad), Math.sin(rad * -1), 0, 0));
        m.setRow(1, new Vector4(Math.sin(rad), Math.cos(rad), 0, 0));
        m.setRow(2, new Vector4(0, 0, 1, 0));
        m.setRow(3, new Vector4(0, 0, 0, 1))*/
  //  }
    //return m;
}
function matrixTranslate(x: number, y: number, z: number, transformation: Float32Array) {
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z))
        throw ('Non numeric input passed to translate()');
    const m = transformation;
    var rx = x * m[0] + y * m[1] + z * m[2] + m[3];
    var ry = x * m[4] + y * m[5] + z * m[6] + m[7];
    var rz = x * m[8] + y * m[9] + z * m[10] + m[11];
    var rw = x * m[12] + y * m[13] + z * m[14] + m[15];
    return {
        x: rx,
        y: ry,
        z: rz,
        w: rw
    }
}
function matrixMultiply64(m: Float32Array | Float64Array, otherM: Float32Array | Float64Array, result: Float64Array): void {
    var tm0 = m[0], tm1 = m[1], tm2 = m[2], tm3 = m[3];
    var tm4 = m[4], tm5 = m[5], tm6 = m[6], tm7 = m[7];
    var tm8 = m[8], tm9 = m[9], tm10 = m[10], tm11 = m[11];
    var tm12 = m[12], tm13 = m[13], tm14 = m[14], tm15 = m[15];

    var om0 = otherM[0], om1 = otherM[1], om2 = otherM[2], om3 = otherM[3];
    var om4 = otherM[4], om5 = otherM[5], om6 = otherM[6], om7 = otherM[7];
    var om8 = otherM[8], om9 = otherM[9], om10 = otherM[10], om11 = otherM[11];
    var om12 = otherM[12], om13 = otherM[13], om14 = otherM[14], om15 = otherM[15];
    result[0] = tm0 * om0 + tm1 * om4 + tm2 * om8 + tm3 * om12;
    result[1] = tm0 * om1 + tm1 * om5 + tm2 * om9 + tm3 * om13;
    result[2] = tm0 * om2 + tm1 * om6 + tm2 * om10 + tm3 * om14;
    result[3] = tm0 * om3 + tm1 * om7 + tm2 * om11 + tm3 * om15;

    result[4] = tm4 * om0 + tm5 * om4 + tm6 * om8 + tm7 * om12;
    result[5] = tm4 * om1 + tm5 * om5 + tm6 * om9 + tm7 * om13;
    result[6] = tm4 * om2 + tm5 * om6 + tm6 * om10 + tm7 * om14;
    result[7] = tm4 * om3 + tm5 * om7 + tm6 * om11 + tm7 * om15;

    result[8] = tm8 * om0 + tm9 * om4 + tm10 * om8 + tm11 * om12;
    result[9] = tm8 * om1 + tm9 * om5 + tm10 * om9 + tm11 * om13;
    result[10] = tm8 * om2 + tm9 * om6 + tm10 * om10 + tm11 * om14;
    result[11] = tm8 * om3 + tm9 * om7 + tm10 * om11 + tm11 * om15;

    result[12] = tm12 * om0 + tm13 * om4 + tm14 * om8 + tm15 * om12;
    result[13] = tm12 * om1 + tm13 * om5 + tm14 * om9 + tm15 * om13;
    result[14] = tm12 * om2 + tm13 * om6 + tm14 * om10 + tm15 * om14;
    result[15] = tm12 * om3 + tm13 * om7 + tm14 * om11 + tm15 * om15;
}
function matrixInvert64(m: Float32Array | Float64Array): void {
    // the inverse of a Matrix is the transpose of cofactor matrix divided by the determinant
    const m00 = m[0], m01 = m[1], m02 = m[2], m03 = m[3];
    const m10 = m[4], m11 = m[5], m12 = m[6], m13 = m[7];
    const m20 = m[8], m21 = m[9], m22 = m[10], m23 = m[11];
    const m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15];

    const det_22_33 = m22 * m33 - m32 * m23;
    const det_21_33 = m21 * m33 - m31 * m23;
    const det_21_32 = m21 * m32 - m31 * m22;
    const det_20_33 = m20 * m33 - m30 * m23;
    const det_20_32 = m20 * m32 - m22 * m30;
    const det_20_31 = m20 * m31 - m30 * m21;

    const cofact_00 = +(m11 * det_22_33 - m12 * det_21_33 + m13 * det_21_32);
    const cofact_01 = -(m10 * det_22_33 - m12 * det_20_33 + m13 * det_20_32);
    const cofact_02 = +(m10 * det_21_33 - m11 * det_20_33 + m13 * det_20_31);
    const cofact_03 = -(m10 * det_21_32 - m11 * det_20_32 + m12 * det_20_31);

    const det = m00 * cofact_00 + m01 * cofact_01 + m02 * cofact_02 + m03 * cofact_03;

    if (det === 0) {
        // not invertible
        return;
    }

    const detInv = 1 / det;
    const det_12_33 = m12 * m33 - m32 * m13;
    const det_11_33 = m11 * m33 - m31 * m13;
    const det_11_32 = m11 * m32 - m31 * m12;
    const det_10_33 = m10 * m33 - m30 * m13;
    const det_10_32 = m10 * m32 - m30 * m12;
    const det_10_31 = m10 * m31 - m30 * m11;
    const det_12_23 = m12 * m23 - m22 * m13;
    const det_11_23 = m11 * m23 - m21 * m13;
    const det_11_22 = m11 * m22 - m21 * m12;
    const det_10_23 = m10 * m23 - m20 * m13;
    const det_10_22 = m10 * m22 - m20 * m12;
    const det_10_21 = m10 * m21 - m20 * m11;

    const cofact_10 = -(m01 * det_22_33 - m02 * det_21_33 + m03 * det_21_32);
    const cofact_11 = +(m00 * det_22_33 - m02 * det_20_33 + m03 * det_20_32);
    const cofact_12 = -(m00 * det_21_33 - m01 * det_20_33 + m03 * det_20_31);
    const cofact_13 = +(m00 * det_21_32 - m01 * det_20_32 + m02 * det_20_31);

    const cofact_20 = +(m01 * det_12_33 - m02 * det_11_33 + m03 * det_11_32);
    const cofact_21 = -(m00 * det_12_33 - m02 * det_10_33 + m03 * det_10_32);
    const cofact_22 = +(m00 * det_11_33 - m01 * det_10_33 + m03 * det_10_31);
    const cofact_23 = -(m00 * det_11_32 - m01 * det_10_32 + m02 * det_10_31);

    const cofact_30 = -(m01 * det_12_23 - m02 * det_11_23 + m03 * det_11_22);
    const cofact_31 = +(m00 * det_12_23 - m02 * det_10_23 + m03 * det_10_22);
    const cofact_32 = -(m00 * det_11_23 - m01 * det_10_23 + m03 * det_10_21);
    const cofact_33 = +(m00 * det_11_22 - m01 * det_10_22 + m02 * det_10_21);
    m[0] = cofact_00 * detInv;
    m[1] = cofact_10 * detInv;
    m[2] = cofact_20 * detInv;
    m[3] = cofact_30 * detInv;
    m[4] = cofact_01 * detInv;
    m[5] = cofact_11 * detInv;
    m[6] = cofact_21 * detInv;
    m[7] = cofact_31 * detInv;
    m[8] = cofact_02 * detInv;
    m[9] = cofact_12 * detInv;
    m[10] = cofact_22 * detInv;
    m[11] = cofact_32 * detInv;
    m[12] = cofact_03 * detInv;
    m[13] = cofact_13 * detInv;
    m[14] = cofact_23 * detInv;
    m[15] = cofact_33 * detInv;

}
export class TerraScene {
    boundables: Set<boundable> = new Set();



    adapter = this.window.navigator.gpu!.requestAdapter();
    device = this.adapter.then(adapter => adapter.requestDevice());
    gpuscenePromise = this.device.then(device => new GPUScene(device));
    view = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 16);
    projection = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 16);

    viewArr = new Float32Array(this.view);
    projectionArr = new Float32Array(this.projection);

    viewProjection = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 16);

    #gpuscene: GPUScene | undefined;
    get gpuscene(): GPUScene {
        if (!this.#gpuscene)
            throw (new Error('GPUScene has not been initalized'));
        return this.#gpuscene;
    }
    static instance: TerraScene;
    canvas = this.window.document.getElementsByTagName('canvas')[0];

    #gameSpeed = 0;
    #lastStateChangeGameTime = 216000000; //21600 * 1000; //6 hours
    #lastStateChangeTime = new Date().getTime()
    constructor(private window: Window) 
    {
        TerraScene.instance = this;
        this.gpuscenePromise.then(scene => this.#gpuscene = scene);
    }
    render(renderPass: GPURenderPassEncoder, time: DOMHighResTimeStamp) {

    }
    get gameTime() {
        if (this.#gameSpeed < 0)
            return this.#lastStateChangeGameTime;
        var interval = new Date().getTime() - this.#lastStateChangeTime;
        return this.#lastStateChangeGameTime + ((interval * 60) << this.#gameSpeed);
    }
    sunPosition: Float32Array = new Float32Array(3);
    updateSunPosition() {
        let anglePerMinute = (Math.PI * 2) / 1439;
        let meridian: number = Math.PI * 0.1;
        let sundistance = 149600000000;
        let secondsOfDay = ~~((Number(this.gameTime) / 1000) % 86400);
        let minutesOfDay = secondsOfDay / 60;

        let sunAngle = new Angle(minutesOfDay * anglePerMinute).sub(meridian);
        let sunPositionX = sundistance * Math.sin(sunAngle);
        let sunPositionY = sundistance * Math.cos(sunAngle);
        let sunm = rotateMatrix(Math.PI * 0.5, 'x');
        let newpos = matrixTranslate(sunPositionX, sunPositionY, 0, sunm);
        this.sunPosition[0] = newpos.x
        this.sunPosition[2] = newpos.y
        this.sunPosition[2] = newpos.z
    }
    async collissionCheck(rayFunction: (mesh: boundable) => any, boundables: IterableIterator<boundable>, pickResult: PickingInfo | null, fastCheck?: boolean, predicate?: (mesh: boundable) => boolean): Promise<PickingInfo | null> {
        let boundableMesh: boundable;
        do {
            const boundable = boundables.next();
            if (boundable.done)
                return new Promise(res => res(pickResult));
            boundableMesh = boundable.value;

        } while (predicate ? !predicate(boundableMesh) : false);

        const ray = rayFunction(boundableMesh);
        const result = await boundableMesh.bounding.intersects(ray);
        if (!result || !result.hit)
            return this.collissionCheck(rayFunction, boundables, pickResult, fastCheck, predicate);
        if (!fastCheck && pickResult != null && result.distance >= pickResult.distance)
            return this.collissionCheck(rayFunction, boundables, pickResult, fastCheck, predicate);
        pickResult = result;
        if (fastCheck)
            return result;
        else
            return this.collissionCheck(rayFunction, boundables, pickResult);
    }
    pickPromise(x: number, y: number, predicate?: (mesh: boundable) => boolean, fastCheck?: boolean): Promise<PickingInfo | null> {
        const cwidth = ~~TerraScene.instance.canvas.getAttribute('width')!;
        const cheight = ~~TerraScene.instance.canvas.getAttribute('height')!;

        let rayFunction = (boundableMesh: boundable) => {

            let m = new TerraMatrix([1.0, 0.0, 0.0, 0.0,
                                    0.0, 1.0, 0.0, 0.0,
                                    0.0, 0.0, 1.0, 0.0,
                                    0.0, 0.0, 0.0, 1.0]);
            if (boundableMesh.worldPosition) {
                m = boundableMesh.worldPosition.worldMatrix;
            }

            return this.createPickingRay(x, y, m, cwidth, cheight );
        };
        return this.collissionCheck(rayFunction, this.boundables.values(), null, fastCheck).then((pickResult: PickingInfo | null) => {
           /* if (pickResult) {
                pickResult.ray = Ray.Zero();
                this.createPickingRayToRef(x, y, Matrix.Identity(), pickResult.ray, this.cameraToUseForPointers || null, false)
            }*/
            return pickResult;
        });
    }
    static tempM1 = new Float64Array(16);
    createPickingRay(x: number, y: number, world: Float32Array, cwidth: number, cheight: number) {

        const viewport = {
            x: 0,
            y: 0,
            width: cwidth,
            height: cheight
        }

        // Moving coordinates to local viewport world
        x = x  - viewport.x;
        y = y - (cheight - viewport.y - viewport.height);

        //Todo, reuse matrix and vector

        //const matrix = world.multiply(viewProjection);

        /*const matrix = TerraScene.tempM1;
        matrixMultiply64(world, this.viewArr, matrix);
        matrixMultiply64(matrix, this.projectionArr, matrix);
        */

        const matrix = Matrix.Zero();
        const worldM = Matrix.FromArray(world);
        worldM.multiplyToRef(Matrix.FromArray(Array.from(new Float32Array(this.view))), matrix);
        matrix.multiplyToRef(Matrix.FromArray(Array.from(new Float32Array(this.projection))), matrix);
        
        //TODO use matrixMultiply64 and matrixInvert64

       // matrixInvert64(matrix);
       // const inverted = Matrix.FromArray(matrix);
        //const inverted = Matrix.FromArray(matrix).invert();
        const inverted = matrix.invert();
        var nearScreenSource = Vector3.Zero()
        nearScreenSource.x = x / viewport.width * 2 - 1;
        nearScreenSource.y = -(y / viewport.height * 2 - 1);
        nearScreenSource.z = -1.0;
        var farScreenSource = (new Vector3()).copyFromFloats(nearScreenSource.x, nearScreenSource.y, 1.0);
        const nearVec3 = new Vector3();
        const farVec3 = new Vector3();
        Vector3._UnprojectFromInvertedMatrixToRef(nearScreenSource, inverted, nearVec3);
        Vector3._UnprojectFromInvertedMatrixToRef(farScreenSource, inverted, farVec3);
        const origin = (new Vector3()).copyFrom(nearVec3);
        const direction = new Vector3();
        farVec3.subtractToRef(nearVec3, direction);
        direction.normalize();
        return {
            origin,
            direction
        }
       // result.update(x, y, viewport.width, viewport.height, world ? world : Matrix.IdentityReadOnly, cameraViewSpace ? Matrix.IdentityReadOnly : camera.getViewMatrix(), camera.getProjectionMatrix());
        
    }
}
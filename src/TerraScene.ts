import type { GPU } from "./GPU";

import { TerraCamera } from "./TerraCamera";
import { Engine } from "./engine";
import { Scene } from "./Scene";
//import { Camera } from "../wwwroot/js/lib/babylon/Cameras/camera";

/*interface Ray {
    origin: any,
    direction: any,
}*/
//const _tempPickingRay: Ray = Ray.Zero();

/*
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

}*/
export class TerraScene extends Scene {

    static instance: TerraScene;

    //context: GPUCanvasContext = this.canvas.getContext('gpupresent') as unknown as GPUCanvasContext;
    
    constructor(engine: Engine, gpu: GPU, TerraCameras: TerraCamera[], onRenderStart: (scene: Scene, sunBufferOffsetBytes:number) => void) {
        super(gpu, engine, TerraCameras, onRenderStart);
       // TerraScene.instance = this;
    }

    



    static tempM1 = new Float64Array(16);
  
}
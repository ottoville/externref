export class TerraMatrix extends Float32Array {
    view64: Float64Array;
    constructor(Arr?: ArrayBufferLike, offset?: number)
    constructor(Arr?: number[])
    constructor(Arr?: number[] | ArrayBufferLike, offset = 0) {
        if (!Arr)
            super(16);
        else if (Array.isArray(Arr)) {
            Arr.length = 16;
            super(Arr);
        }
        else {
            super(Arr, offset, 16);
        }
        this.view64 = new Float64Array(this.buffer, offset, 8);
    }
    declare readonly length: 16;
    declare 0: number
    declare 1: number
    declare 2: number
    declare 3: number
    declare 4: number
    declare 5: number
    declare 6: number
    declare 7: number
    declare 8: number
    declare 9: number
    declare 10: number
    declare 11: number
    declare 12: number
    declare 13: number
    declare 14: number
    declare 15: number
    multiplyToRef(otherM: TerraMatrix, result: TerraMatrix): TerraMatrix {
        var tm0 = this[0], tm1 = this[1], tm2 = this[2], tm3 = this[3];
        var tm4 = this[4], tm5 = this[5], tm6 = this[6], tm7 = this[7];
        var tm8 = this[8], tm9 = this[9], tm10 = this[10], tm11 = this[11];
        var tm12 = this[12], tm13 = this[13], tm14 = this[14], tm15 = this[15];

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
        return result;
    }
    equals(om: TerraMatrix) {
        return (
            this.view64[0] == om.view64[0] && this.view64[1] == om.view64[1] &&
            this.view64[2] == om.view64[2] && this.view64[3] == om.view64[3] &&
            this.view64[4] == om.view64[4] && this.view64[5] == om.view64[5] &&
            this.view64[6] == om.view64[6] && this.view64[7] == om.view64[7]
            )
    }
    clone() {
        return new TerraMatrix(this.buffer.slice(0));
    }
    invertToRef(other: TerraMatrix): TerraMatrix {
        // the inverse of a Matrix is the transpose of cofactor matrix divided by the determinant

        const m00 = this[0], m01 = this[1], m02 = this[2], m03 = this[3];
        const m10 = this[4], m11 = this[5], m12 = this[6], m13 = this[7];
        const m20 = this[8], m21 = this[9], m22 = this[10], m23 = this[11];
        const m30 = this[12], m31 = this[13], m32 = this[14], m33 = this[15];

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
            other.set(this);
            return this;
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
        other.set([
            cofact_00 * detInv, cofact_10 * detInv, cofact_20 * detInv, cofact_30 * detInv,
            cofact_01 * detInv, cofact_11 * detInv, cofact_21 * detInv, cofact_31 * detInv,
            cofact_02 * detInv, cofact_12 * detInv, cofact_22 * detInv, cofact_32 * detInv,
            cofact_03 * detInv, cofact_13 * detInv, cofact_23 * detInv, cofact_33 * detInv
        ]);
        return this;
    }
}
export class TerraVector2 extends Float32Array {
    declare 0: number
    declare 1: number
}
export class TerraVector3 extends Float32Array {
    declare 0: number
    declare 1: number
    declare 2: number
    constructor(Arr?: ArrayBufferLike, offset?: number)
    constructor(Arr?: number[])
    constructor(Arr?: number[] | ArrayBufferLike, offset = 0) {
        if (!Arr)
            super(3);
        else if (Array.isArray(Arr)) {
            Arr.length = 3;
            super(Arr);
        }
        else {
            super(Arr, offset, 3);
        }
    }
    multiply(m: TerraMatrix): void {
        var rx = this[0] * m[0] + this[1] * m[4] + this[2] * m[8] + m[12];
        var ry = this[0] * m[1] + this[1] * m[5] + this[2] * m[9] + m[13];
        var rz = this[0] * m[2] + this[1] * m[6] + this[2] * m[10] + m[14];
        var rw = 1 / (this[0] * m[3] + this[1] * m[7] + this[2] * m[11] + m[15]);
        this[0] = rx * rw;
        this[1] = ry * rw;
        this[2] = rz * rw;
    }
    normalize() {
        const len = Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
        if (len == 0 || len == 1.0) {
            return this;
        }
        const scale = 1.0 / len;
        this[0] *= scale;
        this[1] *= scale;
        this[2] *= scale;
        return this;
    }
    set(arr:[number,number,number] | TerraVector3) {
        this[0] = arr[0];
        this[1] = arr[1];
        this[2] = arr[2];
    }
    dot(vector:TerraVector3|[number,number,number]) {
        return this[0] * vector[0] + this[1] * vector[1] + this[2] * vector[2];

    }
}
export class TerraVector4 extends Float32Array {
    declare 0: number
    declare 1: number
    declare 2: number
    declare 3: number
    constructor(Arr?: ArrayBufferLike, offset?: number)
    constructor(Arr?: number[])
    constructor(Arr?: number[] | ArrayBufferLike, offset = 0) {
        if (!Arr)
            super(4);
        else if (Array.isArray(Arr)) {
            Arr.length = 4;
            super(Arr);
        }
        else {
            super(Arr, offset, 4);
        }
    }
}
const fullRad = Math.PI * 2
export class Angle {
    constructor(private _rad: number, private _deg?: number) { }
    get deg(): number {
        if (typeof (this._deg) === 'number')
            return this._deg;
        this._deg = Math.abs(this._rad * (180 / Math.PI));
        return this._deg;
    }
    get rad(): number {
        if (typeof (this._rad) === 'number')
            return this._rad;
        if (typeof (this._deg) == 'undefined') {
            throw (new Error('Broken Angle instance'));
        }
        this._rad = Math.abs(this._deg * Math.PI / 180);
        return this._rad;
    }
    360(p1: TerraVector2, p2: TerraVector2): Angle {
        if (p2[1] - p1[1] < 0) {
            if (p2[0] - p1[0] < 0)
                return new Angle(fullRad - this.rad);
            return new Angle(Math.PI + this.rad);
        }
        else if (p2[0] - p1[0] > 0)
            return new Angle(Math.PI - this.rad);
        return new Angle(this.rad);
    }
    sum(ang: Angle): Angle {
        return new Angle(this.rad % ang.rad % fullRad)
    }
    add(deg: number): number {
        return this.deg + deg % 360
    }
    sub(rad: number): number {
        if (rad < fullRad && rad > this.rad)
            return fullRad + (this.rad - rad);
        else
            return this.rad - rad % 360
    }
    distance(rad: number): Angle {
        let phi = (rad - this.rad) % fullRad;       // This is either the distance or 360 - distance
        let distance = phi > Math.PI ? fullRad - phi : phi;
        return new Angle(distance);
    }
}

export class Triangle {
    createPlane(): TerraVector4 {
        const v0 = this.vectors[0];
        const v1 = this.vectors[1];
        const v2 = this.vectors[2];
        var x1 = v1[0] - v2[0];
        var y1 = v1[1] - v2[1];
        var z1 = v1[2] - v2[2];
        var x2 = v0[0] - v2[0];
        var y2 = v0[1] - v2[1];
        var z2 = v0[2] - v2[2];
        var yz = (y1 * z2) - (z1 * y2);
        var xz = (z1 * x2) - (x1 * z2);
        var xy = (x1 * y2) - (y1 * x2);
        var pyth = Math.sqrt(yz * yz + xz * xz + xy * xy);
        var invPyth;

        if (pyth !== 0) {
            invPyth = 1.0 / pyth;
        }
        else {
            invPyth = 0.0;
        }
        let normal_x = yz * invPyth
        let normal_y = xz * invPyth
        let normal_z = xy * invPyth;
        if (!this.plane)
            return new TerraVector4([normal_x, normal_y, normal_z, -((normal_x * this.vectors[2][0]) + (normal_y * this.vectors[2][1]) + (normal_z * this.vectors[2][2]))]);
        else
            this.plane.set([normal_x, normal_y, normal_z, -((normal_x * this.vectors[2][0]) + (normal_y * this.vectors[2][1]) + (normal_z * this.vectors[2][2]))]);
        return this.plane;
    }
    updatePlane() {
        this.createPlane();
    }
    public plane = this.createPlane()
    constructor(
        public vectors: [TerraVector3, TerraVector3, TerraVector3] = [new TerraVector3(), new TerraVector3(), new TerraVector3()]
        ) {
    }

}
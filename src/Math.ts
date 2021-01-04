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
        else
            super(Arr, offset, 16);
        this.view64 = new Float64Array(this.buffer);
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
            this.view64[0] === om.view64[0] && this.view64[1] === om.view64[1] &&
            this.view64[2] === om.view64[2] && this.view64[3] === om.view64[3] &&
            this.view64[4] === om.view64[4] && this.view64[5] === om.view64[5] &&
            this.view64[6] === om.view64[6] && this.view64[7] === om.view64[7]
            )
    }
    clone() {
        return new TerraMatrix(this.buffer.slice(0));
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
    multiply(m: TerraMatrix): void {
        var rx = this[0] * m[0] + this[1] * m[4] + this[2] * m[8] + m[12];
        var ry = this[0] * m[1] + this[1] * m[5] + this[2] * m[9] + m[13];
        var rz = this[0] * m[2] + this[1] * m[6] + this[2] * m[10] + m[14];
        var rw = 1 / (this[0] * m[3] + this[1] * m[7] + this[2] * m[11] + m[15]);
        this[0] = rx * rw;
        this[1] = ry * rw;
        this[2] = rz * rw;
    }
}
export class TerraVector4 extends Float32Array {
    declare 0: number
    declare 1: number
    declare 2: number
    declare 3: number
}
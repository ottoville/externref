export class TerraMatrix extends Float32Array {
    constructor(Arr: ArrayBufferLike, offset: number)
    constructor(Arr: number[])
    constructor(Arr: number[] | ArrayBufferLike, offset=0) {
        if (Array.isArray(Arr))
            super(Arr.slice(0, 16));
        else
            super(Arr, offset, 16);
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
}
export class Vector2 extends Float32Array {
    declare 0: number
    declare 1: number
}
export class Vector3 extends Float32Array {
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
export class Vector4 extends Float32Array {
    declare 0: number
    declare 1: number
    declare 2: number
    declare 3: number
}
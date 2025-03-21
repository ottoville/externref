import type { Engine } from './engine.js';
declare const engine: Engine;

export class TerraMatrix extends Float32Array {
  constructor(Arr?: ArrayBufferLike, offset?: number);
  constructor(Arr?: number[]);
  constructor(Arr?: number[] | ArrayBufferLike, offset = 0) {
    if (!Arr) super(16);
    else if (Array.isArray(Arr)) {
      Arr.length = 16;
      super(Arr);
    } else {
      super(Arr, offset, 16);
    }
  }
  declare readonly length: 16;
  declare 0: number;
  declare 1: number;
  declare 2: number;
  declare 3: number;
  declare 4: number;
  declare 5: number;
  declare 6: number;
  declare 7: number;
  declare 8: number;
  declare 9: number;
  declare 10: number;
  declare 11: number;
  declare 12: number;
  declare 13: number;
  declare 14: number;
  declare 15: number;
  invertToRef(other: TerraMatrix): TerraMatrix {
    // the inverse of a Matrix is the transpose of cofactor matrix divided by the determinant

    const m00 = this[0],
      m01 = this[1],
      m02 = this[2],
      m03 = this[3];
    const m10 = this[4],
      m11 = this[5],
      m12 = this[6],
      m13 = this[7];
    const m20 = this[8],
      m21 = this[9],
      m22 = this[10],
      m23 = this[11];
    const m30 = this[12],
      m31 = this[13],
      m32 = this[14],
      m33 = this[15];

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

    const det =
      m00 * cofact_00 + m01 * cofact_01 + m02 * cofact_02 + m03 * cofact_03;

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
      cofact_00 * detInv,
      cofact_10 * detInv,
      cofact_20 * detInv,
      cofact_30 * detInv,
      cofact_01 * detInv,
      cofact_11 * detInv,
      cofact_21 * detInv,
      cofact_31 * detInv,
      cofact_02 * detInv,
      cofact_12 * detInv,
      cofact_22 * detInv,
      cofact_32 * detInv,
      cofact_03 * detInv,
      cofact_13 * detInv,
      cofact_23 * detInv,
      cofact_33 * detInv,
    ]);
    return this;
  }
}
export class Uint16Vector2 extends Uint16Array {
  declare 0: number;
  declare 1: number;
}
export class TerraVector2 extends Float32Array {
  declare 0: number;
  declare 1: number;
}

export abstract class TerraVector3 extends Float32Array {
  abstract 0: number;
  abstract 1: number;
  abstract 2: number;
  static override of(x: number, y: number, z: number) {
    return super.of(x, y, z) as TerraVector3;
  }
  constructor(Arr?: ArrayBufferLike, byteOffset?: number);
  constructor(Arr?: number[]);
  constructor(Arr?: number[] | ArrayBufferLike, byteOffset = 0) {
    if (!Arr) super(3);
    else if (Array.isArray(Arr)) {
      Arr.length = 3;
      super(Arr);
    } else {
      super(Arr, byteOffset, 3);
    }
  }
  override toString() {
    return `x: ${this[0]}, y: ${this[1]}, z: ${this[2]}`;
  }
  LerpToRef(
    end: readonly [number, number, number],
    t: number,
    result: MutableTerraVector3,
  ): void {
    result[0] = this[0] + (end[0] - this[0]) * t;
    result[1] = this[1] + (end[1] - this[1]) * t;
    result[2] = this[2] + (end[2] - this[2]) * t;
  }
  multiply2Ref(
    m: TerraMatrix,
    ref: TerraVector3 | TerraVector4 | [number, number, number],
  ): void {
    var rx = this[0] * m[0] + this[1] * m[4] + this[2] * m[8] + m[12];
    var ry = this[0] * m[1] + this[1] * m[5] + this[2] * m[9] + m[13];
    var rz = this[0] * m[2] + this[1] * m[6] + this[2] * m[10] + m[14];
    var rw = 1 / (this[0] * m[3] + this[1] * m[7] + this[2] * m[11] + m[15]);
    ref[0] = rx * rw;
    ref[1] = ry * rw;
    ref[2] = rz * rw;
  }
  override set(
    arr:
      | [number, number, number]
      | TerraVector3
      | ({ 0: number; 1: number; 2: number } & Float32Array),
  ) {
    this[0] = arr[0];
    this[1] = arr[1];
    this[2] = arr[2];
  }
}
export class ReadOnlyFloat32Array extends Float32Array {
  override set(this: never) {
    return;
  }
}
export class ReadOnlyTerraVector3 extends TerraVector3 {
  //Nominal typing
  readonly mutable: number = 2;
  declare readonly 0: number;
  declare readonly 1: number;
  declare readonly 2: number;
  static override of(x: number, y: number, z: number) {
    return super.of(x, y, z) as ReadOnlyTerraVector3;
  }
  override set(_array: ArrayLike<number>, _offset?: number): never | void {
    throw new Error('Cannot use "set" in ReadOnly vector, use setter instead');
  }
  clone() {
    return new ReadOnlyTerraVector3(
      this.buffer.slice(this.byteOffset, this.byteOffset + 12),
    );
  }
}

export class MutableTerraVector3 extends TerraVector3 {
  static override of(x: number, y: number, z: number) {
    return super.of(x, y, z) as MutableTerraVector3;
  }
  //Nominal typing
  readonly mutable = 1;
  declare 0: number;
  declare 1: number;
  declare 2: number;
  clone() {
    return new MutableTerraVector3(
      this.buffer.slice(this.byteOffset, this.byteOffset + 12),
    );
  }
}
export class TerraVector4 extends Float32Array {
  declare 0: number;
  declare 1: number;
  declare 2: number;
  declare 3: number;
  static override of(x: number, y: number, z: number, w: number) {
    return super.of(x, y, z, w) as TerraVector4;
  }
  constructor(Arr?: ArrayBufferLike, offset?: number);
  constructor(Arr?: number[]);
  constructor(Arr?: number[] | ArrayBufferLike, offset = 0) {
    if (!Arr) super(4);
    else if (Array.isArray(Arr)) {
      Arr.length = 4;
      super(Arr);
    } else {
      super(Arr, offset, 4);
    }
  }
}
export class Quaternion extends TerraVector4 {
  static override of(i: number, j: number, k: number, w: number) {
    return super.of(i, j, k, w) as Quaternion;
  }
}
/**
 Math.PI * 2
 */
const fullRad = Math.PI * 2;
export class Angle {
  constructor(
    private _rad: number = 0,
    private _deg?: number,
  ) {
    if (Number.isNaN(_rad)) {
      throw new Error('Radian is NaN');
    }
  }
  get deg(): number {
    if (typeof this._deg === 'number') return this._deg;
    this._deg = Math.abs(this._rad * (180 / Math.PI));
    return this._deg;
  }
  get rad(): number {
    if (typeof this._rad === 'number') return this._rad;
    if (typeof this._deg == 'undefined') {
      throw new Error('Broken Angle instance');
    }
    this._rad = Math.abs((this._deg * Math.PI) / 180);
    return this._rad;
  }
  360(p1: TerraVector2, p2: TerraVector2): Angle {
    if (p2[1] - p1[1] < 0) {
      if (p2[0] - p1[0] < 0) return new Angle(fullRad - this.rad);
      return new Angle(Math.PI + this.rad);
    } else if (p2[0] - p1[0] > 0) return new Angle(Math.PI - this.rad);
    return new Angle(this.rad);
  }
  sum(ang: Angle): Angle {
    return new Angle((this.rad % ang.rad) % fullRad);
  }
  add(rad: number) {
    this._rad = (this._rad + rad) % fullRad;
  }
  sub(rad: number): number {
    if (rad < fullRad && rad > this.rad) return fullRad + (this.rad - rad);
    else return this.rad - (rad % fullRad);
  }
  distance(rad: number): Angle {
    const phi = (rad - this.rad) % fullRad; // This is either the distance or 360 - distance
    return new Angle(phi > Math.PI ? fullRad - phi : phi);
  }
}

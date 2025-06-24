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
  override set(
    arr:
      | readonly [number, number, number]
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

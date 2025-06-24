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

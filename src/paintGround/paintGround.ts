const fullRad = Math.PI * 2;
import { TerraVector2, Angle } from '../Math.js';

import type { Terrain } from '../world/Terrain.js';

import type { Scene } from '../Scene.js';
import type { Engine, ListenerObj } from '../engine.js';
declare const engine: Engine;

export type PTDresult = {
  coord: TerraVector2;
  rad: number; // Angle,
  size: Readonly<{
    width: number;
    height: number;
  }>;
};
export type PTResultF = (coords: PTDresult) => void;

export abstract class paintGround {
  protected ang360: Angle = new Angle(0);
  #end_position: Float32Array = new Float32Array(2);
  #start_position = new TerraVector2(2);
  protected size = {
    height: 0,
    width: 0,
  };
  constructor(
    protected scene: Scene,
    protected ground: Terrain,
    public resolve: PTResultF,
  ) {
    engine.addInputListener(this.#mainPointerDown);
  }
  //public resolve: PTResultF = () => null;
  /* public activate(callback: PTResultF) {
         this.uitab.canvasListener.addListener("pointerdown", this.#mainPointerDown, { once: true });
         this.resolve = callback;
     }*/
  public destroy() {
    engine.clearInputListeners(this);
  }

  protected drawVector = new TerraVector2(2);

  #drawArea: ListenerObj<'pointermove'> = {
    cb: () => {
      engine
        .gpu!.renderPassScreen.pickMesh(undefined, (mesh) => {
          return mesh === this.ground.mesh;
        })
        .then((pickInfo) => {
          if (pickInfo) {
            this.#end_position[0] = pickInfo.position[0];
            this.#end_position[1] = pickInfo.position[2];
            this.drawVector[0] =
              this.#start_position[0] - this.#end_position[0];
            this.drawVector[1] =
              (this.#start_position[1] - this.#end_position[1]) * -1;

            if (this.drawVector[0] === 0) {
              return;
            }
            this.size.height = Math.sqrt(
              this.drawVector[0] * this.drawVector[0] +
                this.drawVector[1] * this.drawVector[1],
            );

            const rad = Math.atan(
              Math.abs(this.drawVector[1]) / Math.abs(this.drawVector[0]),
            );
            if (this.drawVector[1] < 0) {
              if (this.drawVector[0] > 0)
                this.ang360 = new Angle(fullRad - rad);
              else this.ang360 = new Angle(Math.PI + rad);
            } else if (this.drawVector[0] < 0)
              this.ang360 = new Angle(Math.PI - rad);
            else this.ang360 = new Angle(rad);
          } else {
            console.debug('no pickinfo pickedpoint');
            console.log(pickInfo);
          }
        })
        .catch((err) => {
          engine.showError(err);
        });
    },
    object: this,
    type: 'pointermove',
  };
  abstract onMainPointerDown(startingPoint: Float32Array): void;
  abstract onMainPointerUp(height: number, end_position: Float32Array): void;
  abstract onAreaDraw(width: number): void;
  #mouseMoved = false;
  #mousemove: ListenerObj<'pointermove'> = {
    cb: () => {
      if (!this.#mouseMoved) {
        engine.addInputListener(this.#finalClick);
      }
      this.#mouseMoved = true;
      engine
        .gpu!.renderPassScreen.pickMesh(undefined, (mesh) => {
          return mesh === this.ground.mesh;
        })
        .then((pickInfo) => {
          if (pickInfo && this.#end_position) {
            //Distance from first point
            const p0 = this.#start_position[0] - pickInfo.position[0];
            const p1 = this.#start_position[1] - pickInfo.position[2];

            const distanceSquared = p0 * p0 + p1 * p1;
            let rad = Math.atan(Math.abs(p1) / Math.abs(p0));
            if (p1 > 0) {
              if (p0 > 0) {
                rad = fullRad - rad;
              } else rad += Math.PI;
            } else if (p0 < 0) {
              rad = Math.PI - rad;
            }

            const dotang = this.ang360.distance(rad);
            this.size.width = Math.sqrt(
              distanceSquared -
                distanceSquared * Math.pow(Math.cos(dotang.rad), 2),
            );

            if (p1 * this.drawVector[0] + p0 * this.drawVector[1] < 0)
              //Dot product
              this.size.width *= -1;
            this.onAreaDraw(this.size.width);
          }
        })
        .catch((err) => engine.showError(err));
      return true;
    },
    object: this,
    options: {
      priority: true,
    },
    type: 'pointermove',
  };
  #finalClick: ListenerObj<'pointerup'> = {
    cb: () => {
      engine.removeInputListener(this.#mousemove);
      this.#mouseMoved = false;
      // zones.push({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } });
      //(await me.db).transaction("zones", 'readwrite').objectStore("zones").put({ coord: startingPoint, ang: ang360, size: { h: height * -1, w: width } })
      engine.addInputListener(this.#mainPointerDown);
      this.resolve({
        coord: this.#start_position,
        rad: this.ang360.rad,
        size: this.size,
      });
    },
    object: this,
    options: {
      once: true,
    },
    type: 'pointerup',
  };
  #pointerUp: ListenerObj<'pointerup'> = {
    cb: () => {
      engine.removeInputListener(this.#drawArea);
      //fix race condition
      if (this.#end_position[0] == 0) return;
      try {
        this.onMainPointerUp(this.size.height, this.#end_position);
      } catch (e) {
        console.log(e);
      } finally {
        engine.addInputListener(this.#mousemove);
      }
    },
    object: this,
    options: {
      once: true,
    },
    type: 'pointerup',
  };
  #mainPointerDown: ListenerObj<'pointerdown'> = {
    cb: (evt) => {
      if (evt.button !== 0) {
        engine.addInputListener(this.#mainPointerDown);
        return;
      }
      // check if we are under a mesh
      /*  var pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, mesh => {
                  return mesh === this.ground
              }, false, this.camera);*/
      engine
        .gpu!.renderPassScreen.pickMesh(undefined, (mesh) => {
          return mesh === this.ground.mesh;
        })
        .then((pickInfo) => {
          if (pickInfo) {
            this.#start_position = new TerraVector2([
              pickInfo.position[0],
              pickInfo.position[2],
            ]);
            this.onMainPointerDown(this.#start_position);
            engine.addInputListener(this.#drawArea);
            engine.addInputListener(this.#pointerUp);
          } else {
            console.debug('no pickinfo pickedpoint');
            console.log(pickInfo);
          }
        })
        .catch((err) => engine.showError(err));
      return true;
    },
    object: this,
    options: {
      once: true,
      priority: true,
    },
    type: 'pointerdown',
  };
}

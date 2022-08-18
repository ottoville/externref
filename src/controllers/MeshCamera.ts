import { TerraVector3 } from "../Math.js";
import type { TerraCamera } from "../TerraCamera.js";
import type { Engine } from "../engine";
declare const engine:Engine;

export const enum ARROW_KEYS  {
    UP = 1,
    RIGHT = 2,
    DOWN = 4,
    LEFT = 8,
    LEFT_AND_RIGHT = ARROW_KEYS.RIGHT|ARROW_KEYS.LEFT
}

export class MeshCamera {
    name='PositionCamera';
    angle=Math.PI;
    verticalAngle=Math.PI*0.5;
    arrowKeysDown=0;
    pointerMovement={x:0,y:0};
    constructor(public camera: TerraCamera, initial=false) {
        const syncCamera = () => {
            //this.camera.position=this.#position;
            this.camera.updateDirection(direction => {
                direction[0]=Math.cos(this.angle);
                direction[1]=0;
                direction[2]=Math.sin(this.angle);
            });
        }
        if(initial && engine.DB) {
            engine.DB.transaction("save").objectStore("save").get(["camera", "MeshCamera"]).onsuccess = evt => {
                if ((evt.target as IDBRequest).result) {
                    const restored = ((evt.target as IDBRequest).result as {
                        data: {
                            position:[number,number,number],
                            angle:number
                        }
                     });
                     //this.#position.set(restored.data.position);
                     this.angle=restored.data.angle;
                     syncCamera();
                }
            }
        } else {
            //this.#position.set(this.camera.position as TerraVector3);
            this.angle=Math.acos(this.camera.direction[0]);
        }
        //syncCamera();
        this.enable();
    }
    disable() {
        document.exitPointerLock();
        document.removeEventListener('keydown', this.#keydownfunction);
        document.removeEventListener('keyup', this.#keyupfunction);
        document.removeEventListener('pointermove', this.#pointerMoveFunction);
        document.removeEventListener('pointerdown', this.#pointerDownFunction);
    }
    enable() {
        document.body.requestPointerLock()
        document.addEventListener('pointerdown', this.#pointerDownFunction);
        document.addEventListener('keydown', this.#keydownfunction);
        document.addEventListener('keyup', this.#keyupfunction);
        document.addEventListener('pointermove', this.#pointerMoveFunction);
    }
    //#serializeRequested=false;

    serialize = () => {
        return;
      /*  if(this.#serializeRequested)
            return;
        this.#serializeRequested=true;
        const request=engine.DB.transaction("save", "readwrite").objectStore("save").put({
            type: 'camera',
            name: 'PositionCamera',
            data: {
                position:this.#position,
                angle:this.#angle
             }
        });
        request.onsuccess=() => {
            this.#serializeRequested    =false;
        };
        request.onerror =(e) => {
            this.#serializeRequested    =false;
            console.error(e);
        };*/
    }
    #keydownfunction = (e:KeyboardEvent) => {
        if(e.key==='ArrowUp') {
            this.arrowKeysDown|=ARROW_KEYS.UP;
          //  this.#mesh.grip=0.8;
        }
        else if(e.key==='ArrowDown') {
            this.arrowKeysDown|=ARROW_KEYS.DOWN;
        }
        if(e.key==='ArrowLeft') {
            this.arrowKeysDown|=ARROW_KEYS.LEFT;
        }
        else if(e.key==='ArrowRight') {
            this.arrowKeysDown|=ARROW_KEYS.RIGHT;
        }
    }
    #pointerMoveFunction = (e:PointerEvent) => {
        this.pointerMovement={x:e.movementX, y: e.movementY}
    }
    #pointerDownFunction = () => {
        document.body.requestPointerLock()
    }
    #keyupfunction = (e:KeyboardEvent) => {
        if(e.key==='ArrowUp') {
            this.arrowKeysDown&=~ARROW_KEYS.UP;
          //  this.#mesh.grip=0;
        }
        else if(e.key==='ArrowDown') {
            this.arrowKeysDown&=~ARROW_KEYS.DOWN;
        }
        if(e.key==='ArrowLeft') {
            this.arrowKeysDown&=~ARROW_KEYS.LEFT;
        }
        else if(e.key==='ArrowRight') {
            this.arrowKeysDown&=~ARROW_KEYS.RIGHT;
        }
    }
    destroy(): void {
        this.disable();
    }
    lastTranslation=new TerraVector3();
}
import type { Engine } from "engine";
import { TerraVector3 } from "../Math.js";
import type { TerraCamera } from "../TerraCamera.js";
import type { CameraController } from "./CameraController.js";

declare const engine:Engine;

const enum ARROW_KEYS  {
    UP = 1,
    RIGHT = 2,
    DOWN = 4,
    LEFT = 8,

    LEFT_AND_RIGHT = ARROW_KEYS.RIGHT|ARROW_KEYS.LEFT
}

ARROW_KEYS.LEFT_AND_RIGHT


export class PositionCamera implements CameraController {
    name='PositionCamera';
    #angle=Math.PI;
    #position=new TerraVector3([-3000,300,0]);
    #velocity=0.5;
    #arrowKeysDown=0;

    constructor(private camera: TerraCamera, initial=false) {
        const syncCamera = () => {
            this.camera.position=this.#position;
            this.camera.updateDirection(direction => {
                direction[0]=Math.cos(this.#angle);
                direction[1]=0;
                direction[2]=Math.sin(this.#angle);
            });
        }
        if(initial) {
            engine.DB.transaction("save").objectStore("save").get(["camera", "PositionCamera"]).onsuccess = evt => {
                if ((evt.target as IDBRequest).result) {
                    const restored = ((evt.target as IDBRequest).result as {
                        data: {
                            position:[number,number,number],
                            angle:number
                        }
                     });
                     this.#position.set(restored.data.position);
                     this.#angle=restored.data.angle;
                     syncCamera();
                }
            }
        } else {
            this.#position.set(this.camera.position as TerraVector3);
            this.#angle=Math.acos(this.camera.direction[0]);
        }
        //syncCamera();
        engine.collider.radius[0] = 0.5;
        engine.collider.radius[1] = 0.5;
        engine.collider.radius[2] = 0.5;
        document.addEventListener('keydown', this.#keydownfunction);
        document.addEventListener('keyup', this.#keyupfunction);
    }
    #serializeRequested=false;
    serialize = () => {
        if(this.#serializeRequested)
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
        };
    }
    #keydownfunction = (e:KeyboardEvent) => {
        if(e.key==='ArrowUp') {
            this.#arrowKeysDown|=ARROW_KEYS.UP;
        }
        else if(e.key==='ArrowDown') {
            this.#arrowKeysDown|=ARROW_KEYS.DOWN;
        }
        if(e.key==='ArrowLeft') {
            this.#arrowKeysDown|=ARROW_KEYS.LEFT;
        }
        else if(e.key==='ArrowRight') {
            this.#arrowKeysDown|=ARROW_KEYS.RIGHT;
        }
    }
    #keyupfunction = (e:KeyboardEvent) => {
        if(e.key==='ArrowUp') {
            this.#arrowKeysDown&=~ARROW_KEYS.UP;
        }
        else if(e.key==='ArrowDown') {
            this.#arrowKeysDown&=~ARROW_KEYS.DOWN;
        }
        if(e.key==='ArrowLeft') {
            this.#arrowKeysDown&=~ARROW_KEYS.LEFT;
        }
        else if(e.key==='ArrowRight') {
            this.#arrowKeysDown&=~ARROW_KEYS.RIGHT;
        }
    }
    destroy(): void {
        document.removeEventListener('keydown', this.#keydownfunction);
        document.removeEventListener('keyup', this.#keyupfunction);
    }
    checkInputs() {
        if(this.#arrowKeysDown === 0)
            return false;
        if((this.#arrowKeysDown & ARROW_KEYS.UP) === ARROW_KEYS.UP) {
            const direction=this.camera.direction;
            this.#position[0]-=(direction[0]*this.#velocity)
            this.#position[1]-=(direction[1]*this.#velocity)
            this.#position[2]-=(direction[2]*this.#velocity)
        }
        if((this.#arrowKeysDown & ARROW_KEYS.DOWN) === ARROW_KEYS.DOWN) {
            const direction=this.camera.direction;
            this.#position[0]+=(direction[0]*this.#velocity)
            this.#position[1]+=(direction[1]*this.#velocity)
            this.#position[2]+=(direction[2]*this.#velocity)
        }
        
        if((this.#arrowKeysDown & (ARROW_KEYS.LEFT_AND_RIGHT)) >0) {
            if((this.#arrowKeysDown & ARROW_KEYS.RIGHT) === ARROW_KEYS.RIGHT) {
                this.#angle+=0.03;
                if(this.#angle > Math.PI)
                    this.#angle=-Math.PI-(this.#angle%Math.PI)
            }
            if((this.#arrowKeysDown & ARROW_KEYS.LEFT) === ARROW_KEYS.LEFT) {
                this.#angle-=0.03;
                if(this.#angle < -Math.PI)
                    this.#angle=Math.PI-(this.#angle%Math.PI)
            }
            this.camera.updateDirection(direction => {
                direction[0]=Math.cos(this.#angle);
                direction[1]=0;
                direction[2]=Math.sin(this.#angle);
            });
        }
        return !this.#busy;
    }
    #busy=false;
    async calculateCameraPositionAndTarget() {
        this.#busy=true;
        //TODO: apply gravity alwaus not only on input
        //this.#position[1]-=0.3

        const scaledPosition=engine.collider.scaledPosition;
        scaledPosition[0] = this.camera.position[0] / engine.collider.radius[0];
        scaledPosition[1] = this.camera.position[1] / engine.collider.radius[1];
        scaledPosition[2] = this.camera.position[2] / engine.collider.radius[2];
        const scaledVelocity=engine.collider.scaledVelocity;
        scaledVelocity[0] = (this.#position[0] - this.camera.position[0]) / engine.collider.radius[0];
        scaledVelocity[1] = (this.#position[1] - this.camera.position[1]) / engine.collider.radius[1];
        scaledVelocity[2] = (this.#position[2] - this.camera.position[2]) / engine.collider.radius[2];


        engine.collider.collidedMesh = undefined;
        engine.collider._retry = 0;

        await engine.collideWithWorld();

        engine.collider.finalPosition[0] *= engine.collider.radius[0]
        engine.collider.finalPosition[1] *= engine.collider.radius[1]
        engine.collider.finalPosition[2] *= engine.collider.radius[2]
        //run the callback
        // if (!this.engine.collider.collidedMesh) {
        if (engine.collider.collision_not_found) {
            //this._position.copyFrom(position);
            if (this.camera.position[0] != engine.collider.finalPosition[0] || this.camera.position[1] != engine.collider.finalPosition[1] || this.camera.position[2] != engine.collider.finalPosition[2]) {      
                this.camera.position=engine.collider.finalPosition;
                this.#position=engine.collider.finalPosition;
            }
        }
        this.#busy=false;
    }
}
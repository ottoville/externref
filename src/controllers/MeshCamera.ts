import { TerraVector3 } from "../Math.js";
import type { TerraCamera } from "../TerraCamera.js";
import type { CameraController } from "./CameraController.js";
import type { Engine } from "../engine";
import { MainNode } from "../MainNode.js";
declare const engine:Engine;

const enum ARROW_KEYS  {
    UP = 1,
    RIGHT = 2,
    DOWN = 4,
    LEFT = 8,
    LEFT_AND_RIGHT = ARROW_KEYS.RIGHT|ARROW_KEYS.LEFT
}

export class MeshCamera implements CameraController {
    name='PositionCamera';
    #angle=Math.PI;
    #acceleration=10;
    #arrowKeysDown=0;
    #mesh: MainNode;
    constructor(private camera: TerraCamera, initial=false) {
        const mesh=[...MainNode.Meshes.values()].find(m => m.label==='human');
        if(!mesh)
            throw new Error('Mesh not found');
        this.#mesh = mesh;
        const syncCamera = () => {
            //this.camera.position=this.#position;
            this.camera.updateDirection(direction => {
                direction[0]=Math.cos(this.#angle);
                direction[1]=0;
                direction[2]=Math.sin(this.#angle);
            });
        }
        if(initial) {
            engine.DB.transaction("save").objectStore("save").get(["camera", "MeshCamera"]).onsuccess = evt => {
                if ((evt.target as IDBRequest).result) {
                    const restored = ((evt.target as IDBRequest).result as {
                        data: {
                            position:[number,number,number],
                            angle:number
                        }
                     });
                     //this.#position.set(restored.data.position);
                     this.#angle=restored.data.angle;
                     syncCamera();
                }
            }
        } else {
            //this.#position.set(this.camera.position as TerraVector3);
            this.#angle=Math.acos(this.camera.direction[0]);
        }
        //syncCamera();
        engine.collider.radius[0] = 0.5;
        engine.collider.radius[1] = 2;
        engine.collider.radius[2] = 0.5;
        this.enable();
    }
    disable() {
        document.removeEventListener('keydown', this.#keydownfunction);
        document.removeEventListener('keyup', this.#keyupfunction);
    }
    enable() {
        console.log('enable mesh camera');
        document.addEventListener('keydown', this.#keydownfunction);
        document.addEventListener('keyup', this.#keyupfunction);
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
        this.disable();
    }
    lastTranslation=new TerraVector3();
    checkInputs() {
        const translation = this.#mesh.translation;

        if(this.lastTranslation[1] === translation[1] && this.#arrowKeysDown === 0)
            return false;
        const translationDelta = this.#mesh.velocity;

        if((this.#arrowKeysDown & ARROW_KEYS.UP) === ARROW_KEYS.UP) {
            const direction=this.camera.direction;
            this.#mesh.force[0]-=(direction[0]*this.#acceleration)
            this.#mesh.force[2]-=(direction[2]*this.#acceleration)
        }
        if((this.#arrowKeysDown & ARROW_KEYS.DOWN) === ARROW_KEYS.DOWN) {
            const direction=this.camera.direction;
            this.#mesh.force[0]+=(direction[0]*this.#acceleration)
            this.#mesh.force[2]+=(direction[2]*this.#acceleration)
        }
        const walkingSpeed = 1.4
        //Limit speed to 1
        //TODO
        const length=Math.sqrt(translationDelta[0]*translationDelta[0] /*+ translationDelta[1]*translationDelta[1]*/ + translationDelta[2]*translationDelta[2])
        if(length>walkingSpeed) {
            //@ts-ignore
            const scale = walkingSpeed/length;
            /*this.#mesh.velocity=[
                translationDelta[0] * scale,
                translationDelta[1],
                translationDelta[2] * scale
            ]*/
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
}
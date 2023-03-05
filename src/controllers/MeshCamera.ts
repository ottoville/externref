import { TerraVector3 } from "../Math.js";
import type { TerraCamera } from "../TerraCamera.js";
import type { Engine, ListenerObj } from "../engine";
import { CameraController } from "./CameraController.js";
import { Anchor, NumericUnit, UIRectangle } from "../ui/UIRectangle.js";
import { UIRectangleBackground } from "../ui/UIRectangleBackground.js";
declare const engine: Engine;

export const enum ARROW_KEYS {
    UP = 1,
    RIGHT = 2,
    DOWN = 4,
    LEFT = 8,
    UP_RIGHT = ARROW_KEYS.UP | ARROW_KEYS.RIGHT,
    UP_LEFT = ARROW_KEYS.UP | ARROW_KEYS.LEFT,
    DOWN_RIGHT = ARROW_KEYS.DOWN | ARROW_KEYS.RIGHT,
    DOWN_LEFT = ARROW_KEYS.DOWN | ARROW_KEYS.LEFT,
}

const cursorBitmap: Promise<ImageBitmap> = typeof globalThis.createImageBitmap !== 'undefined' ? fetch('/assets/cursor.webp').then(asset => asset.blob()).then(createImageBitmap) : Promise.resolve<ImageBitmap>({} as ImageBitmap);
export class MeshCamera extends CameraController {
    name = 'PositionCamera';
    angle = Math.PI;
    verticalAngle = Math.PI * 0.5;
    arrowKeysDown = 0;
    pointerMovement = { x: 0, y: 0 };
    cursor: UIRectangle | undefined = undefined;
    constructor(public camera: TerraCamera, initial = false) {
        super();
        if (initial && engine.DB) {
            engine.DB.transaction("save").objectStore("save").get(["camera", "MeshCamera"]).onsuccess = evt => {
                if ((evt.target as IDBRequest).result) {
                    const restored = ((evt.target as IDBRequest).result as {
                        data: {
                            position: [number, number, number],
                            angle: number
                        }
                    });
                    //this.#position.set(restored.data.position);
                    this.angle = restored.data.angle;
                    this.cameraControl?.updateDirection(direction => {
                        direction[0] = Math.cos(this.angle);
                        direction[1] = 0;
                        direction[2] = Math.sin(this.angle);
                    });
                }
            }
        } else {
            //this.#position.set(this.camera.position as TerraVector3);
            this.angle = Math.acos(this.camera.direction[0]);
        }
    }
    calculateCameraPositionAndTarget() {
        // TODO
    }
    checkInputs() {
        //TODO
        return true;
    }
    startTooling(): void {
        return undefined
    }
    stopTooling(): void {
        return undefined
    }
    deAttachCameraController() {
        document.exitPointerLock();
        engine.clearInputListeners(this);
        this.cursor?.destroy();
        this.camera.gpu?.renderPassCanvas.onResize.delete(this)

    }
    attachCameraController() {
        const gpu = this.camera.gpu;
        if (gpu) {
            cursorBitmap.then(bitmap => {
                this.cursor = new UIRectangleBackground({
                    canvaspipeline: gpu.UIPipeline,
                    renderPass: gpu.renderPassCanvas,
                    label: 'cursor',
                    borderSize: {
                        width: [0],
                        height: 'auto',
                    },
                    scale: { min_width: 0.01, y: 0.01, unit: NumericUnit["%"] },
                    translate: {
                        x: {
                            value: [0],
                            anchor: Anchor.CENTER
                        }, y: {
                            value: [0],
                            anchor: Anchor.CENTER
                        }
                    },
                    originalAspectRatio: 1,
                }, {
                    texture: bitmap,
                    border_width: 0,
                    border_height: 0
                })
            }).catch(err => {
                engine.showError(err);
            });
        }
        this.#lockPointer();
        engine.addInputListener(this.#lockPointerListener);
        engine.addInputListener(this.#keydownfunction);
        engine.addInputListener(this.#keyupfunction);
        engine.addInputListener(this.#pointerMoveFunction);
    }
    updateMouseCoords = () => {
        const gpu = this.camera.gpu
        if (gpu) {
            Atomics.store(gpu.mousePosition, 0, gpu.renderPassCanvas.size.width * 0.5)
            Atomics.store(gpu.mousePosition, 1, gpu.renderPassCanvas.size.height * 0.5)
            Atomics.notify(new Int32Array(gpu.mousePositionBuffer), 0);
        }
    }
    #lockPointer = () => {
        if (document.pointerLockElement)
            return;
        (document.body.requestPointerLock() as unknown as Promise<void>).then(() => {
            const gpu = this.camera.gpu
            if (gpu) {
                this.updateMouseCoords();
                gpu.renderPassCanvas.onResize.set(this, this.updateMouseCoords)
            }
        }).catch(err => {
            engine.showError(err);
        });
    }
    #lockPointerListener: ListenerObj<'pointerdown'> = {
        object: this,
        type: 'pointerdown',
        cb: () => {
            this.#lockPointer()
        }
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
    #keydownfunction: ListenerObj<'keydown'> = {
        object: this,
        type: 'keydown',
        cb: (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                this.arrowKeysDown |= ARROW_KEYS.UP;
            }
            else if (e.key === 'ArrowDown') {
                this.arrowKeysDown |= ARROW_KEYS.DOWN;
            }
            if (e.key === 'ArrowLeft') {
                this.arrowKeysDown |= ARROW_KEYS.LEFT;
            }
            else if (e.key === 'ArrowRight') {
                this.arrowKeysDown |= ARROW_KEYS.RIGHT;
            }
        }
    }
    #pointerMoveFunction: ListenerObj<'pointermove'> = {
        object: this,
        type: 'pointermove',
        options: {
            force: true
        },
        cb: (e: PointerEvent) => {
            this.pointerMovement = { x: e.movementX, y: e.movementY }
        }
    }
    #keyupfunction: ListenerObj<'keyup'> = {
        object: this,
        type: 'keyup',
        cb: (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                this.arrowKeysDown &= ~ARROW_KEYS.UP;
                //  this.#mesh.grip=0;
            }
            else if (e.key === 'ArrowDown') {
                this.arrowKeysDown &= ~ARROW_KEYS.DOWN;
            }
            if (e.key === 'ArrowLeft') {
                this.arrowKeysDown &= ~ARROW_KEYS.LEFT;
            }
            else if (e.key === 'ArrowRight') {
                this.arrowKeysDown &= ~ARROW_KEYS.RIGHT;
            }
        }
    }
    lastTranslation = new TerraVector3();
}
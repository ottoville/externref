import { MutableTerraVector3 } from "../Math.js";
import type { TerraCamera } from "../TerraCamera.js";
import type { Engine, ListenerObj } from "../engine";
import { ARROW_KEYS, CameraController } from "./CameraController.js";
import { Anchor, NumericUnit, UIRectangle } from "../ui/UIRectangle.js";
import { UIRectangleBackground } from "../ui/UIRectangleBackground.js";
declare const engine: Engine;

const cursorBitmap: Promise<ImageBitmap> = typeof globalThis.createImageBitmap !== 'undefined' ? fetch('/assets/cursor.webp').then(asset => asset.blob()).then(createImageBitmap) : Promise.resolve<ImageBitmap>({} as ImageBitmap);
export class MeshCamera extends CameraController {
    name = 'PositionCamera';
    angle = Math.PI;
    verticalAngle = Math.PI * 0.5;
    arrowKeysDown = 0;
    pointerMovement = { x: 0, y: 0 };
    cursor: UIRectangle | undefined = undefined;
    constructor(public camera: TerraCamera) {
        super();
        this.angle = Math.acos(this.camera.direction[0]);
    }
    calculateCameraPositionAndTarget() {
        // TODO
    }
    checkInputs() {
        //TODO
        return true;
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
        (engine.canvas!.requestPointerLock() as unknown as Promise<void>).then(() => {
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

    serialize = () => {
        return;
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
    lastTranslation = new MutableTerraVector3();
}
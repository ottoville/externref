import { Sun } from "./sun.js";
import { Plants } from "../plants/Plants.js";
import { PlantsUI } from "../tools/plantsUI.js";
import { Zones } from "../tools/zones.js";
import { CameraTAB } from "../tools/camera.js";
import { BuildingsUI } from "../tools/buildings.js";
import { TerrainTool } from "../tools/Terrain.js";
import { Terrain } from "./terrain.js";

import type { TerraMesh } from "../TerraMesh.js";

import type { loginProvider, DotNet, savedCamera } from "../types/interfaces/index.js";
import { Scene } from "../lib/babylon/scene.js";
import type { PickingInfo } from "../lib/babylon/Collisions/pickingInfo.js";
import type { Camera } from "../lib/babylon/Cameras/camera.js";
import { AbstractActionManager } from "../lib/babylon/Actions/abstractActionManager.js";
import type { Observable } from "../lib/babylon/Misc/observable.js";
import type { PointerInfoPre, PointerInfo } from "../lib/babylon/Events/pointerEvents.js";
import { PointerEventTypes } from "../lib/babylon/Events/pointerEvents.js";
import { Constants } from "../lib/babylon/Engines/constants.js";
import type { AbstractMesh } from "../lib/babylon/Meshes/abstractMesh.js";
import { Ray } from "../lib/babylon/Culling/ray.js";
import type { TrianglePickingPredicate } from "../lib/babylon/Culling/ray.js";
import { ActionEvent } from "../lib/babylon/Actions/actionEvent.js";
import { KeyboardInfo, KeyboardEventTypes, KeyboardInfoPre } from "../lib/babylon/Events/keyboardEvents.js";
import { Engine } from "../lib/babylon/Engines/engine.js";
import { PointLight } from "../lib/babylon/Lights/pointLight.js";
import { ShaderMaterial } from "../lib/babylon/Materials/shaderMaterial.js";
import { Texture } from "../lib/babylon/Materials/Textures/texture.js";
import { Matrix } from "../lib/babylon/Maths/math.js";
import { DefaultCollisionCoordinator } from '../lib/babylon/Collisions/collisionCoordinator.js';
import { StandardMaterial } from "../lib/babylon/Materials/standardMaterial.js";
import { Sea } from "./water.js";
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine.js";
import { InternalTexture, InternalTextureSource } from "../lib/babylon/Materials/Textures/internalTexture.js";
import { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import { LazyEval } from "../LazyEval.js";
import { UITABClassLike, UITAB } from "../UITAB.js";
import { GPUScene } from "../GPUScene.js";


Scene.CollisionCoordinatorFactory = () => {
    return new DefaultCollisionCoordinator();
};

/*Scene.DefaultMaterialFactory = (scene: Scene) => {
    return new StandardMaterial("default material", scene);
};*/

//import { UI } from "../UI.js";
class _ClickInfo {
    private _singleClick = false;
    private _doubleClick = false;
    private _hasSwiped = false;
    private _ignore = false;

    public get singleClick(): boolean {
        return this._singleClick;
    }
    public get doubleClick(): boolean {
        return this._doubleClick;
    }
    public get hasSwiped(): boolean {
        return this._hasSwiped;
    }
    public get ignore(): boolean {
        return this._ignore;
    }

    public set singleClick(b: boolean) {
        this._singleClick = b;
    }
    public set doubleClick(b: boolean) {
        this._doubleClick = b;
    }
    public set hasSwiped(b: boolean) {
        this._hasSwiped = b;
    }
    public set ignore(b: boolean) {
        this._ignore = b;
    }
}
export class WorldScene extends Scene {
    terrainInited: Promise<[Terrain, Promise<GPUBuffer>]>;
    camera: ArcRotateCamera;
    camera2: ArcRotateCamera;
    sea: Sea;
    //@ts-ignore
    plants: Plants;
    #groundP: Promise<SharedArrayBuffer>;
    DBP: Promise<EarthDatabase>;
    createPickingRayToRef(x: number, y: number, world: Matrix, result: Ray, camera: Nullable<Camera>, cameraViewSpace = false): Scene {

        var engine = this.getEngine();

        if (!camera) {
            if (!this.activeCamera) {
                return this;
            }

            camera = this.activeCamera;
        }

        var cameraViewport = camera.viewport;
        var viewport = cameraViewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());

        // Moving coordinates to local viewport world
        x = x / engine.getHardwareScalingLevel() - viewport.x;
        y = y / engine.getHardwareScalingLevel() - (engine.getRenderHeight() - viewport.y - viewport.height);

        result.update(x, y, viewport.width, viewport.height, world ? world : Matrix.IdentityReadOnly, cameraViewSpace ? Matrix.IdentityReadOnly : camera.getViewMatrix(), camera.getProjectionMatrix());
        return this;
    }
    /* This is same as babylonjs _internalPick but with promise */
    collissionCheck(rayFunction: (world: Matrix) => Ray, meshIndex: number, pickResult: PickingInfo | null, fastCheck?: boolean, predicate?: (mesh: AbstractMesh) => boolean): Promise<PickingInfo | null> {
        if (meshIndex > this.meshes.length - 1)
            return new Promise(res => res(pickResult));
        let mesh = this.meshes[meshIndex] as TerraMesh | Mesh;

        if (predicate) {
            if (!predicate(mesh))
                return this.collissionCheck(rayFunction, ++meshIndex, pickResult, fastCheck, predicate);
        } else if (!mesh.isEnabled() || !mesh.isVisible || !mesh.isPickable)
            return this.collissionCheck(rayFunction, ++meshIndex, pickResult, fastCheck, predicate);
        return new Promise((res: (pi: PickingInfo) => void) => {
            var world = mesh.getWorldMatrix();
            var ray = rayFunction(world);
            if (typeof ((mesh as TerraMesh).intersectsPromise) !== 'undefined')
                (mesh as TerraMesh).intersectsPromise(ray, fastCheck).then(res);
            else
                res(mesh.intersects(ray, fastCheck));
        }).then((result: PickingInfo) => {
            if (!result || !result.hit)
                return this.collissionCheck(rayFunction, ++meshIndex, pickResult, fastCheck, predicate);
            if (!fastCheck && pickResult != null && result.distance >= pickResult.distance)
                return this.collissionCheck(rayFunction, ++meshIndex, pickResult, fastCheck, predicate);
            pickResult = result;
            if (fastCheck)
                return result;
            else
                return this.collissionCheck(rayFunction, ++meshIndex, pickResult);
        });
    }
    pickPromise(x: number, y: number, predicate?: (mesh: AbstractMesh) => boolean, fastCheck?: boolean, camera?: Nullable<Camera>,
        trianglePredicate?: TrianglePickingPredicate): Promise<PickingInfo | null> {

        let rayFunction = (world: Matrix) => {
            if (!this._tempPickingRay) {
                this._tempPickingRay = Ray.Zero();
            }

            this.createPickingRayToRef(x, y, world, this._tempPickingRay, this.cameraToUseForPointers || null);
            return this._tempPickingRay;
        };
        return this.collissionCheck(rayFunction, 0, null, fastCheck, predicate).then((pickResult: PickingInfo | null) => {
            /* _internalPick ends */
            if (pickResult) {
                pickResult.ray = Ray.Zero();
                this.createPickingRayToRef(x, y, Matrix.Identity(), pickResult.ray, this.cameraToUseForPointers || null, false)
            }
            return pickResult;
        });
    }

    private gameSpeed = BigInt(0);
    private lastStateChangeGameTime = BigInt(21600 * 1000); //6 hours
    private lastStateChangeTime = new Date().getTime();
    /*public getGameTime(): bigint {
        if (this.gameSpeed < 0)
            return this.lastStateChangeGameTime;
        let interval = new Date().getTime() - this.lastStateChangeTime;
        return this.lastStateChangeGameTime + (BigInt(interval * 60) << this.gameSpeed);
    }*/
    public SunObject: Sun;
    public stateChange(data: number) {
        if (this.webSocket) {
            this.webSocket.send(JSON.stringify({ action: 'stateChange', data }))
            return;
            /* this.lastStateChangeGameTime = this.getGameTime();
             this.lastStateChangeTime = new Date().getTime();
             this.gameSpeed = BigInt((<HTMLInputElement>evt.target).value);*/
            let gameStateEvent = {
                speed: Number(this.gameSpeed),
                lastStateChangeGameTime: Number(this.lastStateChangeGameTime),
                lastStateChangeTime: this.lastStateChangeTime
            };
        }
        //gameEngine.message(WorkerReturn.Promise, 'stateChange', gameStateEvent);
    };
    
    

    public tools: Map<string, UITABClassLike> = new Map();

    public attachControl(attachUp = true, attachDown = true, attachMove = true, elementToAttachTo: Nullable<HTMLElement> = null): void {
        //this._inputManager.attachControl(attachUp, attachDown, attachMove);
        let DoubleClickDelay = 300;
        let ExclusiveDoubleClickMode = false;
        let engine = this.getEngine();
        const scene = this;
        const inputmanager = this._inputManager;
        //(function (scene: WorldScene, elementToAttachTo: Nullable<HTMLElement> = null) {
            if (!elementToAttachTo) {
                elementToAttachTo = engine.getInputElement();
            }

            if (!elementToAttachTo) {
                return;
        }
        //@ts-ignore
        inputmanager._initActionManager = (act: Nullable<AbstractActionManager>, clickInfo: _ClickInfo): Nullable<AbstractActionManager> => {
            if (!inputmanager._meshPickProceed) {
                let pickResult = scene.pick(inputmanager._unTranslatedPointerX, inputmanager._unTranslatedPointerY, scene.pointerDownPredicate, false, scene.cameraToUseForPointers);
                inputmanager._currentPickResult = pickResult;
                    if (pickResult) {
                        act = (pickResult.hit && pickResult.pickedMesh) ? pickResult.pickedMesh._getActionManagerForTrigger() : null;
                    }
                inputmanager._meshPickProceed = true;
                }
                return act;
        };
        //@ts-ignore
        inputmanager._delayedSimpleClick = (btn: number, clickInfo: _ClickInfo, cb: (clickInfo: _ClickInfo, pickResult: Nullable<PickingInfo>) => void) => {
                // double click delay is over and that no double click has been raised since, or the 2 consecutive keys pressed are different
            if ((Date.now() - inputmanager._previousStartingPointerTime > DoubleClickDelay && !inputmanager._doubleClickOccured) ||
                btn !== inputmanager._previousButtonPressed) {
                inputmanager._doubleClickOccured = false;
                    clickInfo.singleClick = true;
                    clickInfo.ignore = false;
                cb(clickInfo, inputmanager._currentPickResult);
                }
            };
        //@ts-ignore
        inputmanager._initClickEvent = (obs1: Observable<PointerInfoPre>, obs2: Observable<PointerInfo>, evt: PointerEvent, cb: (clickInfo: _ClickInfo, pickResult: Nullable<PickingInfo>) => void): void => {
                let clickInfo = new _ClickInfo();
            inputmanager._currentPickResult = null;
                let act: Nullable<AbstractActionManager> = null;

                let checkPicking = obs1.hasSpecificMask(PointerEventTypes.POINTERPICK) || obs2.hasSpecificMask(PointerEventTypes.POINTERPICK)
                    || obs1.hasSpecificMask(PointerEventTypes.POINTERTAP) || obs2.hasSpecificMask(PointerEventTypes.POINTERTAP)
                    || obs1.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP) || obs2.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP);
            if (!checkPicking && AbstractActionManager) {
                    //@ts-ignore
                    act = inputmanager._initActionManager(act, clickInfo);
                    if (act) {
                        checkPicking = act.hasPickTriggers;
                    }
                }

                let needToIgnoreNext = false;

                if (checkPicking) {
                    let btn = evt.button;
                    clickInfo.hasSwiped = inputmanager._isPointerSwiping();

                    if (!clickInfo.hasSwiped) {
                        let checkSingleClickImmediately = !ExclusiveDoubleClickMode;

                        if (!checkSingleClickImmediately) {
                            checkSingleClickImmediately = !obs1.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP) &&
                                !obs2.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP);

                            if (checkSingleClickImmediately && !AbstractActionManager.HasSpecificTrigger(Constants.ACTION_OnDoublePickTrigger)) {
                                //@ts-ignore
                                act = inputmanager._initActionManager(act, clickInfo);
                                if (act) {
                                    checkSingleClickImmediately = !act.hasSpecificTrigger(Constants.ACTION_OnDoublePickTrigger);
                                }
                            }
                        }

                        if (checkSingleClickImmediately) {
                            // single click detected if double click delay is over or two different successive keys pressed without exclusive double click or no double click required
                            if (Date.now() - inputmanager._previousStartingPointerTime > DoubleClickDelay ||
                                btn !== inputmanager._previousButtonPressed) {
                                clickInfo.singleClick = true;
                                cb(clickInfo, inputmanager._currentPickResult);
                                needToIgnoreNext = true;
                            }
                        }
                        // at least one double click is required to be check and exclusive double click is enabled
                        else {
                            // wait that no double click has been raised during the double click delay
                            inputmanager._previousDelayedSimpleClickTimeout = inputmanager._delayedSimpleClickTimeout;
                            //@ts-ignore
                            inputmanager._delayedSimpleClickTimeout = window.setTimeout(inputmanager._delayedSimpleClick.bind(inputmanager, btn, clickInfo, cb), DoubleClickDelay);
                        }

                        let checkDoubleClick = obs1.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP) ||
                            obs2.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP);
                        if (!checkDoubleClick && AbstractActionManager.HasSpecificTrigger(Constants.ACTION_OnDoublePickTrigger)) {
                            //@ts-ignore
                            act = inputmanager._initActionManager(act, clickInfo);
                            if (act) {
                                checkDoubleClick = act.hasSpecificTrigger(Constants.ACTION_OnDoublePickTrigger);
                            }
                        }
                        if (checkDoubleClick) {
                            // two successive keys pressed are equal, double click delay is not over and double click has not just occurred
                            if (btn === inputmanager._previousButtonPressed &&
                                Date.now() - inputmanager._previousStartingPointerTime < DoubleClickDelay &&
                                !inputmanager._doubleClickOccured
                            ) {
                                // pointer has not moved for 2 clicks, it's a double click
                                if (!clickInfo.hasSwiped &&
                                    !inputmanager._isPointerSwiping()) {
                                    inputmanager._previousStartingPointerTime = 0;
                                    inputmanager._doubleClickOccured = true;
                                    clickInfo.doubleClick = true;
                                    clickInfo.ignore = false;
                                    if (ExclusiveDoubleClickMode && inputmanager._previousDelayedSimpleClickTimeout) {
                                        clearTimeout(inputmanager._previousDelayedSimpleClickTimeout);
                                    }
                                    inputmanager._previousDelayedSimpleClickTimeout = inputmanager._delayedSimpleClickTimeout;
                                    cb(clickInfo, inputmanager._currentPickResult);
                                }
                                // if the two successive clicks are too far, it's just two simple clicks
                                else {
                                    inputmanager._doubleClickOccured = false;
                                    inputmanager._previousStartingPointerTime = inputmanager._startingPointerTime;
                                    inputmanager._previousStartingPointerPosition.x = inputmanager._startingPointerPosition.x;
                                    inputmanager._previousStartingPointerPosition.y = inputmanager._startingPointerPosition.y;
                                    inputmanager._previousButtonPressed = btn;
                                    if (ExclusiveDoubleClickMode) {
                                        if (inputmanager._previousDelayedSimpleClickTimeout) {
                                            clearTimeout(inputmanager._previousDelayedSimpleClickTimeout);
                                        }
                                        inputmanager._previousDelayedSimpleClickTimeout = inputmanager._delayedSimpleClickTimeout;

                                        cb(clickInfo, inputmanager._previousPickResult);
                                    }
                                    else {
                                        cb(clickInfo, inputmanager._currentPickResult);
                                    }
                                }
                                needToIgnoreNext = true;
                            }
                            // just the first click of the double has been raised
                            else {
                                inputmanager._doubleClickOccured = false;
                                inputmanager._previousStartingPointerTime = inputmanager._startingPointerTime;
                                inputmanager._previousStartingPointerPosition.x = inputmanager._startingPointerPosition.x;
                                inputmanager._previousStartingPointerPosition.y = inputmanager._startingPointerPosition.y;
                                inputmanager._previousButtonPressed = btn;
                            }
                        }
                    }
                }

                if (!needToIgnoreNext) {
                    cb(clickInfo, inputmanager._currentPickResult);
                }
            };

        inputmanager._onPointerMove = (evt: PointerEvent) => {

                inputmanager._updatePointerPosition(evt);

                // PreObservable support
            if (inputmanager._checkPrePointerObservable(null, evt, evt.type === inputmanager._wheelEventName ? PointerEventTypes.POINTERWHEEL : PointerEventTypes.POINTERMOVE)) {
                    return;
                }

                if (!scene.cameraToUseForPointers && !scene.activeCamera) {
                    return;
                }

                if (!scene.pointerMovePredicate) {
                    scene.pointerMovePredicate = (mesh: AbstractMesh): boolean => (mesh.isPickable && mesh.isVisible && mesh.isReady() && mesh.isEnabled() && (mesh.enablePointerMoveEvents || scene.constantlyUpdateMeshUnderPointer || (mesh._getActionManagerForTrigger() != null)) && (!scene.cameraToUseForPointers || (scene.cameraToUseForPointers.layerMask & mesh.layerMask) !== 0));
                }

                // Meshes
            var pickResult = scene.pick(inputmanager._unTranslatedPointerX, inputmanager._unTranslatedPointerY, scene.pointerMovePredicate, false, scene.cameraToUseForPointers);

            inputmanager._processPointerMove(pickResult, evt);
            };

        inputmanager._onPointerDown = (evt: PointerEvent) => {
                inputmanager._totalPointersPressed++;
                inputmanager._pickedDownMesh = null;
                inputmanager._meshPickProceed = false;

            inputmanager._updatePointerPosition(evt);

                if (scene.preventDefaultOnPointerDown && elementToAttachTo) {
                    evt.preventDefault();
                    elementToAttachTo.focus();
                }

            inputmanager._startingPointerPosition.x = inputmanager._pointerX;
            inputmanager._startingPointerPosition.y = inputmanager._pointerY;
            inputmanager._startingPointerTime = Date.now();

                // PreObservable support
            if (inputmanager._checkPrePointerObservable(null, evt, PointerEventTypes.POINTERDOWN)) {
                    return;
                }

                if (!scene.cameraToUseForPointers && !scene.activeCamera) {
                    return;
                }

            inputmanager._pointerCaptures[evt.pointerId] = true;

                if (!scene.pointerDownPredicate) {
                    scene.pointerDownPredicate = (mesh: AbstractMesh): boolean => {
                        return mesh.isPickable && mesh.isVisible && mesh.isReady() && mesh.isEnabled() && (!scene.cameraToUseForPointers || (scene.cameraToUseForPointers.layerMask & mesh.layerMask) !== 0);
                    };
                }

                // Meshes
            inputmanager._pickedDownMesh = null;
            scene.pickPromise(inputmanager._unTranslatedPointerX, inputmanager._unTranslatedPointerY, scene.pointerDownPredicate, false, scene.cameraToUseForPointers).then(pickResult => {
                    if (pickResult)
                        inputmanager._processPointerDown(pickResult, evt);
                });
            };

        inputmanager._onPointerUp = (evt: PointerEvent) => {
            if (inputmanager._totalPointersPressed === 0) {  // We are attaching the pointer up to windows because of a bug in FF
                    return;                             // So we need to test it the pointer down was pressed before.
                }

            inputmanager._totalPointersPressed--;
            inputmanager._pickedUpMesh = null;
            inputmanager._meshPickProceed = false;

            inputmanager._updatePointerPosition(evt);

                if (scene.preventDefaultOnPointerUp && elementToAttachTo) {
                    evt.preventDefault();
                    elementToAttachTo.focus();
                }
            //@ts-ignore
            inputmanager._initClickEvent(scene.onPrePointerObservable, scene.onPointerObservable, evt, (clickInfo: _ClickInfo, pickResult: Nullable<PickingInfo>) => {
                    // PreObservable support
                    if (scene.onPrePointerObservable.hasObservers()) {
                        if (!clickInfo.ignore) {
                            if (!clickInfo.hasSwiped) {
                                if (clickInfo.singleClick && scene.onPrePointerObservable.hasSpecificMask(PointerEventTypes.POINTERTAP)) {
                                    if (inputmanager._checkPrePointerObservable(null, evt, PointerEventTypes.POINTERTAP)) {
                                        return;
                                    }
                                }
                                if (clickInfo.doubleClick && scene.onPrePointerObservable.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP)) {
                                    if (inputmanager._checkPrePointerObservable(null, evt, PointerEventTypes.POINTERDOUBLETAP)) {
                                        return;
                                    }
                                }
                            }
                            if (inputmanager._checkPrePointerObservable(null, evt, PointerEventTypes.POINTERUP)) {
                                return;
                            }
                        }
                    }

                if (!inputmanager._pointerCaptures[evt.pointerId]) {
                        return;
                    }

                inputmanager._pointerCaptures[evt.pointerId] = false;
                    if (!scene.cameraToUseForPointers && !scene.activeCamera) {
                        return;
                    }

                    if (!scene.pointerUpPredicate) {
                        scene.pointerUpPredicate = (mesh: AbstractMesh): boolean => {
                            return mesh.isPickable && mesh.isVisible && mesh.isReady() && mesh.isEnabled() && (!scene.cameraToUseForPointers || (scene.cameraToUseForPointers.layerMask & mesh.layerMask) !== 0);
                        };
                    }

                    // Meshes
                if (!inputmanager._meshPickProceed && (AbstractActionManager && AbstractActionManager.HasTriggers || scene.onPointerObservable.hasObservers())) {
                    //@ts-ignore
                    inputmanager._initActionManager(null, clickInfo);
                    }
                    if (!pickResult) {
                        pickResult = inputmanager._currentPickResult;
                    }
                //@ts-ignore
                inputmanager._processPointerUp(pickResult, evt, clickInfo);

                inputmanager._previousPickResult = inputmanager._currentPickResult;
                });
            };

        inputmanager._onKeyDown = (evt: KeyboardEvent) => {
                let type = KeyboardEventTypes.KEYDOWN;
                if (scene.onPreKeyboardObservable.hasObservers()) {
                    let pi = new KeyboardInfoPre(type, evt);
                    scene.onPreKeyboardObservable.notifyObservers(pi, type);
                    if (pi.skipOnPointerObservable) {
                        return;
                    }
                }

                if (scene.onKeyboardObservable.hasObservers()) {
                    let pi = new KeyboardInfo(type, evt);
                    scene.onKeyboardObservable.notifyObservers(pi, type);
                }

                if (scene.actionManager) {
                    scene.actionManager.processTrigger(Constants.ACTION_OnKeyDownTrigger, ActionEvent.CreateNewFromScene(scene, evt));
                }
            };

        inputmanager._onKeyUp = (evt: KeyboardEvent) => {
                let type = KeyboardEventTypes.KEYUP;
                if (scene.onPreKeyboardObservable.hasObservers()) {
                    let pi = new KeyboardInfoPre(type, evt);
                    scene.onPreKeyboardObservable.notifyObservers(pi, type);
                    if (pi.skipOnPointerObservable) {
                        return;
                    }
                }

                if (scene.onKeyboardObservable.hasObservers()) {
                    let pi = new KeyboardInfo(type, evt);
                    scene.onKeyboardObservable.notifyObservers(pi, type);
                }

                if (scene.actionManager) {
                    scene.actionManager.processTrigger(Constants.ACTION_OnKeyUpTrigger, ActionEvent.CreateNewFromScene(scene, evt));
                }
            };

            // Keyboard events
        inputmanager._onCanvasFocusObserver = engine.onCanvasFocusObservable.add((() => {
                let fn = () => {
                    if (!elementToAttachTo) {
                        return;
                    }
                    elementToAttachTo.addEventListener("keydown", inputmanager._onKeyDown, false);
                    elementToAttachTo.addEventListener("keyup", inputmanager._onKeyUp, false);
                };
                if (document.activeElement === elementToAttachTo) {
                    fn();
                }
                return fn;
            })());

        inputmanager._onCanvasBlurObserver = engine.onCanvasBlurObservable.add(() => {
                if (!elementToAttachTo) {
                    return;
                }
            elementToAttachTo.removeEventListener("keydown", inputmanager._onKeyDown);
            elementToAttachTo.removeEventListener("keyup", inputmanager._onKeyUp);
            });

            // Pointer events

            if (attachMove) {
                elementToAttachTo.addEventListener("pointermove", <any>inputmanager._onPointerMove, false);

                // Wheel
                inputmanager._wheelEventName = "onwheel" in document.createElement("div") ? "wheel" :       // Modern browsers support "wheel"
                    (<any>document).onmousewheel !== undefined ? "mousewheel" :                     // Webkit and IE support at least "mousewheel"
                        "DOMMouseScroll";                                                           // let's assume that remaining browsers are older Firefox

                elementToAttachTo.addEventListener(inputmanager._wheelEventName, <any>inputmanager._onPointerMove, false);
            }
            if (attachDown) {
                elementToAttachTo.addEventListener("pointerdown", <any>inputmanager._onPointerDown, false);
            }

            if (attachUp) {
                //@ts-ignore
                let hostWindow = scene.getEngine().getHostWindow();
                if (hostWindow) {
                    hostWindow.addEventListener("pointerup", <any>inputmanager._onPointerUp, false);
                }
            }

    //    }).bind(this._inputManager)(this, elementToAttachTo);
    }
    public terrainReady: Promise<void>;
    public uniformBindGroupLayout = this.device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                type: 'uniform-buffer'
            }
        ]
    })
    #uniformBindGroup: GPUBindGroup;
    constructor(
        engine: Engine | WebGPUEngine,
        userinfo: loginProvider,
        public blazor: DotNet.BlazorInstance,
        ticks: number,
        private canvas: HTMLCanvasElement,
        private device: GPUDevice,
        private webSocket?: WebSocket
        ) {
        super(engine as Engine);
        this.DBP = DB;
        this.getSceneUniformBuffer().create();
        //@ts-ignore
        this.getSceneUniformBuffer()._buffer._buffer = GPUScene.instance.uniformBuffer;
        this.#uniformBindGroup=this.device.createBindGroup({
            layout: this.uniformBindGroupLayout,
            entries: [{
                binding: 0,
                resource: {
                    //@ts-ignore
                    buffer: this.getSceneUniformBuffer()._buffer.underlyingResource
                }
            }],
        })

        blazor.invokeMethod('setProgress', 21);
        const scene:Scene = this;
        //@ts-ignore
        this.collisionCoordinator._collideWithWorld = function (position: Vector3, velocity: Vector3, collider: Collider, maximumRetry: number, finalPosition: Vector3, excludedMesh: Nullable<AbstractMesh> = null): void {
            var closeDistance = Engine.CollisionsEpsilon * 10.0;
            if (collider._retry >= maximumRetry) {
                finalPosition.copyFrom(position);
                return;
            }

            // Check if this is a mesh else camera or -1
            var collisionMask = (excludedMesh ? excludedMesh.collisionMask : collider.collisionMask);

            collider._initialize(position, velocity, closeDistance);
            // Check all meshes
            for (var index = 0; index < scene.meshes.length; index++) {
                var mesh: TerraMesh = scene.meshes[index] as TerraMesh;
                if (mesh.isEnabled() && mesh.checkCollisions && mesh.subMeshes && mesh !== excludedMesh && ((collisionMask & mesh.collisionGroup) !== 0)) {
                    mesh._checkCollision(collider);
                    /* if (mesh.name == 'building') {
                         console.log('collides? ', collider.collisionFound);
                     }*/
                }
            }
            if (!collider.collisionFound) {
                
                position.addToRef(velocity, finalPosition);
                return;
            }
            if (velocity.x !== 0 || velocity.y !== 0 || velocity.z !== 0) {
                collider._getResponse(position, velocity);
            }
            
            if (velocity.length() <= closeDistance) {
                finalPosition.copyFrom(position);
                return;
            }
            collider._retry++;
            //@ts-ignore
            this._collideWithWorld(position, velocity, collider, maximumRetry, finalPosition, excludedMesh);
        }
        if (webSocket) {
            webSocket.send(JSON.stringify({ action: 'init', data: { userinfo, ticks } }));
            webSocket.onmessage = (e) => {
                let msg = JSON.parse(e.data);
                if (msg.action == 'init') {
                    blazor.invokeMethod('setProgress', 22);
                    console.debug('going to init game', msg.currentPlayData)
                    blazor.invokeMethod('initGame', msg.currentPlayData);
                }
            }
        } else {
            console.debug('initing without websocket connection');
            blazor.invokeMethod('setProgress', 22);
            blazor.invokeMethod('initGame', {
                gameSpeed: 0,
                lastStateChangeGameTime: 216000000000,
                lastStateChangeTime: ticks
            });
        }




        this.SunObject = new Sun(this);

        /* let gameEngine = new WorkerThread('js/workers/engine.js');
         gameEngine.message(WorkerReturn.noReturn, 'init', {
             gameTime: this.lastStateChangeGameTime
         });*/
        this.tools.set('Camera', CameraTAB);


        //@ts-ignore
        this.camera = new ArcRotateCamera("Camera", 0, 0, 10, new Vector3(500, 20, 0), this);
        this.activeCameras.push(this.camera);
        this.camera.maxZ = 1606000;
        this.camera.panningSensibility = 20;

        this.camera.angularSensibilityX = 1000;
        this.camera.angularSensibilityY = 2000;

        this.camera.lowerBetaLimit = 0.2;
        this.camera.upperBetaLimit = (Math.PI / 2) * 0.6;

        this.camera.lowerRadiusLimit = 10;
         //@ts-ignore
        this.camera.panningAxis = new Vector3(1, 0, 1)
        this.camera.checkCollisions = true;
        //Object.defineProperty(this.camera, 'checkCollisions', { get() { debugger; return true; } })
        this.camera.attachControl(canvas, true);
        //@ts-ignore
        this.camera2 = new ArcRotateCamera("Camera2", 0, 0, 10, new Vector3(500, 20, 0), this);
        this.camera2.target = this.camera.target;
        this.camera2.viewport = new Viewport(0, 0, 0.5, 1.0);

        DB.then(DB => {
            DB.transaction("save").objectStore("save").get(0).onsuccess = (evt) => {
                if ((<IDBRequest>evt.target).result) {
                    let restored = (<savedCamera>(<IDBRequest>evt.target).result).camera;
                    this.camera.alpha = restored.alpha;
                    this.camera.beta = restored.beta;
                    this.camera.radius = restored.radius;
                     //@ts-ignore
                    this.camera.target = new Vector3(restored.target.x, restored.target.y, restored.target.z);
                    this.camera.position = restored.position;

                }
                let l = new LazyEval(() => {
                    //console.log(this.camera.position.y);

                    DB.transaction("save", "readwrite").objectStore("save").put(<savedCamera>{
                        id: 0,
                        camera: { alpha: this.camera.alpha, beta: this.camera.beta, radius: this.camera.radius, target: this.camera.target, position: this.camera.position }
                    });
                    if (this.camera2) {
                        this.camera2.alpha = 0;
                        this.camera2.beta = 0;
                        this.camera2.radius = 60;
                         //@ts-ignore
                        this.camera2.target = new Vector3(this.camera.target.x, 1, this.camera.target.z);
                         //@ts-ignore
                        this.camera2.position = new Vector3(this.camera.target.x, 1000, this.camera.target.z);
                    }
                })
                this.camera.onProjectionMatrixChangedObservable.add(() => {
                    l.eval(500);
                });

            }
        })






        //let ui = new UI();
        //ui.registerTab(CameraTab);
        var sunlight = new PointLight("Omni", this.SunObject.sunPosition, this);
        let shadermateria = new ShaderMaterial("shader", this, "./shaders/ground",
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "lightPos", "cameraPosition"]
            });
        interface TerrainMap {
            width: number,
            height: number,
            indices: Uint32Array,
            normals: Float32Array,
            positions: Float32Array,
            uvs: Float32Array,
            texture: Blob
        }
        //let sea: Mesh;

        /*
         *         this.worker.subscribe('setProgress', (data) => {
        console.log('got progress from worker', data);
        blazor.invokeMethod('setProgress', data.data.progress, data.data.error);
    });
    */
        this.#groundP = Terrain.fromHeightMap('/images/tenerife3_75.webp', device);
        this.terrainInited = new Promise<[Terrain, Promise<GPUBuffer>]>(async (tres, trej) => {
            try {
                
                let cachedtexture = await caches.match(new Request('/terrainTexture.webp'));
                if (cachedtexture) {
                    let cacheimg = new Image();
                    cacheimg.src = URL.createObjectURL(await cachedtexture.blob());

                    tres([new Terrain(await this.#groundP, GPUScene.instance), cacheimg.decode().then(() => {
                        let imgcanvas = new OffscreenCanvas(cacheimg.width, cacheimg.height);
                        let imgctx = imgcanvas.getContext('2d');
                        if (!imgctx)
                            throw (new Error('Unable to get 2d canvas'));
                        imgctx.drawImage(cacheimg, 0, 0);
                        //let pixels = imgctx.getImageData(0, 0, cacheimg.width, cacheimg.height).data;
                        // const padding = pixels.byteLength % 4;
                        //@ts-ignore
                        const [gpuBuffer, arrarBuffer] = device.createBufferMapped({
                            size: cacheimg.width * cacheimg.height * 4 * Uint8ClampedArray.BYTES_PER_ELEMENT,
                            //@ts-ignore
                            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
                        });
                        new Uint8ClampedArray(arrarBuffer).set(imgctx.getImageData(0, 0, cacheimg.width, cacheimg.height).data);
                        gpuBuffer.unmap();
                        return gpuBuffer;
                    })]);
                    return;
                }
                //progelem.value = 40;
                blazor.invokeMethod('setProgress', 30);
                const t = new Terrain(await this.#groundP, GPUScene.instance);
                const ground = t.terraMesh;
                tres([t, t.createTexture(engine as WebGPUEngine)]);
                let obj = {
                    width: 10000,
                    height: 10000,
                    indices: new Uint32Array(ground.indices!),
                    positions: new Float32Array(ground.positions),
                    uvs: new Float32Array(ground.uvs || [])
                };
                let trans2 = (await DB).transaction('maps', 'readwrite');
                trans2.objectStore('maps').add(obj);


            } catch (e) {
                trej(e);
            }
        });
        this.sea = new Sea(this);
        this.plants = new Plants(this, this.camera, this.terrainInited, device);
        this.terrainReady=this.terrainInited.then(gt => {
            blazor.invokeMethod('setProgress', 40);
            let [ground, texture] = gt;

            this.tools.set('Buildings', BuildingsUI);
            
            DB.then(d => {
                this.tools.set('Zones' , Zones);
            })


            ground.terraMesh.checkCollisions = true;
            blazor.invokeMethod('setProgress', 50);
            ground.terraMesh.isPickable = true;
            this.getSceneUniformBuffer().update();

            this.tools.set('TerrainTool', TerrainTool);
            blazor.invokeMethod('setProgress', 51);
            shadermateria.setVector3("lightPos", sunlight.position);
            blazor.invokeMethod('setProgress', 52);
            shadermateria.setVector3("cameraPosition", this.camera.position);

            this.tools.set('Plants', PlantsUI);

            blazor.invokeMethod('setProgress', 53);
            return texture.then(async gpuBuffer => {
                blazor.invokeMethod('setProgress', 75);

                //let size = new Float32Array(imgdata as ArrayBuffer, 0, 2);
                let size = [5120, 5120];

                let internaltex = new InternalTexture(engine, InternalTextureSource.Url);
                internaltex.width = size[0];
                internaltex.height = size[1];
                internaltex.baseWidth = size[0];
                internaltex.baseHeight = size[1];
                internaltex._isRGBD = internaltex._isRGBD;
                blazor.invokeMethod('setProgress', 80);
                //internaltex._sphericalPolynomial = webglEngineTexture._sphericalPolynomial;
                const textureExtent = {
                    width: size[0],
                    height: size[1],
                    depth: 1,
                };
                internaltex._webGPUTexture = device.createTexture({
                    dimension: '2d',
                    format: "rgba8unorm",
                    mipLevelCount: 1,
                    sampleCount: 1,
                    size: textureExtent,
                    //@ts-ignore
                    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.SAMPLED
                });
                const commandEncoder = device.createCommandEncoder({});
                blazor.invokeMethod('setProgress', 85);
                let bufferView: GPUBufferCopyView = {
                    buffer: gpuBuffer,
                    bytesPerRow: size[0] * 4,
                    rowsPerImage: 0,
                    offset: 0,
                };
                blazor.invokeMethod('setProgress', 90);

                commandEncoder.copyBufferToTexture(bufferView,
                    {
                        texture: internaltex._webGPUTexture,
                        origin: {
                            x: 0,
                            y: 0,
                            z: Math.max(-1, 0)
                           },
                    mipLevel: 0,
                    }, textureExtent);
                device.defaultQueue.submit([commandEncoder.finish()]); //Copy would overflow the buffer
                bufferView.buffer.destroy();
                internaltex._webGPUTextureView = internaltex._webGPUTexture.createView();
                internaltex.onLoadedObservable.notifyObservers(internaltex);
                internaltex.onLoadedObservable.clear();
                internaltex.url = String("https://playground.babylonjs.com/textures/grass.png");
                internaltex.generateMipMaps = false;
                internaltex.invertY = true;
                internaltex.samplingMode = Texture.TRILINEAR_SAMPLINGMODE;
                internaltex.isReady = true;
                (engine as WebGPUEngine)._internalTexturesCache.push(internaltex);
                blazor.invokeMethod('setProgress', 95);

                var grass2 = new StandardMaterial("grass2", this);

                //engine.createTexture("https://playground.babylonjs.com/textures/grass.png", true, true, this);
                // grass2.ambientTexture = new Texture("https://playground.babylonjs.com/textures/grass.png", this, true);
                grass2.diffuseTexture = new Texture("https://playground.babylonjs.com/textures/grass.png", this, true);
                // grass2.diffuseColor = new Color3(0.2, 1, 0.3);
                ground.terraMesh.material = grass2;
                blazor.invokeMethod('setProgress', 100);
                console.debug("Progress 100");
                
            })

            

        }).catch(e => {
            console.error(e);
            blazor.invokeMethod('setProgressError', e.name +' '+ e.message);
        })
    }
    async activateMenu(name: string) {
        try {
            let tool: UITABClassLike | undefined;
            if (tool = this.tools.get(name)) {
                //tool.instance = new tool(this, await this.#groundP, this.camera);
            }
        } catch (e) {
            console.error(e);
        }
    }
    async deActivateMenu(name: string) {
        try {
            let tool: UITABClassLike | undefined;
            if (tool = this.tools.get(name)) {
                tool.instance?.destroy();
                tool.instance = null;
            } else
                throw(new Error('Tool '+name+' not found'))
        } catch (e) {
            console.error(e);
        }
    }
    async invokeMenu(name: string, method: string) {
        try {
            let tool: UITABClassLike | undefined;
            if (tool = this.tools.get(name)) {
                let instance: UITAB | null;
                if (instance = tool.instance) {
                    //@ts-ignore
                    instance[method]();
                } else
                    throw (new Error('Method ' + method + ' was not found from tool ' + name + ''))
            } else
                throw (new Error('Tool ' + name + ' not found'))
        } catch (e) {
            console.error(e);
        }
    }
}
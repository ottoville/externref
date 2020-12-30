import type { TerraMesh } from "../TerraMesh.js";

import type { loginProvider, DotNet } from "../types/interfaces/index.js";
import { Scene } from "../lib/babylon/scene.js";
import type { PickingInfo } from "../lib/babylon/Collisions/pickingInfo.js";
import { Camera } from "../lib/babylon/Cameras/camera.js";
import { AbstractActionManager } from "../lib/babylon/Actions/abstractActionManager.js";
import type { Observable } from "../lib/babylon/Misc/observable.js";
import type { PointerInfoPre, PointerInfo } from "../lib/babylon/Events/pointerEvents.js";
import { PointerEventTypes } from "../lib/babylon/Events/pointerEvents.js";
import { Constants } from "../lib/babylon/Engines/constants.js";
import type { AbstractMesh } from "../lib/babylon/Meshes/abstractMesh.js";
import "../lib/babylon/Culling/ray.js";
import { ActionEvent } from "../lib/babylon/Actions/actionEvent.js";
import { KeyboardInfo, KeyboardEventTypes, KeyboardInfoPre } from "../lib/babylon/Events/keyboardEvents.js";
import { Engine } from "../lib/babylon/Engines/engine.js";
import { Matrix, Frustum } from "../lib/babylon/Maths/math.js";
import { DefaultCollisionCoordinator } from '../lib/babylon/Collisions/collisionCoordinator.js';
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine.js";
import { GPU } from "../GPU.js";
import { TerraScene } from "../TerraScene.js";

/*
function matrixMultiply64(m: number[], otherM: number[]): number[] {
    var tm0 = m[0], tm1 = m[1], tm2 = m[2], tm3 = m[3];
    var tm4 = m[4], tm5 = m[5], tm6 = m[6], tm7 = m[7];
    var tm8 = m[8], tm9 = m[9], tm10 = m[10], tm11 = m[11];
    var tm12 = m[12], tm13 = m[13], tm14 = m[14], tm15 = m[15];

    var om0 = otherM[0], om1 = otherM[1], om2 = otherM[2], om3 = otherM[3];
    var om4 = otherM[4], om5 = otherM[5], om6 = otherM[6], om7 = otherM[7];
    var om8 = otherM[8], om9 = otherM[9], om10 = otherM[10], om11 = otherM[11];
    var om12 = otherM[12], om13 = otherM[13], om14 = otherM[14], om15 = otherM[15];
    const result: number[] = [];
    result[0] = tm0 * om0 + tm1 * om4 + tm2 * om8 + tm3 * om12;
    result[1] = tm0 * om1 + tm1 * om5 + tm2 * om9 + tm3 * om13;
    result[2] = tm0 * om2 + tm1 * om6 + tm2 * om10 + tm3 * om14;
    result[3] = tm0 * om3 + tm1 * om7 + tm2 * om11 + tm3 * om15;

    result[4] = tm4 * om0 + tm5 * om4 + tm6 * om8 + tm7 * om12;
    result[5] = tm4 * om1 + tm5 * om5 + tm6 * om9 + tm7 * om13;
    result[6] = tm4 * om2 + tm5 * om6 + tm6 * om10 + tm7 * om14;
    result[7] = tm4 * om3 + tm5 * om7 + tm6 * om11 + tm7 * om15;

    result[8] = tm8 * om0 + tm9 * om4 + tm10 * om8 + tm11 * om12;
    result[9] = tm8 * om1 + tm9 * om5 + tm10 * om9 + tm11 * om13;
    result[10] = tm8 * om2 + tm9 * om6 + tm10 * om10 + tm11 * om14;
    result[11] = tm8 * om3 + tm9 * om7 + tm10 * om11 + tm11 * om15;

    result[12] = tm12 * om0 + tm13 * om4 + tm14 * om8 + tm15 * om12;
    result[13] = tm12 * om1 + tm13 * om5 + tm14 * om9 + tm15 * om13;
    result[14] = tm12 * om2 + tm13 * om6 + tm14 * om10 + tm15 * om14;
    result[15] = tm12 * om3 + tm13 * om7 + tm14 * om11 + tm15 * om15;
    return result;
}
*/
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
    //camera: ArcRotateCamera;
    // camera2: ArcRotateCamera;
    DBP: Promise<EarthDatabase>;

    /**
 * Sets the current transform matrix
 * @param viewL defines the View matrix to use
 * @param projectionL defines the Projection matrix to use
 * @param viewR defines the right View matrix to use (if provided)
 * @param projectionR defines the right Projection matrix to use (if provided)
 */
    public setTransformMatrix(viewL: Matrix, projectionL: Matrix): void {
        //@ts-ignore
        if (this._viewUpdateFlag === viewL.updateFlag && this._projectionUpdateFlag === projectionL.updateFlag) {
            return;
        }
        //@ts-ignore
        this._viewUpdateFlag = viewL.updateFlag;
        //@ts-ignore
        this._projectionUpdateFlag = projectionL.updateFlag;
        this._viewMatrix = viewL;
        //@ts-ignore
        this._projectionMatrix = projectionL;
        //@ts-ignore
        this._viewMatrix.multiplyToRef(this._projectionMatrix, this._transformMatrix);

        // Update frustum
        if (!this._frustumPlanes) {
            //@ts-ignore
            this._frustumPlanes = Frustum.GetPlanes(this._transformMatrix);
        } else {
            //@ts-ignore
            Frustum.GetPlanesToRef(this._transformMatrix, this._frustumPlanes);
        }
        //@ts-ignore
        this._sceneUbo.updateMatrix("viewProjection", this._transformMatrix);
        //@ts-ignore
        this._sceneUbo.updateMatrix("view", this._viewMatrix);

        const eyePosition = this._forcedViewPosition ? this._forcedViewPosition : (this._mirroredCameraPosition ? this._mirroredCameraPosition : (this.activeCamera!).globalPosition);
        const invertNormal = (this.useRightHandedSystem === (this._mirroredCameraPosition != null));
        //@ts-ignore
        this._sceneUbo.updateFloat4("viewPosition",
            eyePosition.x,
            eyePosition.y,
            eyePosition.z,
            invertNormal ? -1 : 1);
        //@ts-ignore
        // this._sceneUbo.update();
    }

    createPickingRayToRef(x: number, y: number, world: Matrix, result: any, camera: Nullable<Camera>, cameraViewSpace = false): Scene {
        var engine = this.getEngine();
        if (!camera) {
            if (!this.activeCamera) {
                return this;
            }
            camera = this.activeCamera;
        }
        var cameraViewport = camera.viewport;
        var viewport = cameraViewport.toGlobal(TerraScene.instance.TerraCameras[0].renderPass.width, TerraScene.instance.TerraCameras[0].renderPass.height);

        // Moving coordinates to local viewport world
        x = x / engine.getHardwareScalingLevel() - viewport.x;
        y = y / engine.getHardwareScalingLevel() - (TerraScene.instance.TerraCameras[0].renderPass.height - viewport.y - viewport.height);
        // const projectionmatrix = camera.getProjectionMatrix()
        /////
        // Cache
        //@ts-ignore
        camera._cache.mode = this.mode;
        //@ts-ignore
        camera._cache.minZ = this.minZ;
        //@ts-ignore
        camera._cache.maxZ = this.maxZ;

        // Matrix
        //@ts-ignore
        camera._refreshFrustumPlanes = true;
        camera._cache.fov = camera.fov;
        camera._cache.fovMode = camera.fovMode;
        // camera._cache.aspectRatio = engine.getAspectRatio(camera);
        var viewport = camera.viewport;
        camera._cache.aspectRatio = (TerraScene.instance.TerraCameras[0].renderPass.width * viewport.width) / (TerraScene.instance.TerraCameras[0].renderPass.height * viewport.height);


        if (camera.minZ <= 0) {
            camera.minZ = 0.1;
        }

        const reverseDepth = engine.useReverseDepthBuffer;
        let getProjectionMatrix: (fov: number, aspect: number, znear: number, zfar: number, result: Matrix, isVerticalFovFixed: boolean) => void;
        getProjectionMatrix = reverseDepth ? Matrix.PerspectiveFovReverseLHToRef : Matrix.PerspectiveFovLHToRef;

        var viewport = camera.viewport;
        let aspectRatio = (TerraScene.instance.TerraCameras[0].renderPass.width * viewport.width) / (TerraScene.instance.TerraCameras[0].renderPass.height * viewport.height);

        getProjectionMatrix(camera.fov,
            aspectRatio,
            camera.minZ,
            camera.maxZ,
            camera._projectionMatrix,
            camera.fovMode === Camera.FOVMODE_VERTICAL_FIXED);


        camera.onProjectionMatrixChangedObservable.notifyObservers(camera);

        const projectionmatrix = camera._projectionMatrix;

        /////
        
        result.update(x, y, viewport.width, viewport.height, world ? world : Matrix.IdentityReadOnly, cameraViewSpace ? Matrix.IdentityReadOnly : Matrix.FromArray(TerraScene.instance.TerraCameras[0].viewArr), projectionmatrix);
        return this;
    }
    /* This is same as babylonjs _internalPick but with promise */
    collissionCheck(rayFunction: (world: Matrix) => any /* any = Ray */, meshIndex: number, pickResult: PickingInfo | null, fastCheck?: boolean, predicate?: (mesh: AbstractMesh) => boolean): Promise<PickingInfo | null> {
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
            //@ts-ignore
            if (typeof ((mesh as TerraMesh).intersectsPromise) !== 'undefined') //@ts-ignore
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

    public stateChange(data: {
        gameSpeed: number
        lastStateChangeGameTime: number
        lastStateChangeTime: number
    }) {

        TerraScene.instance.engine.physics.gameSpeed = data.gameSpeed;
        if (this.webSocket) {
            this.webSocket.send(JSON.stringify({ action: 'stateChange', data }))
            return;
        }
        //gameEngine.message(WorkerReturn.Promise, 'stateChange', gameStateEvent);
    };
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
                debugger;
                return;
            }

            if (!scene.cameraToUseForPointers && !scene.activeCamera) {
                debugger;
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
            // scene.pickPromise(inputmanager._unTranslatedPointerX, inputmanager._unTranslatedPointerY, scene.pointerDownPredicate, false, scene.cameraToUseForPointers).then(pickResult => {

            TerraScene.instance.pickPromise(inputmanager._unTranslatedPointerX, inputmanager._unTranslatedPointerY).then(pickResult => {
                if (pickResult) //@ts-ignore
                    inputmanager._processPointerDown(pickResult, evt);
                else {
                    debugger;
                }
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

    constructor(
        engine: Engine | WebGPUEngine,
        userinfo: loginProvider,
        public blazor: DotNet.BlazorInstance,
        ticks: number,
        private webSocket?: WebSocket
    ) {
        super(engine as Engine);
        this.DBP = DB;
        this.getSceneUniformBuffer().create();
        //@ts-ignore
        this.getSceneUniformBuffer()._buffer._buffer = GPU.instance.uniformBuffer;

        const scene: Scene = this;
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
                    console.debug('going to init game', msg.currentPlayData)
                    blazor.invokeMethod('initGame', msg.currentPlayData);
                }
            }
        } else {
            console.debug('initing without websocket connection');
            blazor.invokeMethod('initGame', {
                gameSpeed: 0,
                lastStateChangeGameTime: 216000000000,
                lastStateChangeTime: ticks
            });
        }

        /* let gameEngine = new WorkerThread('js/workers/engine.js');
         gameEngine.message(WorkerReturn.noReturn, 'init', {
             gameTime: this.lastStateChangeGameTime
         });*/


        /*
        this.camera = new ArcRotateCamera("Camera", 0, 0, 10, new Vector3(500, 20, 0), this);
        this.activeCameras.push(this.camera);
        this.camera.maxZ = 1606000;
        this.camera.panningSensibility = 20;

        this.camera.angularSensibilityX = 1000;
        this.camera.angularSensibilityY = 2000;*/

        // this.camera.lowerBetaLimit = 0.2;
        //  this.camera.upperBetaLimit = (Math.PI / 2) * 0.6;

        // this.camera.lowerRadiusLimit = 10;
        /*      this.camera.panningAxis = new Vector3(1, 0, 1)
                this.camera.checkCollisions = true;
                //Object.defineProperty(this.camera, 'checkCollisions', { get() { debugger; return true; } })
                this.camera.attachControl(canvas, true);*/
        //@ts-ignore
        //  this.camera2 = new ArcRotateCamera("Camera2", 0, 0, 10, new Vector3(500, 20, 0), this);
        //this.camera2.target = this.camera.target;
        //  this.camera2.viewport = new Viewport(0, 0, 0.5, 1.0);
        /*  DB.then(DB => {
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
          })*/

        /*
         *         this.worker.subscribe('setProgress', (data) => {
        console.log('got progress from worker', data);
        blazor.invokeMethod('setProgress', data.data.progress, data.data.error);
    });
    */






        //   this.sea = new Sea(this);
        /*  this.getSceneUniformBuffer().update();
          this.terrainReady=this.terrainInited.then(gt => {
              blazor.invokeMethod('setProgress', 40);
              let [ground, texture] = gt;
  
  
  
             // ground.terraMesh.checkCollisions = true;
              blazor.invokeMethod('setProgress', 50);
            //  ground.terraMesh.isPickable = true;
              
              blazor.invokeMethod('setProgress', 51);
              blazor.invokeMethod('setProgress', 52);
  
  
              blazor.invokeMethod('setProgress', 53);
              return texture.then(async gpuBuffer => {
                  blazor.invokeMethod('setProgress', 75);
  
                  
                  //internaltex._sphericalPolynomial = webglEngineTexture._sphericalPolynomial;
                  const commandEncoder = device.createCommandEncoder({});
                  blazor.invokeMethod('setProgress', 80);
                
                  let bufferView: GPUBufferCopyView = {
                      buffer: gpuBuffer,
                      bytesPerRow: ground.textureSize[0] * 4,
                      rowsPerImage: 0,
                      offset: 0,
                  };
                  blazor.invokeMethod('setProgress', 85);
                 
                  
                  commandEncoder.copyBufferToTexture(bufferView,
                      {
                          texture: ground.texture,
                          origin: {
                              x: 0,
                              y: 0,
                              z: Math.max(-1, 0)
                             },
                      mipLevel: 0,
                      }, ground.textureExtent);
                  blazor.invokeMethod('setProgress', 90);
                 
  
                  device.defaultQueue.submit([commandEncoder.finish()]); //Copy would overflow the buffer
                  blazor.invokeMethod('setProgress', 95);
                  bufferView.buffer.destroy();
                  blazor.invokeMethod('setProgress', 100);
                  console.debug("Progress 100");
              })
          }).catch(e => {
              console.error(e);
              blazor.invokeMethod('setProgressError', e.name +' '+ e.message);
          })*/
    }
}
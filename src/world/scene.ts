import { Sun } from "./sun.js";
import { Plants } from "../plants/Plants.js";
import { PlantsUI } from "../tools/plantsUI.js";
import { Zones } from "../tools/zones.js";
import { CameraTAB } from "../tools/camera.js";
import type { UITAB } from "../UITAB.js";
import { BuildingsUI } from "../tools/buildings.js";
import { TerrainTool } from "../tools/Terrain.js";
import { Terrain } from "./terrain.js";

import type { TerraMesh } from "../TerraMesh.js";

import type { loginProvider, DotNet } from "../types/interfaces/index.js";
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
    public tools: { [index: string]: UITAB } = {}
    public render(updateCameras = true, ignoreAnimations = false): void {
        if (this.isDisposed) {
            return;
        }

        //this._frameId++;

        // Register components that have been associated lately to the scene.
        //this._registerTransientComponents();

        this._activeParticles.fetchNewFrame();
        //this._totalVertices.fetchNewFrame();
        this._activeIndices.fetchNewFrame();
        this._activeBones.fetchNewFrame();
        //this._meshesForIntersections.reset();
        this.resetCachedMaterial();

        this.onBeforeAnimationsObservable.notifyObservers(this);

        // Actions
        //if (this.actionManager) {
        //    this.actionManager.processTrigger(Constants.ACTION_OnEveryFrameTrigger);
        //}

        // Animations
        if (!ignoreAnimations) {
            this.animate();
        }

        // Before camera update steps
        for (let step of this._beforeCameraUpdateStage) {
            step.action();
        }

        // Update Cameras
        if (updateCameras) {
            if (this.activeCameras.length > 0) {
                for (var cameraIndex = 0; cameraIndex < this.activeCameras.length; cameraIndex++) {
                    let camera = this.activeCameras[cameraIndex];
                    camera.update();
                    if (camera.cameraRigMode !== 0) {
                        // rig cameras
                        for (var index = 0; index < camera._rigCameras.length; index++) {
                            camera._rigCameras[index].update();
                        }
                    }
                }
            } else if (this.activeCamera) {
                this.activeCamera.update();
                if (this.activeCamera.cameraRigMode !== 0) {
                    // rig cameras
                    for (var index = 0; index < this.activeCamera._rigCameras.length; index++) {
                        this.activeCamera._rigCameras[index].update();
                    }
                }
            }
        }

        // Before render
        this.onBeforeRenderObservable.notifyObservers(this);

        // Customs render targets
        this.onBeforeRenderTargetsRenderObservable.notifyObservers(this);
        var engine = this.getEngine();
        var currentActiveCamera = this.activeCamera;
        if (this.renderTargetsEnabled) {
            //Tools.StartPerformanceCounter("Custom render targets", this.customRenderTargets.length > 0);
            //this._intermediateRendering = true;
            for (var customIndex = 0; customIndex < this.customRenderTargets.length; customIndex++) {
                var renderTarget = this.customRenderTargets[customIndex];
                if (renderTarget._shouldRender()) {
                    //this._renderId++;

                    this.activeCamera = renderTarget.activeCamera || this.activeCamera;

                    if (!this.activeCamera) {
                        throw new Error("Active camera not set");
                    }

                    // Viewport
                    engine.setViewport(this.activeCamera.viewport);

                    // Camera
                    this.updateTransformMatrix();

                    renderTarget.render(currentActiveCamera !== this.activeCamera, this.dumpNextRenderTargets);
                }
            }
            //Tools.EndPerformanceCounter("Custom render targets", this.customRenderTargets.length > 0);
            //this._intermediateRendering = false;
            //this._renderId++;
        }

        // Restore back buffer
        this.activeCamera = currentActiveCamera;
        //this._bindFrameBuffer();
        this.onAfterRenderTargetsRenderObservable.notifyObservers(this);

        for (let step of this._beforeClearStage) {
            step.action();
        }

        // Clear
        if (this.autoClearDepthAndStencil || this.autoClear) {

            engine.clear(this.clearColor, this.autoClear || this.forceWireframe || this.forcePointsCloud, this.autoClearDepthAndStencil, this.autoClearDepthAndStencil);
        }

        // Collects render targets from external components.
        // for (let step of this._gatherRenderTargetsStage) {
        //    step.action(this._renderTargets);
        //  }

        // Multi-cameras?
        if (this.activeCameras.length > 0) {
            for (var cameraIndex = 0; cameraIndex < this.activeCameras.length; cameraIndex++) {
                if (cameraIndex > 0) {
                    engine.clear(null, false, true, true);
                }
                //@ts-ignore
                this._processSubCameras(this.activeCameras[cameraIndex]);
            }
        } else {
            if (!this.activeCamera) {
                throw new Error("No camera defined");
            }

            //this._processSubCameras(this.activeCamera);
            (function () {
                this._processSubCameras(this.activeCamera);
            }).bind(engine.scenes[0])();
        }

        // Intersection checks
        //this._checkIntersections();

        // Executes the after render stage actions.
        for (let step of this._afterRenderStage) {
            step.action();
        }

        // After render
        if (this.afterRender) {
            this.afterRender();
        }

        this.onAfterRenderObservable.notifyObservers(this);

        // Cleaning
        if (this._toBeDisposed.length) {
            for (var index = 0; index < this._toBeDisposed.length; index++) {
                var data = this._toBeDisposed[index];
                if (data) {
                    data.dispose();
                }
            }

            this._toBeDisposed = [];
        }

        if (this.dumpNextRenderTargets) {
            this.dumpNextRenderTargets = false;
        }

        this._activeBones.addCount(0, true);
        this._activeIndices.addCount(0, true);
        this._activeParticles.addCount(0, true);
    }
    public attachControl(attachUp = true, attachDown = true, attachMove = true, elementToAttachTo: Nullable<HTMLElement> = null): void {
        //this._inputManager.attachControl(attachUp, attachDown, attachMove);
        let DoubleClickDelay = 300;
        let ExclusiveDoubleClickMode = false;
        let engine = this.getEngine();
        (function (scene: WorldScene, elementToAttachTo: Nullable<HTMLElement> = null) {
            if (!elementToAttachTo) {
                elementToAttachTo = engine.getInputElement();
            }

            if (!elementToAttachTo) {
                return;
            }
            this._initActionManager = (act: Nullable<AbstractActionManager>, clickInfo: _ClickInfo): Nullable<AbstractActionManager> => {
                if (!this._meshPickProceed) {
                    let pickResult = scene.pick(this._unTranslatedPointerX, this._unTranslatedPointerY, scene.pointerDownPredicate, false, scene.cameraToUseForPointers);
                    this._currentPickResult = pickResult;
                    if (pickResult) {
                        act = (pickResult.hit && pickResult.pickedMesh) ? pickResult.pickedMesh._getActionManagerForTrigger() : null;
                    }
                    this._meshPickProceed = true;
                }
                return act;
            };

            this._delayedSimpleClick = (btn: number, clickInfo: _ClickInfo, cb: (clickInfo: _ClickInfo, pickResult: Nullable<PickingInfo>) => void) => {
                // double click delay is over and that no double click has been raised since, or the 2 consecutive keys pressed are different
                if ((Date.now() - this._previousStartingPointerTime > DoubleClickDelay && !this._doubleClickOccured) ||
                    btn !== this._previousButtonPressed) {
                    this._doubleClickOccured = false;
                    clickInfo.singleClick = true;
                    clickInfo.ignore = false;
                    cb(clickInfo, this._currentPickResult);
                }
            };

            this._initClickEvent = (obs1: Observable<PointerInfoPre>, obs2: Observable<PointerInfo>, evt: PointerEvent, cb: (clickInfo: _ClickInfo, pickResult: Nullable<PickingInfo>) => void): void => {
                let clickInfo = new _ClickInfo();
                this._currentPickResult = null;
                let act: Nullable<AbstractActionManager> = null;

                let checkPicking = obs1.hasSpecificMask(PointerEventTypes.POINTERPICK) || obs2.hasSpecificMask(PointerEventTypes.POINTERPICK)
                    || obs1.hasSpecificMask(PointerEventTypes.POINTERTAP) || obs2.hasSpecificMask(PointerEventTypes.POINTERTAP)
                    || obs1.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP) || obs2.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP);
                if (!checkPicking && AbstractActionManager) {
                    act = this._initActionManager(act, clickInfo);
                    if (act) {
                        checkPicking = act.hasPickTriggers;
                    }
                }

                let needToIgnoreNext = false;

                if (checkPicking) {
                    let btn = evt.button;
                    clickInfo.hasSwiped = this._isPointerSwiping();

                    if (!clickInfo.hasSwiped) {
                        let checkSingleClickImmediately = !ExclusiveDoubleClickMode;

                        if (!checkSingleClickImmediately) {
                            checkSingleClickImmediately = !obs1.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP) &&
                                !obs2.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP);

                            if (checkSingleClickImmediately && !AbstractActionManager.HasSpecificTrigger(Constants.ACTION_OnDoublePickTrigger)) {
                                act = this._initActionManager(act, clickInfo);
                                if (act) {
                                    checkSingleClickImmediately = !act.hasSpecificTrigger(Constants.ACTION_OnDoublePickTrigger);
                                }
                            }
                        }

                        if (checkSingleClickImmediately) {
                            // single click detected if double click delay is over or two different successive keys pressed without exclusive double click or no double click required
                            if (Date.now() - this._previousStartingPointerTime > DoubleClickDelay ||
                                btn !== this._previousButtonPressed) {
                                clickInfo.singleClick = true;
                                cb(clickInfo, this._currentPickResult);
                                needToIgnoreNext = true;
                            }
                        }
                        // at least one double click is required to be check and exclusive double click is enabled
                        else {
                            // wait that no double click has been raised during the double click delay
                            this._previousDelayedSimpleClickTimeout = this._delayedSimpleClickTimeout;
                            this._delayedSimpleClickTimeout = window.setTimeout(this._delayedSimpleClick.bind(this, btn, clickInfo, cb), DoubleClickDelay);
                        }

                        let checkDoubleClick = obs1.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP) ||
                            obs2.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP);
                        if (!checkDoubleClick && AbstractActionManager.HasSpecificTrigger(Constants.ACTION_OnDoublePickTrigger)) {
                            act = this._initActionManager(act, clickInfo);
                            if (act) {
                                checkDoubleClick = act.hasSpecificTrigger(Constants.ACTION_OnDoublePickTrigger);
                            }
                        }
                        if (checkDoubleClick) {
                            // two successive keys pressed are equal, double click delay is not over and double click has not just occurred
                            if (btn === this._previousButtonPressed &&
                                Date.now() - this._previousStartingPointerTime < DoubleClickDelay &&
                                !this._doubleClickOccured
                            ) {
                                // pointer has not moved for 2 clicks, it's a double click
                                if (!clickInfo.hasSwiped &&
                                    !this._isPointerSwiping()) {
                                    this._previousStartingPointerTime = 0;
                                    this._doubleClickOccured = true;
                                    clickInfo.doubleClick = true;
                                    clickInfo.ignore = false;
                                    if (ExclusiveDoubleClickMode && this._previousDelayedSimpleClickTimeout) {
                                        clearTimeout(this._previousDelayedSimpleClickTimeout);
                                    }
                                    this._previousDelayedSimpleClickTimeout = this._delayedSimpleClickTimeout;
                                    cb(clickInfo, this._currentPickResult);
                                }
                                // if the two successive clicks are too far, it's just two simple clicks
                                else {
                                    this._doubleClickOccured = false;
                                    this._previousStartingPointerTime = this._startingPointerTime;
                                    this._previousStartingPointerPosition.x = this._startingPointerPosition.x;
                                    this._previousStartingPointerPosition.y = this._startingPointerPosition.y;
                                    this._previousButtonPressed = btn;
                                    if (ExclusiveDoubleClickMode) {
                                        if (this._previousDelayedSimpleClickTimeout) {
                                            clearTimeout(this._previousDelayedSimpleClickTimeout);
                                        }
                                        this._previousDelayedSimpleClickTimeout = this._delayedSimpleClickTimeout;

                                        cb(clickInfo, this._previousPickResult);
                                    }
                                    else {
                                        cb(clickInfo, this._currentPickResult);
                                    }
                                }
                                needToIgnoreNext = true;
                            }
                            // just the first click of the double has been raised
                            else {
                                this._doubleClickOccured = false;
                                this._previousStartingPointerTime = this._startingPointerTime;
                                this._previousStartingPointerPosition.x = this._startingPointerPosition.x;
                                this._previousStartingPointerPosition.y = this._startingPointerPosition.y;
                                this._previousButtonPressed = btn;
                            }
                        }
                    }
                }

                if (!needToIgnoreNext) {
                    cb(clickInfo, this._currentPickResult);
                }
            };

            this._onPointerMove = (evt: PointerEvent) => {

                this._updatePointerPosition(evt);

                // PreObservable support
                if (this._checkPrePointerObservable(null, evt, evt.type === this._wheelEventName ? PointerEventTypes.POINTERWHEEL : PointerEventTypes.POINTERMOVE)) {
                    return;
                }

                if (!scene.cameraToUseForPointers && !scene.activeCamera) {
                    return;
                }

                if (!scene.pointerMovePredicate) {
                    scene.pointerMovePredicate = (mesh: AbstractMesh): boolean => (mesh.isPickable && mesh.isVisible && mesh.isReady() && mesh.isEnabled() && (mesh.enablePointerMoveEvents || scene.constantlyUpdateMeshUnderPointer || (mesh._getActionManagerForTrigger() != null)) && (!scene.cameraToUseForPointers || (scene.cameraToUseForPointers.layerMask & mesh.layerMask) !== 0));
                }

                // Meshes
                var pickResult = scene.pick(this._unTranslatedPointerX, this._unTranslatedPointerY, scene.pointerMovePredicate, false, scene.cameraToUseForPointers);

                this._processPointerMove(pickResult, evt);
            };

            this._onPointerDown = (evt: PointerEvent) => {
                this._totalPointersPressed++;
                this._pickedDownMesh = null;
                this._meshPickProceed = false;

                this._updatePointerPosition(evt);

                if (scene.preventDefaultOnPointerDown && elementToAttachTo) {
                    evt.preventDefault();
                    elementToAttachTo.focus();
                }

                this._startingPointerPosition.x = this._pointerX;
                this._startingPointerPosition.y = this._pointerY;
                this._startingPointerTime = Date.now();

                // PreObservable support
                if (this._checkPrePointerObservable(null, evt, PointerEventTypes.POINTERDOWN)) {
                    return;
                }

                if (!scene.cameraToUseForPointers && !scene.activeCamera) {
                    return;
                }

                this._pointerCaptures[evt.pointerId] = true;

                if (!scene.pointerDownPredicate) {
                    scene.pointerDownPredicate = (mesh: AbstractMesh): boolean => {
                        return mesh.isPickable && mesh.isVisible && mesh.isReady() && mesh.isEnabled() && (!scene.cameraToUseForPointers || (scene.cameraToUseForPointers.layerMask & mesh.layerMask) !== 0);
                    };
                }

                // Meshes
                this._pickedDownMesh = null;
                scene.pickPromise(this._unTranslatedPointerX, this._unTranslatedPointerY, scene.pointerDownPredicate, false, scene.cameraToUseForPointers).then(pickResult => {
                    if (pickResult)
                        this._processPointerDown(pickResult, evt);
                });
            };

            this._onPointerUp = (evt: PointerEvent) => {
                if (this._totalPointersPressed === 0) {  // We are attaching the pointer up to windows because of a bug in FF
                    return;                             // So we need to test it the pointer down was pressed before.
                }

                this._totalPointersPressed--;
                this._pickedUpMesh = null;
                this._meshPickProceed = false;

                this._updatePointerPosition(evt);

                if (scene.preventDefaultOnPointerUp && elementToAttachTo) {
                    evt.preventDefault();
                    elementToAttachTo.focus();
                }

                this._initClickEvent(scene.onPrePointerObservable, scene.onPointerObservable, evt, (clickInfo: _ClickInfo, pickResult: Nullable<PickingInfo>) => {
                    // PreObservable support
                    if (scene.onPrePointerObservable.hasObservers()) {
                        if (!clickInfo.ignore) {
                            if (!clickInfo.hasSwiped) {
                                if (clickInfo.singleClick && scene.onPrePointerObservable.hasSpecificMask(PointerEventTypes.POINTERTAP)) {
                                    if (this._checkPrePointerObservable(null, evt, PointerEventTypes.POINTERTAP)) {
                                        return;
                                    }
                                }
                                if (clickInfo.doubleClick && scene.onPrePointerObservable.hasSpecificMask(PointerEventTypes.POINTERDOUBLETAP)) {
                                    if (this._checkPrePointerObservable(null, evt, PointerEventTypes.POINTERDOUBLETAP)) {
                                        return;
                                    }
                                }
                            }
                            if (this._checkPrePointerObservable(null, evt, PointerEventTypes.POINTERUP)) {
                                return;
                            }
                        }
                    }

                    if (!this._pointerCaptures[evt.pointerId]) {
                        return;
                    }

                    this._pointerCaptures[evt.pointerId] = false;
                    if (!scene.cameraToUseForPointers && !scene.activeCamera) {
                        return;
                    }

                    if (!scene.pointerUpPredicate) {
                        scene.pointerUpPredicate = (mesh: AbstractMesh): boolean => {
                            return mesh.isPickable && mesh.isVisible && mesh.isReady() && mesh.isEnabled() && (!scene.cameraToUseForPointers || (scene.cameraToUseForPointers.layerMask & mesh.layerMask) !== 0);
                        };
                    }

                    // Meshes
                    if (!this._meshPickProceed && (AbstractActionManager && AbstractActionManager.HasTriggers || scene.onPointerObservable.hasObservers())) {
                        this._initActionManager(null, clickInfo);
                    }
                    if (!pickResult) {
                        pickResult = this._currentPickResult;
                    }

                    this._processPointerUp(pickResult, evt, clickInfo);

                    this._previousPickResult = this._currentPickResult;
                });
            };

            this._onKeyDown = (evt: KeyboardEvent) => {
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

            this._onKeyUp = (evt: KeyboardEvent) => {
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
            this._onCanvasFocusObserver = engine.onCanvasFocusObservable.add((() => {
                let fn = () => {
                    if (!elementToAttachTo) {
                        return;
                    }
                    elementToAttachTo.addEventListener("keydown", this._onKeyDown, false);
                    elementToAttachTo.addEventListener("keyup", this._onKeyUp, false);
                };
                if (document.activeElement === elementToAttachTo) {
                    fn();
                }
                return fn;
            })());

            this._onCanvasBlurObserver = engine.onCanvasBlurObservable.add(() => {
                if (!elementToAttachTo) {
                    return;
                }
                elementToAttachTo.removeEventListener("keydown", this._onKeyDown);
                elementToAttachTo.removeEventListener("keyup", this._onKeyUp);
            });

            // Pointer events
            var eventPrefix = "pointer";

            if (attachMove) {
                elementToAttachTo.addEventListener(eventPrefix + "move", <any>this._onPointerMove, false);

                // Wheel
                this._wheelEventName = "onwheel" in document.createElement("div") ? "wheel" :       // Modern browsers support "wheel"
                    (<any>document).onmousewheel !== undefined ? "mousewheel" :                     // Webkit and IE support at least "mousewheel"
                        "DOMMouseScroll";                                                           // let's assume that remaining browsers are older Firefox

                elementToAttachTo.addEventListener(this._wheelEventName, <any>this._onPointerMove, false);
            }
            if (attachDown) {
                elementToAttachTo.addEventListener(eventPrefix + "down", <any>this._onPointerDown, false);
            }

            if (attachUp) {
                //@ts-ignore
                let hostWindow = scene.getEngine().getHostWindow();
                if (hostWindow) {
                    hostWindow.addEventListener(eventPrefix + "up", <any>this._onPointerUp, false);
                }
            }

        }).bind(this._inputManager)(this, elementToAttachTo);
    }
    public terrainReady: Promise<void>;
    constructor(engine: Engine | WebGPUEngine, userinfo: loginProvider, public blazor: DotNet.BlazorInstance, ticks: number, private canvas: HTMLCanvasElement, private device: GPUDevice, glslang: { compileGLSL: (source: string, type: string) => Uint32Array }, private webSocket?: WebSocket) {
        super(engine as Engine);
        
        blazor.invokeMethod('setProgress', 21);
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
            for (var index = 0; index < this._scene.meshes.length; index++) {
                var mesh: TerraMesh = this._scene.meshes[index];
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
        this.tools['CameraTAB'] = new CameraTAB(this, canvas, DB);

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

        this.terrainReady = new Promise<[Terrain, Promise<GPUBuffer>]>(async (tres, trej) => {
            try {
                const groundP = Terrain.fromHeightMap('/images/tenerife3_75.webp', device, glslang);
                let cachedtexture = await caches.match(new Request('/terrainTexture.webp'));
                if (cachedtexture) {
                    let cacheimg = new Image();
                    cacheimg.src = URL.createObjectURL(await cachedtexture.blob());
                    
                    tres([await groundP,cacheimg.decode().then(() => {
                        let imgcanvas = new OffscreenCanvas(cacheimg.width, cacheimg.height);
                        let imgctx = imgcanvas.getContext('2d');
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
                const ground = await groundP;
                tres([ground, ground.createTexture(engine as WebGPUEngine)]);
                let obj = {
                    width: 10000,
                    height: 10000,
                    indices: new Uint32Array(ground.indices),
                    positions: new Float32Array(ground.positions),
                    uvs: new Float32Array(ground.uvs || [])
                };
                let trans2 = (await DB).transaction('maps', 'readwrite');
                trans2.objectStore('maps').add(obj);


            } catch (e) {
                trej(e);
            }
        }).then(gt => {
            blazor.invokeMethod('setProgress', 40);
            let [ground, texture] = gt;

            this.tools['Buildings'] = new BuildingsUI(this);
            let sea = new Sea(this);
            DB.then(d => {
                this.tools['Zones'] = new Zones(ground, d, shadermateria, this, (<CameraTAB>this.tools['CameraTAB']).camera, sea);
            })


            ground.checkCollisions = true;
            blazor.invokeMethod('setProgress', 50);
            ground.isPickable = true;
            // let plants = new Plants(this, (<CameraTAB>this.tools['CameraTAB']).camera, ground);
            this.getSceneUniformBuffer().update();
            this.tools['TerrainTool'] = new TerrainTool(this, ground, (<CameraTAB>this.tools['CameraTAB']).camera, device, glslang);
            blazor.invokeMethod('setProgress', 51);
            shadermateria.setVector3("lightPos", sunlight.position);
            blazor.invokeMethod('setProgress', 52);
            shadermateria.setVector3("cameraPosition", (<CameraTAB>this.tools['CameraTAB']).camera.position);

            // this.tools['Plants'] = new PlantsUI(ground, canvas, this, (<CameraTAB>this.tools['CameraTAB']).camera, sea, plants);
            blazor.invokeMethod('setProgress', 53);
            return texture.then(async gpuBuffer => {
                blazor.invokeMethod('setProgress', 75);
                
                //let size = new Float32Array(imgdata as ArrayBuffer, 0, 2);
                let size = [5120, 5120];


                //@ts-ignore
                let device: GPUDevice = (engine as WebGPUEngine)._device;


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
               /* if (gpuBuffer.label == 'computed') {
                    //Workaround for "Copy would overflow the buffer" begin
                    let arrayBuffer: ArrayBuffer = await gpuBuffer.mapReadAsync();
                    gpuBuffer.destroy();

                    const [textureDataBuffer, textureDataArrayBuffer] = device.createBufferMapped({
                        size: arrayBuffer.byteLength,
                        //@ts-ignore
                        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
                    });
                    new Uint8ClampedArray(textureDataArrayBuffer).set(new Uint8ClampedArray(arrayBuffer));
                    textureDataBuffer.unmap();
                    bufferView.buffer = textureDataBuffer
                    //Workaround end
                }*/
                blazor.invokeMethod('setProgress', 90);

                commandEncoder.copyBufferToTexture(bufferView,
                    {
                        texture: internaltex._webGPUTexture,
                        origin: {
                            x: 0,
                            y: 0,
                            z: 0
                    },
                    mipLevel: 0,
                    arrayLayer: Math.max(-1, 0),
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
                ground.material = grass2;
                blazor.invokeMethod('setProgress', 100);
                console.debug("Progress 100");
                
            })

            

        }).catch(e => {
            console.error(e);
            blazor.invokeMethod('setProgressError', e.name +' '+ e.message);
        })
    }
}
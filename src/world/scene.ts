import { Sun } from "./sun.js";
import { WorkerThread, WorkerReturn } from "../WorkerThread.js";
import { Plants } from "../plants/Plants.js";
import { PlantsUI } from "../tools/plantsUI.js";
import { Zones } from "../tools/zones.js";
import { CameraTAB } from "../tools/camera.js";
import { UITAB } from "../UITAB.js";
import { BuildingsUI } from "../tools/buildings.js";
import { TerrainTool } from "../tools/Terrain.js";
import { Terrain } from "./terrain.js";
import *  as Wasm from "../rustwasm/hello_wasm.js"

function isPromise(result: BABYLON.PickingInfo | Promise<BABYLON.PickingInfo>): result is Promise<BABYLON.PickingInfo> {
    return (result as Promise<BABYLON.PickingInfo>).then !== undefined;
}

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

export class WorldScene extends BABYLON.Scene {
    private gameSpeed = BigInt(0);
    private lastStateChangeGameTime = BigInt(21600 * 1000); //6 hours
    private lastStateChangeTime = new Date().getTime();
    private worker = new WorkerThread('/webworkers/sceneWorker.js');
    /*public getGameTime(): bigint {
        if (this.gameSpeed < 0)
            return this.lastStateChangeGameTime;
        let interval = new Date().getTime() - this.lastStateChangeTime;
        return this.lastStateChangeGameTime + (BigInt(interval * 60) << this.gameSpeed);
    }*/
    public currentGameTime: number;
    public SunObject: Sun;
    public terrainReady: Promise<Terrain>;

    public stateChange(data) {
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
                    if (camera.cameraRigMode !== BABYLON.Camera.RIG_MODE_NONE) {
                        // rig cameras
                        for (var index = 0; index < camera._rigCameras.length; index++) {
                            camera._rigCameras[index].update();
                        }
                    }
                }
            } else if (this.activeCamera) {
                this.activeCamera.update();
                if (this.activeCamera.cameraRigMode !== BABYLON.Camera.RIG_MODE_NONE) {
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
            BABYLON.Tools.StartPerformanceCounter("Custom render targets", this.customRenderTargets.length > 0);
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
            BABYLON.Tools.EndPerformanceCounter("Custom render targets", this.customRenderTargets.length > 0);
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
                (function () {
                    this._processSubCameras(this.activeCameras[cameraIndex]);
                }).bind(engine.scenes[0])();
                //this._processSubCameras(this.activeCameras[cameraIndex]);
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
    public attachControl(attachUp = true, attachDown = true, attachMove = true): void {
        //this._inputManager.attachControl(attachUp, attachDown, attachMove);

        (function(scene: BABYLON.Scene, elementToAttachTo: Nullable<HTMLElement> = null) {

            if (!elementToAttachTo) {
                //@ts-ignore
                elementToAttachTo = scene.getEngine().getInputElement();
            }

            if (!elementToAttachTo) {
                return;
            }

            let engine = scene.getEngine();

            this._initActionManager = (act: Nullable<BABYLON.AbstractActionManager>, clickInfo): Nullable<BABYLON.AbstractActionManager> => {
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

            this._delayedSimpleClick = (btn: number, clickInfo, cb: (clickInfo, pickResult: Nullable<BABYLON.PickingInfo>) => void) => {
                // double click delay is over and that no double click has been raised since, or the 2 consecutive keys pressed are different
                if ((Date.now() - this._previousStartingPointerTime > BABYLON.InputManager.DoubleClickDelay && !this._doubleClickOccured) ||
                    btn !== this._previousButtonPressed) {
                    this._doubleClickOccured = false;
                    clickInfo.singleClick = true;
                    clickInfo.ignore = false;
                    cb(clickInfo, this._currentPickResult);
                }
            };

            this._initClickEvent = (obs1: BABYLON.Observable<BABYLON.PointerInfoPre>, obs2: BABYLON.Observable<BABYLON.PointerInfo>, evt: PointerEvent, cb: (clickInfo, pickResult: Nullable<BABYLON.PickingInfo>) => void): void => {
                let clickInfo = new _ClickInfo();
                this._currentPickResult = null;
                let act: Nullable<BABYLON.AbstractActionManager> = null;

                let checkPicking = obs1.hasSpecificMask(BABYLON.PointerEventTypes.POINTERPICK) || obs2.hasSpecificMask(BABYLON.PointerEventTypes.POINTERPICK)
                    || obs1.hasSpecificMask(BABYLON.PointerEventTypes.POINTERTAP) || obs2.hasSpecificMask(BABYLON.PointerEventTypes.POINTERTAP)
                    || obs1.hasSpecificMask(BABYLON.PointerEventTypes.POINTERDOUBLETAP) || obs2.hasSpecificMask(BABYLON.PointerEventTypes.POINTERDOUBLETAP);
                if (!checkPicking && BABYLON.AbstractActionManager) {
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
                        let checkSingleClickImmediately = !BABYLON.InputManager.ExclusiveDoubleClickMode;

                        if (!checkSingleClickImmediately) {
                            checkSingleClickImmediately = !obs1.hasSpecificMask(BABYLON.PointerEventTypes.POINTERDOUBLETAP) &&
                                !obs2.hasSpecificMask(BABYLON.PointerEventTypes.POINTERDOUBLETAP);

                            if (checkSingleClickImmediately && !BABYLON.AbstractActionManager.HasSpecificTrigger(BABYLON.Constants.ACTION_OnDoublePickTrigger)) {
                                act = this._initActionManager(act, clickInfo);
                                if (act) {
                                    checkSingleClickImmediately = !act.hasSpecificTrigger(BABYLON.Constants.ACTION_OnDoublePickTrigger);
                                }
                            }
                        }

                        if (checkSingleClickImmediately) {
                            // single click detected if double click delay is over or two different successive keys pressed without exclusive double click or no double click required
                            if (Date.now() - this._previousStartingPointerTime > BABYLON.InputManager.DoubleClickDelay ||
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
                            this._delayedSimpleClickTimeout = window.setTimeout(this._delayedSimpleClick.bind(this, btn, clickInfo, cb), BABYLON.InputManager.DoubleClickDelay);
                        }

                        let checkDoubleClick = obs1.hasSpecificMask(BABYLON.PointerEventTypes.POINTERDOUBLETAP) ||
                            obs2.hasSpecificMask(BABYLON.PointerEventTypes.POINTERDOUBLETAP);
                        if (!checkDoubleClick && BABYLON.AbstractActionManager.HasSpecificTrigger(BABYLON.Constants.ACTION_OnDoublePickTrigger)) {
                            act = this._initActionManager(act, clickInfo);
                            if (act) {
                                checkDoubleClick = act.hasSpecificTrigger(BABYLON.Constants.ACTION_OnDoublePickTrigger);
                            }
                        }
                        if (checkDoubleClick) {
                            // two successive keys pressed are equal, double click delay is not over and double click has not just occurred
                            if (btn === this._previousButtonPressed &&
                                Date.now() - this._previousStartingPointerTime < BABYLON.InputManager.DoubleClickDelay &&
                                !this._doubleClickOccured
                            ) {
                                // pointer has not moved for 2 clicks, it's a double click
                                if (!clickInfo.hasSwiped &&
                                    !this._isPointerSwiping()) {
                                    this._previousStartingPointerTime = 0;
                                    this._doubleClickOccured = true;
                                    clickInfo.doubleClick = true;
                                    clickInfo.ignore = false;
                                    if (BABYLON.InputManager.ExclusiveDoubleClickMode && this._previousDelayedSimpleClickTimeout) {
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
                                    if (BABYLON.InputManager.ExclusiveDoubleClickMode) {
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
                if (this._checkPrePointerObservable(null, evt, evt.type === this._wheelEventName ? BABYLON.PointerEventTypes.POINTERWHEEL : BABYLON.PointerEventTypes.POINTERMOVE)) {
                    return;
                }

                if (!scene.cameraToUseForPointers && !scene.activeCamera) {
                    return;
                }

                if (!scene.pointerMovePredicate) {
                    scene.pointerMovePredicate = (mesh: BABYLON.AbstractMesh): boolean => (mesh.isPickable && mesh.isVisible && mesh.isReady() && mesh.isEnabled() && (mesh.enablePointerMoveEvents || scene.constantlyUpdateMeshUnderPointer || (mesh._getActionManagerForTrigger() != null)) && (!scene.cameraToUseForPointers || (scene.cameraToUseForPointers.layerMask & mesh.layerMask) !== 0));
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
                if (this._checkPrePointerObservable(null, evt, BABYLON.PointerEventTypes.POINTERDOWN)) {
                    return;
                }

                if (!scene.cameraToUseForPointers && !scene.activeCamera) {
                    return;
                }

                this._pointerCaptures[evt.pointerId] = true;

                if (!scene.pointerDownPredicate) {
                    scene.pointerDownPredicate = (mesh: BABYLON.AbstractMesh): boolean => {
                        return mesh.isPickable && mesh.isVisible && mesh.isReady() && mesh.isEnabled() && (!scene.cameraToUseForPointers || (scene.cameraToUseForPointers.layerMask & mesh.layerMask) !== 0);
                    };
                }

                // Meshes
                this._pickedDownMesh = null;
                let fastCheck = false;
                let rayFunction = (world) => {
                    if (!scene._tempPickingRay) {
                        scene._tempPickingRay = BABYLON.Ray.Zero();
                    }

                    scene.createPickingRayToRef(this._unTranslatedPointerX, this._unTranslatedPointerY, world, scene._tempPickingRay, scene.cameraToUseForPointers || null);
                    return scene._tempPickingRay;
                };

                (function collissionCheck(meshIndex: number, pickResult: BABYLON.PickingInfo | null) {
                    if (meshIndex > scene.meshes.length - 1)
                        return null;
                    let mesh = scene.meshes[meshIndex] as Terrain;

                    if (scene.pointerDownPredicate) {
                        if (!scene.pointerDownPredicate(mesh))
                            return collissionCheck(++meshIndex, pickResult);
                    } else if (!mesh.isEnabled() || !mesh.isVisible || !mesh.isPickable)
                        return collissionCheck(++meshIndex, pickResult);




                    return new Promise((res) => {
                        var world = mesh.getWorldMatrix();
                        var ray = rayFunction(world);
                        if (typeof (mesh.intersectsPromise) !== 'undefined') {
                            mesh.intersectsPromise(ray, fastCheck).then(res);
                        } else {
                            
                            res(mesh.intersects(ray, fastCheck));
                        }
                    }).then((result: BABYLON.PickingInfo) => {
                        if (!result || !result.hit)
                            return collissionCheck(++meshIndex, pickResult);
                        if (!fastCheck && pickResult != null && result.distance >= pickResult.distance)
                            return collissionCheck(++meshIndex, pickResult);

                        if (fastCheck)
                            return result;
                        else
                            return collissionCheck(++meshIndex, result);
                    });
                })(0, null).then((pickResult: BABYLON.PickingInfo) => {
                    if (pickResult == null)
                        pickResult = new BABYLON.PickingInfo();
                    if (pickResult)
                        pickResult.ray = scene.createPickingRay(this._unTranslatedPointerX, this._unTranslatedPointerY, BABYLON.Matrix.Identity(), scene.cameraToUseForPointers || null);

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

                this._initClickEvent(scene.onPrePointerObservable, scene.onPointerObservable, evt, (clickInfo: _ClickInfo, pickResult: Nullable<BABYLON.PickingInfo>) => {
                    // PreObservable support
                    if (scene.onPrePointerObservable.hasObservers()) {
                        if (!clickInfo.ignore) {
                            if (!clickInfo.hasSwiped) {
                                if (clickInfo.singleClick && scene.onPrePointerObservable.hasSpecificMask(BABYLON.PointerEventTypes.POINTERTAP)) {
                                    if (this._checkPrePointerObservable(null, evt, BABYLON.PointerEventTypes.POINTERTAP)) {
                                        return;
                                    }
                                }
                                if (clickInfo.doubleClick && scene.onPrePointerObservable.hasSpecificMask(BABYLON.PointerEventTypes.POINTERDOUBLETAP)) {
                                    if (this._checkPrePointerObservable(null, evt, BABYLON.PointerEventTypes.POINTERDOUBLETAP)) {
                                        return;
                                    }
                                }
                            }
                            if (this._checkPrePointerObservable(null, evt, BABYLON.PointerEventTypes.POINTERUP)) {
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
                        scene.pointerUpPredicate = (mesh: BABYLON.AbstractMesh): boolean => {
                            return mesh.isPickable && mesh.isVisible && mesh.isReady() && mesh.isEnabled() && (!scene.cameraToUseForPointers || (scene.cameraToUseForPointers.layerMask & mesh.layerMask) !== 0);
                        };
                    }

                    // Meshes
                    if (!this._meshPickProceed && (BABYLON.AbstractActionManager && BABYLON.AbstractActionManager.HasTriggers || scene.onPointerObservable.hasObservers())) {
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
                let type = BABYLON.KeyboardEventTypes.KEYDOWN;
                if (scene.onPreKeyboardObservable.hasObservers()) {
                    let pi = new BABYLON.KeyboardInfoPre(type, evt);
                    scene.onPreKeyboardObservable.notifyObservers(pi, type);
                    if (pi.skipOnPointerObservable) {
                        return;
                    }
                }

                if (scene.onKeyboardObservable.hasObservers()) {
                    let pi = new BABYLON.KeyboardInfo(type, evt);
                    scene.onKeyboardObservable.notifyObservers(pi, type);
                }

                if (scene.actionManager) {
                    scene.actionManager.processTrigger(BABYLON.Constants.ACTION_OnKeyDownTrigger, BABYLON.ActionEvent.CreateNewFromScene(scene, evt));
                }
            };

            this._onKeyUp = (evt: KeyboardEvent) => {
                let type = BABYLON.KeyboardEventTypes.KEYUP;
                if (scene.onPreKeyboardObservable.hasObservers()) {
                    let pi = new BABYLON.KeyboardInfoPre(type, evt);
                    scene.onPreKeyboardObservable.notifyObservers(pi, type);
                    if (pi.skipOnPointerObservable) {
                        return;
                    }
                }

                if (scene.onKeyboardObservable.hasObservers()) {
                    let pi = new BABYLON.KeyboardInfo(type, evt);
                    scene.onKeyboardObservable.notifyObservers(pi, type);
                }

                if (scene.actionManager) {
                    scene.actionManager.processTrigger(BABYLON.Constants.ACTION_OnKeyUpTrigger, BABYLON.ActionEvent.CreateNewFromScene(scene, evt));
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
            var eventPrefix = BABYLON.Tools.GetPointerPrefix();

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

        }).bind(this._inputManager)(this)
    }
    constructor(engine: BABYLON.Engine, userinfo: loginProvider, public blazor: DotNet.BlazorInstance, ticks: number,progelem:HTMLProgressElement, private webSocket?: WebSocket) {
        super(engine);
        if (webSocket) {
            this.webSocket.send(JSON.stringify({ action: 'init', data: { userinfo, ticks } }));
            this.webSocket.onmessage = (e) => {
                let msg = JSON.parse(e.data);
                if (msg.action == 'init') {
                    console.log('going to init game', msg.currentPlayData)
                    blazor.invokeMethod('initGame', msg.currentPlayData);
                }
            }
        } else {
            console.log('initing without websocket connection');
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
        this.tools['CameraTAB'] = new CameraTAB(this, engine.getRenderingCanvas(), DB);

        //let ui = new UI();
        //ui.registerTab(CameraTab);
        var sunlight = new BABYLON.PointLight("Omni", this.SunObject.sunPosition, this);
        let shadermateria = new BABYLON.ShaderMaterial("shader", this, "./shaders/ground",
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
        let sea: BABYLON.Mesh;
        this.terrainReady = new Promise(async (ccres, ccrej) => {
            let db = (await DB);
            let trans = db.transaction('maps');
            trans.onerror = ccrej;
            trans.objectStore('maps').openCursor().onsuccess = async (evt) => {
                try {
                    progelem.value = 40;
                    if ((<IDBRequest>evt.target).result) {
                        ccres((<IDBRequest>evt.target).result.value);
                    }
                    else {
                        /*
        Uncaught (in promise) RangeError: Failed to execute 'getImageData' on 'CanvasRenderingContext2D': Out of memory at ImageData creation
        at Image.img.onload (scene.js:106)
        
           terrainmap getimagedata took  3641,1757
        */
                        let tbuffer = await this.worker.message<{ buffer: Uint8ClampedArray, width: number, height: number }>(WorkerReturn.Promise, 'createHeightMap', {});
                        progelem.value = 50;
                        let buffer = new Uint8ClampedArray(tbuffer.buffer);
                        console.log('buffer', buffer);
                        var vertexData = VERTEX_CreateGroundFromHeightMap({
                            width: tbuffer.width, height: tbuffer.height,
                            subdivisions: 250,
                            minHeight: -2, maxHeight: 250, colorFilter: new BABYLON.Color3(0.3, 0.59, 0.11),
                            buffer: buffer, bufferWidth: tbuffer.width, bufferHeight: tbuffer.height,
                            alphaFilter: 0.0
                        });
                        let obj = {
                            width: tbuffer.width,
                            height: tbuffer.height,
                            indices: Uint32Array.from(vertexData.indices),
                            normals: Float32Array.from(vertexData.normals),
                            positions: Float32Array.from(vertexData.positions),
                            uvs: Float32Array.from(vertexData.uvs)
                        };
                        let trans2 = db.transaction('maps', 'readwrite');
                        trans2.onerror = ccrej;
                        trans2.objectStore('maps').add(obj).onsuccess = () => {
                            trans2.objectStore('maps').openCursor().onsuccess = (e) => {
                                ccres(<IDBCursorWithValue>(<IDBRequest>e.target).result.value)
                            }
                        }
                    }
                    /* Uncaught (in promise) The ImageBitmap could not be allocated. */
                } catch (e) {
                    ccrej(e);
                }
            };
        }).then(async (vdata: TerrainMap) => {
            progelem.value = 60;
            /* Wait webassembly to be initialized so we can use its functions on world modules */
            await Wasm.default();

            let ground = new Terrain(vdata, this, Wasm);

            sea = BABYLON.Mesh.CreateGround("waterMesh", 10000, 10000, 1, this, false);
            let plants = new Plants(this, (<CameraTAB>this.tools['CameraTAB']).camera, ground);
            this.tools['TerrainTool'] = new TerrainTool(this, ground, (<CameraTAB>this.tools['CameraTAB']).camera);
            let gl: WebGLRenderingContext = engine._gl;

            shadermateria.setVector3("lightPos", sunlight.position);
            shadermateria.setVector3("cameraPosition", (<CameraTAB>this.tools['CameraTAB']).camera.position);
            new Promise(async (tres, trej) => {
                if (typeof (vdata.texture) === 'undefined') {
                    let c = document.createElement('canvas');
                    c.width = 10000;
                    c.height = 10000;
                    let ctx = c.getContext("2d");
                    ctx.beginPath();
                    ctx.fillStyle = "#e0e031";
                    ctx.fillRect(0, 0, 10000, 10000);

                    let centerX = c.width / 2
                    let centerZ = c.height / 2
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.translate(centerX, centerZ);
                    let minZ = centerZ - c.height
                    ctx.fillStyle = "green";
                    await ground.inited;
                    console.log('ground ready');
                    for (let row = centerX - c.width + 1; row < centerX; row = row + 2) {
                        for (let col = minZ + 1; col < centerZ; col = col += 2) {
                            let height = ground.getHeightAtCoordinates(row, col)
                            if (height > 3) {
                                ctx.fillRect(row, col * -1, 3, 3);
                            }
                        }
                    }
                    c.toBlob(async b => {
                        vdata.texture = b;
                        tres(b);
                        (await DB).transaction('maps', 'readwrite').objectStore('maps').put(vdata);
                    }, 'image/webp', 1);
                } else
                    tres(vdata.texture);
            }).then((b: Blob) => {
                progelem.value = 70;
                let img = new Image();
                img.onload = () => {
                    progelem.value = 80;
                    let width = 10000;
                    let rtexture2 = { //https://github.com/BabylonJS/Babylon.js/blob/f287a1ea59027b97cb917850a5079c2e03d8fce4/src/Materials/Textures/internalTexture.ts
                        _engine: engine,
                        _source: 3,
                        _webGLTexture: gl.createTexture()
                    }

                    //engine.updateRawTexture(rtexture2, imagedata.data, BABYLON.Engine.TEXTUREFORMAT_RGBA, true, null, BABYLON.Constants.TEXTURETYPE_UNSIGNED_INT);
                    //@ts-ignore
                    engine._bindTextureDirectly(gl.TEXTURE_2D, rtexture2, true);
                    //gl.bindTexture(gl.TEXTURE_2D, ntexture);
                    engine._unpackFlipY(true);
                    if (width % 4 !== 0) {
                        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
                    }
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);

                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

                    engine._bindTextureDirectly(gl.TEXTURE_2D, null);
                    //gl.bindTexture(gl.TEXTURE_2D, null);
                    //   engine._internalTexturesCache.push(rtexture2);


                    (function () {
                        this._options.samplers.push('groundTexture');
                        //@ts-ignore
                        this._textures['groundTexture'] = <BABYLON.Texture>{
                            getInternalTexture: () => rtexture2, //(<BABYLON.InternalTexture>{ _associatedChannel: -1 }), //rtexture2,
                            isReady: () => true,
                            wrapU: BABYLON.Texture.CLAMP_ADDRESSMODE,
                            wrapV: BABYLON.Texture.CLAMP_ADDRESSMODE
                        };
                        return this;
                    }).bind(shadermateria)();
                    ground.material = shadermateria;
                    this.tools['Plants'] = new PlantsUI(ground, engine.getRenderingCanvas(), this, (<CameraTAB>this.tools['CameraTAB']).camera, sea, plants);
                }
                img.src = URL.createObjectURL(b);


                //let groundtexture = new BABYLON.Texture(URL.createObjectURL(b), this, undefined, undefined, undefined, undefined, (e) => { throw (e) });
                //shadermateria.setTexture('groundTexture', groundtexture);


                //this.tools['Plants'] = new PlantsUI(ground, engine.getRenderingCanvas(), this, (<CameraTAB>this.tools['CameraTAB']).camera, sea, groundtexture, plants);
            });

            return ground
        });
        this.terrainReady.catch((e) => {
            console.error('creating terrain failed', e);
            progelem.parentNode.textContent = e;
        })
        this.terrainReady.then((terrain: Terrain) => {
            progelem.parentElement.style.display = 'none';
            /* Promise.all([CSG.fromMesh(this.mesh), CSG.fromMesh(grassbox)]).then(r => {
                 if (thismeshoperation !== meshoperatiocount) {
                     r[0].dispose();
                     r[1].dispose();
                     return;
                 }
                 r[0].intersect(r[1]).then(newcsg => {
                     r[0].dispose();
                     r[1].dispose();
                     if (thismeshoperation !== meshoperatiocount) {
                         
                         newcsg.dispose();
                         return;
                     }
                     newcsg.toMesh("unined", brown, scene, true).then(newmesh => {
                         newcsg.dispose();
                         if (typeof (oldmesh) !== 'undefined') {
                             if (thismeshoperation !== meshoperatiocount) {
                                 newmesh.dispose();
                                 return;
                             }
                             oldmesh.dispose();
                         }
                         oldmesh = newmesh;
                         newmesh.position.y += 4;
                     });
                 });
             })*/
            /*   var aCSG = BABYLON.CSG.FromMesh(terrain);
    
               var bCSG = BABYLON.CSG.FromMesh(grassbox);
    
               
               let unioned=aCSG.intersect(bCSG); //SLOW
               if (typeof (oldmesh) !== 'undefined')
                 oldmesh.dispose();
               let newmesh=unioned.toMesh("unined",brown,scene,true);
               oldmesh = newmesh;
               newmesh.position.y+=4;*/

            /*   }
           }, scene);*/

            // canvas.addEventListener("pointerdown", DZ.mainPointerDown, false);
            terrain.isPickable = true;

            //var seaground = BABYLON.Mesh.CreateGround("ground", 3601, 3601, 1, scene, false);
            //seaground.position.y = -1.5;
            sea.position.y = 0;

            this.tools['Buildings'] = new BuildingsUI(this);

            DB.then(d => {
                this.tools['Zones'] = new Zones(terrain, d, shadermateria, this, (<CameraTAB>this.tools['CameraTAB']).camera, sea);
            })
            var waterMaterial = new BABYLON.WaterMaterial("waterMaterial", this, new BABYLON.Vector2(512, 512));
            waterMaterial.bumpTexture = new BABYLON.Texture("images/waterbump.png", this);
            waterMaterial.windForce = -10;
            waterMaterial.waveHeight = 0.4;
            waterMaterial.bumpHeight = 0.1;
            waterMaterial.waveLength = 0.1;
            waterMaterial.waveSpeed = 50.0;
            waterMaterial.colorBlendFactor = 0;
            waterMaterial.windDirection = new BABYLON.Vector2(1, 1);
            waterMaterial.colorBlendFactor = 0;
            waterMaterial.addToRenderList(terrain);
            sea.material = waterMaterial;


            terrain.checkCollisions = true;
            //Object.defineProperty(terrain, 'checkCollisions', { get: function () { debugger; return true; } } )
            var green = new BABYLON.StandardMaterial("green", this);

            green.diffuseColor = new BABYLON.Color3(0, 1, 0);


            /*  BABYLON.SceneLoader.ImportMesh("", "", "tree.babylon", this, function (mesh) {
                  let treemesh = mesh[0];
                  (<BABYLON.StandardMaterial>treemesh.material).opacityTexture = null;
                  treemesh.material.backFaceCulling = false;
                  treemesh.isVisible = false;
                  if (DT) {
                      ctx.setTransform(1, 0, 0, 1, 0, 0);
                      ctx.translate(centerX, centerZ);
                      ctx.fillStyle = "#654321";
                  }
                  for (let row = -5000; row < 5000; row = row + 8) {
                      for (let col = -5000; col < 5000; col = col += 8) {
                          let height = terrain.getHeightFromMap(row, col)
                          //let height = ground.getHeightAtCoordinates(row, col);
                          if (height > 40 && height < 110) {
                              let newInstance = (<BABYLON.Mesh>treemesh).createInstance("i" + row.toString() + col.toString());
                              newInstance.position.z = col + 8 * Math.random();
                              newInstance.position.x = row + 8 * Math.random();
                              newInstance.position.y = height;
                              newInstance.rotate(BABYLON.Axis.Y, Math.random() * Math.PI * 2, BABYLON.Space.WORLD);
      
                              var scale = 0.5 + Math.random() * 2;
                              newInstance.scaling.addInPlace(new BABYLON.Vector3(scale, scale, scale));
                              DT && ctx.fillRect(row, col * -1, 10, 10);
                          }
                      }
                  }
                  if (DT) {
                      ctx.fill();
                      grass.update();
                  }
  
  
                  return this;
              });*/

            let buildings: BABYLON.Mesh[] = [];

            let size = 10000
            /* DB.then(db => {
                 let centerX = size / 2
                 let centerZ = size / 2
                 window.setInterval(() => {
                     db.transaction("zones").objectStore("zones").getAll().onsuccess = function (evt) {
                         this.result.forEach(z => {
                             let height = terrain.getHeightFromMap(row, col)
                             let width = 50;
                             let depth = 50;
    
                             let box = BABYLON.MeshBuilder.CreateBox("myBox", {
                                 height: 20,
                                 width,
                                 depth
                             }, scene);
                             box.position.x = z.coord.x;
                             box.position.z = z.coord.z * -1;
                             // for (let i = 0; i < buildings.length; i++) {
                               //   if (box.intersectsMesh(buildings[i], true)) {
                              //        box.position.x++;
                              //        i = 0;
                              //    }
                             // }
                             buildings.push(box);
                         })
                     }
                 }, 1000)
    
             });*/

        }).catch(e => console.log(e));
    }
}
function VERTEX_CreateGroundFromHeightMap(options: { width: number, height: number, subdivisions: number, minHeight: number, maxHeight: number, colorFilter: BABYLON.Color3, buffer: Uint8ClampedArray, bufferWidth: number, bufferHeight: number, alphaFilter: number }): BABYLON.VertexData {
    var indices = [];
    var positions = [];
    var normals = [];
    var uvs = [];
    var row, col;
    var filter = options.colorFilter || new BABYLON.Color3(0.3, 0.59, 0.11);
    var alphaFilter = options.alphaFilter || 0.0;
    var invert = false;

    if (options.minHeight > options.maxHeight) {
        invert = true;
        let temp = options.maxHeight;
        options.maxHeight = options.minHeight;
        options.minHeight = temp;
    }

    // Vertices
    for (row = 0; row <= options.subdivisions; row++) {
        for (col = 0; col <= options.subdivisions; col++) {
            var position = new BABYLON.Vector3((col * options.width) / options.subdivisions - (options.width / 2.0), 0, ((options.subdivisions - row) * options.height) / options.subdivisions - (options.height / 2.0));

            // Compute height
            var heightMapX = (((position.x + options.width / 2) / options.width) * (options.bufferWidth - 1)) | 0;
            var heightMapY = ((1.0 - (position.z + options.height / 2) / options.height) * (options.bufferHeight - 1)) | 0;

            var pos = (heightMapX + heightMapY * options.bufferWidth) * 4;
            var r = options.buffer[pos] / 255.0;
            var g = options.buffer[pos + 1] / 255.0;
            var b = options.buffer[pos + 2] / 255.0;
            var a = options.buffer[pos + 3] / 255.0;

            if (invert) {
                r = 1.0 - r;
                g = 1.0 - g;
                b = 1.0 - b;
            }

            var gradient = r * filter.r + g * filter.g + b * filter.b;

            // If our alpha channel is not within our filter then we will assign a 'special' height
            // Then when building the indices, we will ignore any vertex that is using the special height
            if (a >= alphaFilter) {
                position.y = options.minHeight + (options.maxHeight - options.minHeight) * gradient;
            }
            else {
                position.y = options.minHeight - BABYLON.Epsilon; // We can't have a height below minHeight, normally.
            }

            // Add  vertex
            positions.push(position.x, position.y, position.z);
            normals.push(0, 0, 0);
            uvs.push(col / options.subdivisions, 1.0 - row / options.subdivisions);
        }
    }

    // Indices
    for (row = 0; row < options.subdivisions; row++) {
        for (col = 0; col < options.subdivisions; col++) {
            // Calculate Indices
            var idx1 = (col + 1 + (row + 1) * (options.subdivisions + 1));
            var idx2 = (col + 1 + row * (options.subdivisions + 1));
            var idx3 = (col + row * (options.subdivisions + 1));
            var idx4 = (col + (row + 1) * (options.subdivisions + 1));

            // Check that all indices are visible (based on our special height)
            // Only display the vertex if all Indices are visible
            // Positions are stored x,y,z for each vertex, hence the * 3 and + 1 for height
            var isVisibleIdx1 = positions[idx1 * 3 + 1] >= options.minHeight;
            var isVisibleIdx2 = positions[idx2 * 3 + 1] >= options.minHeight;
            var isVisibleIdx3 = positions[idx3 * 3 + 1] >= options.minHeight;
            if (isVisibleIdx1 && isVisibleIdx2 && isVisibleIdx3) {
                indices.push(idx1);
                indices.push(idx2);
                indices.push(idx3);
            }

            var isVisibleIdx4 = positions[idx4 * 3 + 1] >= options.minHeight;
            if (isVisibleIdx4 && isVisibleIdx1 && isVisibleIdx3) {
                indices.push(idx4);
                indices.push(idx1);
                indices.push(idx3);
            }
        }
    }

    // Normals
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    // Result
    var vertexData = new BABYLON.VertexData();

    vertexData.indices = indices;
    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    return vertexData;
};
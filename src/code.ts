
//import type { WorldScene } from "./world/scene.js";
//import * as BABYLON from "./lib/babylon/index.js"
import type { loginProvider, DotNet, savedCamera } from "./types/interfaces/index.js";
import { Plants } from "./plants/Plants.js";
import { UITAB, UITABClassLike } from "./UITAB.js";
import { PlantsUI } from "./tools/plantsUI.js";
import { CameraTAB } from "./tools/camera.js";
import { BuildingsUI } from "./tools/buildings.js";
import { TerrainTool } from "./tools/Terrain.js";
import { Zones } from "./tools/zones.js";
import { Terrain } from "./world/terrain.js";
//import { testPlane, testPlaneNormals } from "./world/tests/testPlane.js";
import { Sea } from "./world/water.js";
import { Vector3, Matrix, Quaternion } from "./lib/babylon/Maths/math.vector";
import { LazyEval } from "./LazyEval.js";
import { GPU } from "./GPU.js";
import { RenderPass, RenderPassCanvas } from "./GPU/RenderPass.js";
import { Box } from "./GPU/Meshes/Box.js";
import { ArcRotateCamera } from "./lib/babylon/Cameras/arcRotateCamera.js";
import { TerraCamera } from "./TerraCamera.js";
import { TerraScene } from "./TerraScene.js";
import { Engine } from "./engine.js";
import { Sun2 } from "./world/sun2.js";
import { PositionNode } from "./TerraNode.js";
//import { DefaultCollisionCoordinator } from "./lib/babylon/Collisions/collisionCoordinator.js";
//import { AbstractMesh } from "./lib/babylon/Meshes/abstractMesh.js";
import { Scene } from "./Scene.js";


//import  DB from "./DB.js";

//let zones: Zone[] = [];







/*let DB: Promise<IDBDatabase> = new Promise(function (res, rej) {
    var IDB = window.indexedDB.open("City", 2);
    IDB.onupgradeneeded = function () {
        // Save the IDBDatabase interface 
        var db = this.result;
        // Create an objectStore for this database
        if (db.version < 2) {
            db.createObjectStore("zones", { keyPath: "id", autoIncrement: true });
        }
        db.createObjectStore("save", { keyPath: "id", autoIncrement: true });
    };
    IDB.onsuccess = function (event) {
        res(this.result);
    }
})*/

declare global {
    interface Window {
        engine: Engine;
        login: (e: PointerEvent, method: "facebook" | "anomyous") => void;
        Wasm: any
    }
}
declare var BlazorRouter: DotNet.BlazorInstance;
let loadelem = document.body.appendChild(document.createElement("div"));
//let progelem = loadelem.appendChild(document.createElement("progress"))
loadelem.style.position = 'absolute';
loadelem.style.right = '30%';
loadelem.style.top = '30%';
loadelem.style.display = 'none';
var loginPromise: Promise<loginProvider> = new Promise<loginProvider>(login => {
    window.login = async (e: PointerEvent, method: "facebook" | "anomyous") => {
        loadelem.style.display = 'block';
        // blazor.invokeMethod('setProgress', 0);
        //progelem.max = 100;
        //progelem.value = 0;
        if (method == "facebook") {
            FB.login(() => {
                FB.init({
                    appId: '417236772473746',
                    cookie: true,
                    xfbml: true,
                    version: 'v4.0'
                });
                FB.AppEvents.logPageView();
                FB.Event.subscribe('auth.login', async (response) => {
                    //progelem.value = 5;
                    (await BlazorRouter).invokeMethod('startGame');
                    //progelem.value = 10;
                    login({ provider: 'facebook', accessToken: response.authResponse.accessToken, userID: response.authResponse.userID, pointerEvent: e });
                });
                FB.getLoginStatus(async (response) => {
                    if (response.status === 'connected') {
                        // progelem.value = 5;
                        (await BlazorRouter).invokeMethod('startGame');
                        // progelem.value = 10;
                        login({ provider: 'facebook', accessToken: response.authResponse.accessToken, userID: response.authResponse.userID, pointerEvent: e });
                    }
                });
            }, { scope: "email" });
        } else {
            //progelem.value = 5;
            (await BlazorRouter).invokeMethod('startGame');
            //progelem.value = 10;
            if (typeof (localStorage.accessToken) === 'undefined')
                localStorage.accessToken = new Date().getTime().toString() + navigator.userAgent;
            login({ provider: 'anomyous', accessToken: localStorage.accessToken, pointerEvent: e });
        }
    }
});


(<any>window).initCanvas = async function (blazor: DotNet.BlazorInstance, ticks: number, canvas: HTMLCanvasElement) {
    try {
        let [WasmModuleP, EngineModuleP] = ['./rustwasm/hello_wasm.js', './lib/babylon/Engines/webgpuEngine.js'].map(url => import(url));
        if (canvas.dataset.inited === "true")
            return;
        canvas.dataset.inited = "true";

        //  const cache2 = await caches.open('compiledShaders');
        //try {
        let WasmModule = await WasmModuleP;
        blazor.invokeMethod('setProgress', 2);
        let EngineModule = await EngineModuleP;
        blazor.invokeMethod('setProgress', 3);
        var engine: any = new EngineModule.WebGPUEngine(<HTMLCanvasElement>canvas, { antialiasing: false });
        blazor.invokeMethod('setProgress', 4);
        const scenePromise = new Promise<void>(async (sceneInitedred, sceneInitedrej) => {
            const adapter = await window.navigator.gpu!.requestAdapter();
            blazor.invokeMethod('setProgress', 5);
            if (!adapter)
                throw ('No adapter');
            const device = await adapter.requestDevice();
            if (!device)
                throw ('no GPU device');
            const gpuscene = new GPU(device, (gpu) => {
                return [
                    new RenderPassCanvas(gpu, 4, true, canvas.width, canvas.height, { r: 0.53, g: 0.8, b: 0.92, a: 1.0 }, (w, h) => [w, h], undefined, canvas),
                    new RenderPass(gpu, 1, false, canvas.width, canvas.height, { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }, (w, h) => [w, h], GPUTextureUsage.SAMPLED)
                ]
            });
            blazor.invokeMethod('setProgress', 6);

            const CACHE_NAME = 'terrasim-v1';
            let shadersP: Promise<{ [key: string]: string }> = fetch('/shaders/shaders.json').then(s => s.json());
            const cache = await caches.open(CACHE_NAME);
            blazor.invokeMethod('setProgress', 7);

            const glslang: { compileGLSL: (source: string, type: string) => Uint32Array } = await new Promise((res, rej) => {
                const glslangOptions = {
                    jsPath: "https://preview.babylonjs.com/glslang/glslang.js",
                    wasmPath: "https://preview.babylonjs.com/glslang/glslang.wasm",
                    glslang: undefined
                };
                if ((window as any).glslang)
                    res((window as any).glslang(glslangOptions!.wasmPath));

                let script = document.createElement('script');
                script.onload = () => res((window as any).glslang(glslangOptions!.wasmPath));
                script.onerror = rej;
                script.src = glslangOptions.jsPath;
                document.head.appendChild(script);
            });
            blazor.invokeMethod('setProgress', 8);
            const jsondata = await shadersP
            const shaderPuts: Promise<void>[] = [];

            for (var file in jsondata) {
                shaderPuts.push(cache.put(new Request('/shaders/' + file), new Response(jsondata[file])));
                if (jsondata[file].substr(0, 12) == '#version 450') {
                    let type: string = 'vertex';
                    if (file.substr(-5) == '.frag')
                        type = 'fragment';
                    else if (file.substr(-5) == '.comp')
                        type = 'compute';
                    const compiled = glslang.compileGLSL(jsondata[file], type);

                    gpuscene.shaderModules.set(file, gpuscene.device.createShaderModule({
                        code: compiled,
                    }));
                }
            }
            blazor.invokeMethod('setProgress', 9);
            await Promise.all(shaderPuts);
            blazor.invokeMethod('setProgress', 10);

            blazor.invokeMethod('setProgress', 11);

            

            const projectionmatrixBuffer = new SharedArrayBuffer(16 * 4);
            const projectionmatrix = new Float32Array(projectionmatrixBuffer);
            blazor.invokeMethod('setProgress', 12);
            const terraEngine = new Engine(gpuscene, DB, canvas);
            window.engine = terraEngine;
            // const scene2 = await scenePromise;
            const cameraReady = scenePromise.then((scene) => {
                //const CollisionsEpsilon = 0.001;
                /*const coordinator: DefaultCollisionCoordinator = scene.collisionCoordinator as DefaultCollisionCoordinator;

                coordinator._collideWithWorld = function (position: [x: number, y: number, z: number], velocity: [x: number, y: number, z: number], collider: Collider, maximumRetry: number, finalPosition: Vector3, excludedMesh: Nullable<AbstractMesh> = null): void {
                    //TODO: Call only when camera position change
                    var closeDistance = CollisionsEpsilon * 10.0;
                    if (collider._retry >= maximumRetry) {
                        finalPosition.x = position[0];
                        finalPosition.y = position[1];
                        finalPosition.z = position[2];
                       // finalPosition.copyFrom(position);
                        return;
                    }

                    // Check if this is a mesh else camera or -1
                    //var collisionMask = (excludedMesh ? excludedMesh.collisionMask : collider.collisionMask);

                    collider._initialize(position, velocity, closeDistance);
                    terraEngine.scenes.forEach(scene => {
                        scene.boundables.forEach(mesh => {
                            try {
                                mesh.checkCollision(collider);
                            } catch (e) {
                                console.error(e);
                            }
                        })
                    });
                    if (!collider.collisionFound) {

                        //position.addToRef(velocity, finalPosition);
                        finalPosition.x = position[0] + velocity[0];
                        finalPosition.y = position[1] + velocity[1];
                        finalPosition.z = position[2] + velocity[2];
                        return;
                    }
                    if (velocity[0] !== 0 || velocity[1] !== 0 || velocity[2] !== 0) {
                        collider._getResponse(position, velocity);
                    }

                    if (Math.hypot(velocity[0], velocity[1], velocity[2]) <= closeDistance) {
                        //finalPosition.copyFrom(position);
                        finalPosition.x = position[0];
                        finalPosition.y = position[1];
                        finalPosition.z = position[2];
                        return;
                    }
                    collider._retry++;
                    //@ts-ignore
                    this._collideWithWorld(position, velocity, collider, maximumRetry, finalPosition, excludedMesh);
                }*/

               // const collider = coordinator.createCollider();
                //@ts-ignore
                ArcRotateCamera.prototype._getViewMatrix = function () {
                    var cosa = Math.cos(this.alpha);
                    var sina = Math.sin(this.alpha);
                    var cosb = Math.cos(this.beta);
                    var sinb = Math.sin(this.beta);
                    if (sinb === 0) {
                        sinb = 0.0001;
                    }
                    //@ts-ignore
                    var target = this._target
                    //@ts-ignore
                    this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);

                    //@ts-ignore
                    target.addToRef(this._computationVector, this._newPosition);
                    //@ts-ignore
                    terraEngine.collider._radius = this.collisionRadius.asArray();
                    //@ts-ignore
                    this._newPosition.subtractToRef(this._position, this._collisionVelocity);
                    //@ts-ignore
                    this._collisionTriggered = true;

                    // coordinator.getNewPosition(this._position, this._collisionVelocity, this._collider, 3, null, this._onCollisionPositionChange, this.uniqueId);
                    //ts-ignore
                    //this._position.divideToRef(Vector3.FromArray(terraEngine.collider._radius), terraEngine.collisionCoordinator.scaledPosition);
                    terraEngine.collisionCoordinator.scaledPosition[0] = this._position.x / terraEngine.collider._radius[0];
                    terraEngine.collisionCoordinator.scaledPosition[1] = this._position.y / terraEngine.collider._radius[1];
                    terraEngine.collisionCoordinator.scaledPosition[2] = this._position.z / terraEngine.collider._radius[2];
                    //ts-ignore
                   // this._collisionVelocity.divideToRef(Vector3.FromArray(terraEngine.collider._radius), terraEngine.collisionCoordinator.scaledVelocity);
                    //@ts-ignore
                    terraEngine.collisionCoordinator.scaledVelocity[0] = this._collisionVelocity.x / terraEngine.collider._radius[0];
                     //@ts-ignore
                    terraEngine.collisionCoordinator.scaledVelocity[1] = this._collisionVelocity.y / terraEngine.collider._radius[1];
                     //@ts-ignore
                    terraEngine.collisionCoordinator.scaledVelocity[2] = this._collisionVelocity.z / terraEngine.collider._radius[2];

                    terraEngine.collider.collidedMesh = null;
                    terraEngine.collider._retry = 0;

                   // terraEngine.collider._initialVelocity = coordinator._scaledVelocity;

                  //  terraEngine.collider._initialPosition = coordinator._scaledPosition;
                    //ts-ignore
                    terraEngine.collideWithWorld(terraEngine.collisionCoordinator.scaledPosition, terraEngine.collisionCoordinator.scaledVelocity, 3, terraEngine.collisionCoordinator.finalPosition);
                    //ts-ignore
                   // terraEngine.collisionCoordinator.finalPosition.multiplyInPlace(Vector3.FromArray(terraEngine.collider._radius));
                    terraEngine.collisionCoordinator.finalPosition[0] *= terraEngine.collider._radius[0]
                    terraEngine.collisionCoordinator.finalPosition[1] *= terraEngine.collider._radius[1]
                    terraEngine.collisionCoordinator.finalPosition[2] *= terraEngine.collider._radius[2]
                    //run the callback

                    if (!terraEngine.collider.collidedMesh) {
                        //@ts-ignore
                        this._previousPosition.copyFrom(this._position);
                    } else {
                        //ts-ignore
                        //this.setPosition(terraEngine.collisionCoordinator.finalPosition);
                        if (this._position.x !== terraEngine.collisionCoordinator.finalPosition[0])
                            this._position.x = terraEngine.collisionCoordinator.finalPosition[0]
                        if (this._position.y !== terraEngine.collisionCoordinator.finalPosition[1])
                            this._position.y = terraEngine.collisionCoordinator.finalPosition[1]
                        if (this._position.z !== terraEngine.collisionCoordinator.finalPosition[2])
                            this._position.z = terraEngine.collisionCoordinator.finalPosition[2]
                        this.rebuildAnglesAndRadius();
                        /*if (this.onCollide) {
                            this.onCollide(terraEngine.collider.collidedMesh);
                        }*/
                    }

                    // Recompute because of constraints
                    var cosa = Math.cos(this.alpha);
                    var sina = Math.sin(this.alpha);
                    var cosb = Math.cos(this.beta);
                    var sinb = Math.sin(this.beta);

                    if (sinb === 0) {
                        sinb = 0.0001;
                    }
                    //@ts-ignore
                    var target = this._target;
                    //@ts-ignore
                    this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);
                    //@ts-ignore
                    target.addToRef(this._computationVector, this._newPosition);
                    //@ts-ignore
                    this._position.copyFrom(this._newPosition);


                    //this._computeViewMatrix(this._position, target, up);
                    //@ts-ignore
                    this._globalPosition.copyFrom(this._position);
                    //@ts-ignore
                    this._globalCurrentTarget.copyFrom(target);
                    //@ts-ignore
                    this._collisionTriggered = false;
                    // }

                    this._currentTarget = target;

                }
                
                //@ts-ignore
                const camera = new ArcRotateCamera("Camera", 0, 0, 10, new Vector3(-500, 0, 0), {
                    getUniqueId: () => 1,
                    getRenderId: () => 1,
                    getEngine: () => engine
                });

                camera.maxZ = 1606000;

                //camera.angularSensibilityX = 1000;
                //camera.angularSensibilityY = 2000;
                camera.panningAxis = new Vector3(1, 0, 1)
                camera.checkCollisions = true;
                let pointerDownButton: number = 0;
                const panningSensibility: number = 20;
                const angularSensibilityX = 3000;
                const angularSensibilityY = 3000;
                const cameraMove = function (e: PointerEvent) {
                    e.preventDefault();
                    if (panningSensibility !== 0 && pointerDownButton == 2) {
                        camera.inertialPanningX += -e.movementX / panningSensibility;
                        camera.inertialPanningY += e.movementY / panningSensibility;
                    } else {
                        camera.inertialAlphaOffset -= e.movementX / angularSensibilityX;
                        camera.inertialBetaOffset -= e.movementY / angularSensibilityY;
                    }
                }
                const cameraWheel = function (e: WheelEvent) {
                        const delta = -e.deltaY / (3 * 40);
                        if (delta) {
                            camera.inertialRadiusOffset += delta;
                        }
                }
                const cameraPointerDown = (e: PointerEvent) => {
                    pointerDownButton = e.button;
                    canvas.addEventListener('pointermove', cameraMove);

                }
                camera.attachControl = function (element: HTMLElement, noPreventDefault?: boolean, useCtrlForPanning: boolean = true, panningMouseButton: number = 2): void {
                    canvas.addEventListener('wheel', cameraWheel);
                    canvas.addEventListener('pointerdown', cameraPointerDown);
                }
                canvas.addEventListener('pointerup', e => canvas.removeEventListener('pointermove', cameraMove));
                canvas.addEventListener('pointerleave', () => canvas.removeEventListener('pointermove', cameraMove));

                //@ts-ignore
                camera.detachControl = function () {
                    canvas.removeEventListener('pointerdown', cameraPointerDown);
                    canvas.removeEventListener('pointermove', cameraMove);
                    canvas.removeEventListener('wheel', cameraWheel);
                }
                camera._checkInputs = function (): void {
                    //if (async) collision inspection was triggered, don't update the camera's position - until the collision callback was called.
                    //@ts-ignore
                    if (this._collisionTriggered) {
                        return;
                    }

                    //inputs.checkInputs();
                    // Inertia
                    if (this.inertialAlphaOffset !== 0 || this.inertialBetaOffset !== 0 || this.inertialRadiusOffset !== 0) {
                        let inertialAlphaOffset = this.inertialAlphaOffset;
                        if (this.beta <= 0) { inertialAlphaOffset *= -1; }
                        if (this.getScene().useRightHandedSystem) { inertialAlphaOffset *= -1; }
                        if (this.parent && this.parent._getWorldMatrixDeterminant() < 0) { inertialAlphaOffset *= -1; }
                        this.alpha += inertialAlphaOffset;

                        this.beta += this.inertialBetaOffset;

                        this.radius -= this.inertialRadiusOffset;
                        this.inertialAlphaOffset *= this.inertia;
                        this.inertialBetaOffset *= this.inertia;
                        this.inertialRadiusOffset *= this.inertia;
                        if (Math.abs(this.inertialAlphaOffset) < Epsilon) {
                            this.inertialAlphaOffset = 0;
                        }
                        if (Math.abs(this.inertialBetaOffset) < Epsilon) {
                            this.inertialBetaOffset = 0;
                        }
                        if (Math.abs(this.inertialRadiusOffset) < this.speed * Epsilon) {
                            this.inertialRadiusOffset = 0;
                        }
                    }

                    // Panning inertia
                    if (this.inertialPanningX !== 0 || this.inertialPanningY !== 0) {
                        //@ts-ignore
                        if (!this._localDirection) {
                            //@ts-ignore
                            this._localDirection = Vector3.Zero();
                            //@ts-ignore
                            this._transformedDirection = Vector3.Zero();
                        }
                        //@ts-ignore
                        this._localDirection.copyFromFloats(this.inertialPanningX, this.inertialPanningY, this.inertialPanningY);
                        //@ts-ignore
                        this._localDirection.multiplyInPlace(this.panningAxis);

                        //this._viewMatrix.invertToRef(this._cameraTransformMatrix);
                        Matrix.FromArray(mainCamera.viewArr).invertToRef(this._cameraTransformMatrix);
                        //@ts-ignore
                        Vector3.TransformNormalToRef(this._localDirection, this._cameraTransformMatrix, this._transformedDirection);
                        //Eliminate y if map panning is enabled (panningAxis == 1,0,1)
                        if (!this.panningAxis.y) {
                            //@ts-ignore
                            this._transformedDirection.y = 0;
                        }
                        //@ts-ignore
                        if (!this._targetHost) {
                            if (this.panningDistanceLimit) {//@ts-ignore
                                this._transformedDirection.addInPlace(this._target);//@ts-ignore
                                var distanceSquared = Vector3.DistanceSquared(this._transformedDirection, this.panningOriginTarget);
                                if (distanceSquared <= (this.panningDistanceLimit * this.panningDistanceLimit)) {//@ts-ignore
                                    this._target.copyFrom(this._transformedDirection);
                                }
                            }
                            else {//@ts-ignore
                                this._target.addInPlace(this._transformedDirection);
                            }
                        }

                        this.inertialPanningX *= this.panningInertia;
                        this.inertialPanningY *= this.panningInertia;

                        if (Math.abs(this.inertialPanningX) < this.speed * Epsilon) {
                            this.inertialPanningX = 0;
                        }
                        if (Math.abs(this.inertialPanningY) < this.speed * Epsilon) {
                            this.inertialPanningY = 0;
                        }
                    }

                    // Limits
                    //@ts-ignore
                    this._checkLimits();

                    const needToMove = this._decideIfNeedsToMove();
                    const needToRotate = Math.abs(this.cameraRotation.x) > 0 || Math.abs(this.cameraRotation.y) > 0;

                    // Move
                    if (needToMove) {
                        this.position.addInPlace(this.cameraDirection);
                    }

                    // Rotate
                    if (needToRotate) {
                        console.log('needToRotate');
                        this.rotation.x += this.cameraRotation.x;
                        this.rotation.y += this.cameraRotation.y;

                        //rotate, if quaternion is set and rotation was used
                        if (this.rotationQuaternion) {
                            var len = this.rotation.lengthSquared();
                            if (len) {
                                Quaternion.RotationYawPitchRollToRef(this.rotation.y, this.rotation.x, this.rotation.z, this.rotationQuaternion);
                            }
                        }

                        if (!this.noRotationConstraint) {
                            var limit = 1.570796;

                            if (this.rotation.x > limit) {
                                this.rotation.x = limit;
                            }
                            if (this.rotation.x < -limit) {
                                this.rotation.x = -limit;
                            }
                        }
                    }

                    // Inertia
                    if (needToMove) {
                        console.log('needToMove');
                        if (Math.abs(this.cameraDirection.x) < this.speed * Epsilon) {
                            this.cameraDirection.x = 0;
                        }

                        if (Math.abs(this.cameraDirection.y) < this.speed * Epsilon) {
                            this.cameraDirection.y = 0;
                        }

                        if (Math.abs(this.cameraDirection.z) < this.speed * Epsilon) {
                            this.cameraDirection.z = 0;
                        }

                        this.cameraDirection.scaleInPlace(this.inertia);
                    }
                    if (needToRotate) {
                        if (Math.abs(this.cameraRotation.x) < this.speed * Epsilon) {
                            this.cameraRotation.x = 0;
                        }

                        if (Math.abs(this.cameraRotation.y) < this.speed * Epsilon) {
                            this.cameraRotation.y = 0;
                        }
                        this.cameraRotation.scaleInPlace(this.inertia);
                    }
                }

                camera._cache.mode = camera.mode;
                camera._cache.minZ = camera.minZ;
                camera._cache.maxZ = camera.maxZ;

                // Matrix
                //@ts-ignore
                camera._refreshFrustumPlanes = true;
                camera._cache.fov = camera.fov;
                camera._cache.fovMode = camera.fovMode;
                const aspectRatio = (canvas.width * camera.viewport.width) / (canvas.height * camera.viewport.height);
                camera._cache.aspectRatio = aspectRatio;

                if (camera.minZ <= 0) {
                    camera.minZ = 0.1;
                }

                Matrix.PerspectiveFovLHToRef(camera.fov,
                    aspectRatio,
                    camera.minZ,
                    camera.maxZ,
                    camera._projectionMatrix,
                    false);

                projectionmatrix.set(Array.from(camera._projectionMatrix.m));
                //camera._scene = scene;
                //camera.collisionCoordinator = scene.collisionCoordinator
              //  scene.activeCameras.push(camera);
                camera.attachControl(canvas, true);
                return camera;
            });

            
            blazor.invokeMethod('setProgress', 13);



            const mainCamera = new TerraCamera(gpuscene.renderPassScreen, projectionmatrixBuffer, gpuscene, terraEngine)
            const waterCamera = new TerraCamera(gpuscene.renderPassWater, projectionmatrixBuffer, gpuscene, terraEngine, false, mainCamera)
            const TerraCameras = [mainCamera, waterCamera]
            const timeAndDeltaBuffer = new ArrayBuffer(8);
            const timeView = new Uint32Array(timeAndDeltaBuffer, 0, 1);
            const deltaView = new Float32Array(timeAndDeltaBuffer, 4, 1);

            blazor.invokeMethod('setProgress', 14);


            
            TerraScene.instance = new Scene('main',gpuscene, terraEngine, [mainCamera, waterCamera], (terrascene, sunBufferOffsetBytes) => {
                new Sun2(terrascene, sunBufferOffsetBytes);
                // Initial scene objects here

                const tools: Map<string, UITABClassLike> = new Map();

                const sea = new Sea(terrascene);
                //new testPlane(terrascene);

                const b = new Box(terrascene);
                b.worldPosition.update(scale => scale.set([200, 200, 200]));
                /*new testPlaneNormals(terrascene);*/
                const terrainInited = Terrain.loadFromTexture(terrascene);
                terrainInited.then(async r => {
                    const ground = r[0];
                    const gpuBuffer = await r[1];
                    blazor.invokeMethod('setProgress', 76);


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


                    device.defaultQueue.submit([commandEncoder.finish()]);
                    blazor.invokeMethod('setProgress', 95);
                    bufferView.buffer.destroy();
                    blazor.invokeMethod('setProgress', 100);
                    console.debug("Progress 100");
                });
                PlantsUI.plantsMesh = new Plants(terrascene, terrainInited);
                tools.set('Plants', PlantsUI);
                tools.set('Camera', CameraTAB);
                tools.set('Buildings', BuildingsUI);
                tools.set('TerrainTool', TerrainTool);
                tools.set('Zones', Zones);
                //@ts-expect-error
                window.activateMenu = async (name: string) => {
                    try {
                        let tool: UITABClassLike | undefined;
                        if (tool = tools.get(name)) {
                            tool.instance = new tool(terrascene, (await terrainInited)[0], await cameraReady, sea);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
                //@ts-expect-error
                window.deActivateMenu = async (name: string) => {
                    try {
                        let tool: UITABClassLike | undefined;
                        if (tool = tools.get(name)) {
                            tool.instance?.destroy();
                            tool.instance = null;
                        } else
                            throw (new Error('Tool ' + name + ' not found'))
                    } catch (e) {
                        console.error(e);
                    }
                }
                //@ts-expect-error
                window.invokeMenu = async (name: string, method: string) => {
                    try {
                        let tool: UITABClassLike | undefined;
                        if (tool = tools.get(name)) {
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

                DB.then(DB => {
                    DB.transaction("save").objectStore("save").get(0).onsuccess = async (evt) => {
                        const camera = await cameraReady;
                        if ((<IDBRequest>evt.target).result) {

                            let restored = (<savedCamera>(<IDBRequest>evt.target).result).camera;
                            camera.alpha =restored.alpha;
                            camera.beta =  restored.beta;
                            camera.radius =  restored.radius;
                            camera.target =new Vector3(restored.target.x, restored.target.y, restored.target.z);
                            camera.position = restored.position;
                           /* camera.alpha = 0.5301790732133063// restored.alpha;
                            camera.beta = 1.5221956257805713 // restored.beta;
                            camera.radius = 9298.920138598956 // restored.radius;
                            camera.target = new Vector3(826.6071980631217, 20, 900.255132341644) //new Vector3(restored.target.x, restored.target.y, restored.target.z);
                            camera.position = new Vector3(8839.466683038081, 471.75614493722463, 5597.0535103433585)// restored.position;
                            */
                        }
                        let l = new LazyEval(() => {
                            //console.log(this.camera.position.y);
                            DB.transaction("save", "readwrite").objectStore("save").put(<savedCamera>{
                                id: 0,
                                camera: { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target, position: camera.position }
                            });
                        })
                        camera.onProjectionMatrixChangedObservable.add(() => {
                            l.eval(500);
                        });

                    }
                })

            });
            const debugscene = new Scene('static',gpuscene, terraEngine, [mainCamera], (scene, sunBufferOffsetBytes) => {
                const sun = new PositionNode(scene.engine, sunBufferOffsetBytes);
                sun.worldPosition.translation.set([0, 1, 0]);
                sun.customData.set([0, 0, 0, 1]) //shadow to 1 (no shadow)
            });

            const b2 = new Box(debugscene);
            b2.worldPosition.update(scale => scale.set([200, 200, 200]));
            b2.worldPosition.setTranslationX(500);

            let renderFrame: number = 0;
            let resizeHandler = 0;

            cameraReady.then(camera => {
                const renderPasses: Set<RenderPass> = new Set([gpuscene.renderPassScreen, gpuscene.renderPassWater]);
                const canvasSize: {
                    width: number,
                    height: number
                } = { width: 0, height: 0 }

                let curSecond = (Date.now() / 500) | 0;
                let framecount = 0;
                let msPerFrame = 0;
                let startTime = 0;
                waterCamera.onRender = function () {
                    this.cameraArr[1] -=  (this.cameraArr[1] - 3) * 2;
                    this.target[1] = -this.target[1];
                }
                function renderLoop(time: DOMHighResTimeStamp) {
                    msPerFrame = performance.now() - startTime;
                    startTime = performance.now();

                    const nowSecond = (Date.now() / 500) | 0;
                    if (nowSecond !== curSecond) {
                        blazor.invokeMethod('setRendertime', framecount*2, msPerFrame);
                        curSecond = nowSecond;
                        framecount = 0;
                    }
                    framecount++;
                    //performance.mark('renderloopStart');
                    

                    gpuscene.onRenders2.forEach(or => {
                        let buff = or();
                        if (buff)
                            gpuscene.pendingCommandBuffers.push(buff);
                    });
                    camera._checkInputs();
                    camera._getViewMatrix();

                    mainCamera.cameraArr[0] = camera.position.x;
                    mainCamera.cameraArr[1] = camera.position.y;
                    mainCamera.cameraArr[2] = camera.position.z;

                    mainCamera.target[0] = camera.target.x;
                    mainCamera.target[1] = camera.target.y;
                    mainCamera.target[2] = camera.target.z;

                    const renderEncoder = gpuscene.device.createCommandEncoder();
                    timeView.set([time]);
                    let physicDelta: number | null;
                    if (terraEngine.physics.gameSpeed == -1)
                        physicDelta = null;
                    else
                        physicDelta = (terraEngine.physics.physicTime - terraEngine.physics.tickTime) / ((terraEngine.physics.tickIntervalMs / 1000) << terraEngine.physics.gameSpeed)

                    if (physicDelta !== null)
                        deltaView.set([physicDelta]);

                    gpuscene.device.defaultQueue.writeBuffer(gpuscene.timeBuffer, 0, timeAndDeltaBuffer)
                    TerraCameras.forEach(camera => {
                        camera.render(renderEncoder)
                    });
                    gpuscene.pendingCommandBuffers.push(renderEncoder.finish())
                    gpuscene.device.defaultQueue.submit(gpuscene.pendingCommandBuffers);
                    gpuscene.pendingCommandBuffers.length = 0;
                    renderFrame = window.requestAnimationFrame(renderLoop);
                   /* performance.mark('renderloopEnd');
                    performance.measure("measure a to b", 'renderloopStart', 'renderloopEnd');
                    performance.getEntriesByType("measure")[0].duration;
                    performance.clearMarks();
                    performance.clearMeasures();*/
                    
                }


                //@ts-ignore
                let ro = new window.ResizeObserver((entries) => {
                    window.cancelAnimationFrame(renderFrame)
                    clearTimeout(resizeHandler);
                    resizeHandler = setTimeout(async () => {
                        canvasSize.width = entries[0].contentRect.width | 0;
                        canvasSize.height = entries[0].contentRect.height | 0;
                        renderPasses.forEach(renderpass => renderpass.onResize(canvasSize.width, canvasSize.height));
                        gpuscene.onResizes.forEach(cb => cb());

                        const aspectRatio = (canvasSize.width * camera.viewport.width) / (canvasSize.height * camera.viewport.height);
                        camera._cache.aspectRatio = aspectRatio;

                        if (camera.minZ <= 0) {
                            camera.minZ = 0.1;
                        }

                        Matrix.PerspectiveFovLHToRef(camera.fov,
                            aspectRatio,
                            camera.minZ,
                            camera.maxZ,
                            camera._projectionMatrix,
                            false);
                        projectionmatrix.set(Array.from(camera._projectionMatrix.m));

                        renderFrame = window.requestAnimationFrame(renderLoop);
                    }, 500)
                });
                ro.observe(canvas)
                //renderFrame = window.requestAnimationFrame(renderLoop);
            })
            //const adapter = await terrascene.adapter;

            //@ts-ignore
            engine._adapter = adapter;

            blazor.invokeMethod('setProgress', 15);
            /*   } catch (e) {
                   console.log('error');
                   console.error(e);
               }*/
            WasmModule.default().then(() => window.Wasm = WasmModule);


            //@ts-ignore
            engine._device = device;
            //@ts-ignore
            engine._initializeLimits();


            let webSocket = new WebSocket('ws://localhost:8081');
            webSocket.onopen = async () => {
                console.log('websocket onopen');
                // progelem.value = 30;
                try {
                    await loginPromise
                    sceneInitedred();
                } catch (e) {
                    sceneInitedrej(e);
                }
            }
            webSocket.onerror = async () => {
                console.log('websocket onerror');
                try {
                    await loginPromise
                    //blazor.invokeMethod('setProgress', 20);
                    sceneInitedred();
                } catch (e) {
                    sceneInitedrej(e);
                }
            }
        });

        for (let i = 0; i < gameControlsUI.length; i++) {
            gameControlsUI[i].classList.remove('hidden');
        }
    } catch (e) {
        console.error('creating terrain failed', e);
        //progelem.parentNode.textContent = e;
        blazor.invokeMethod('setProgress', 0);
        blazor.invokeMethod('setProgressError', e.name + ' ' + e.message);

    }
}

let gameControlsUI = document.getElementsByClassName('gameControl');

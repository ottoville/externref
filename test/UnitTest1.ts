describe("Ray Test", function () {
    this.timeout(100000);
    it("Test A", async () => {
        return new Promise((testresolver, testreject) => {
            var canvas = document.body.appendChild(document.createElement('canvas'));
            var engine = new BABYLON.Engine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });

            var sceneReadyPromise = new Promise((res, rej) => {
                //@ts-ignore
                window.sceneReady = function (WorldScene) {
                    let scene = new WorldScene(engine, { provider: 'anomyous', accessToken: '123' }, {}, 0);
                    scene.terrainReady.then((ground: BABYLON.GroundMesh) => {
                        console.log('terrain is Ready');
                        res([ground, scene]);
                    }).catch(rej);
                };
            });
            var code = document.body.appendChild(document.createElement('script'));
            code.setAttribute('type', 'module');
            code.src = './initscene.js';
            //<base href="https://www.w3schools.com/" target = "_blank" >
            code.onerror = function (e) {
                throw new Error("Failed to load initscene.js " + e.toString());
            }
            code.onload = function () {
                sceneReadyPromise.then(arr => {
                    let ray = BABYLON.Ray.Zero();
                    let ground = arr[0];
                    let scene = arr[1];
                    let world = ground.getWorldMatrix();
                    console.log('get cameraViewport');
                    var cameraViewport = (<any>scene.tools['CameraTAB']).camera.viewport;
                    console.log('get cameraViewport.toGlobal');
                    var viewport = cameraViewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
                    let x = 200 / engine.getHardwareScalingLevel() - viewport.x;
                    let y = 200 / engine.getHardwareScalingLevel() - (engine.getRenderHeight() - viewport.y - viewport.height);
                    console.log(ray.unprojectRayToRef(x, y, viewport.width, viewport.height, world, (<any>scene.tools['CameraTAB']).camera.getViewMatrix(), (<any>scene.tools['CameraTAB']).camera.getProjectionMatrix()));
                    console.log(ray.direction);
                    //if (Number.isNaN(ray.direction.x) || Number.isNaN(ray.direction.y) || Number.isNaN(ray.direction.z)) {
                    throw new Error("Creating picking ray failed");
                    testresolver();
                    //}
                }).catch(testreject);
            }



        });

    })
})
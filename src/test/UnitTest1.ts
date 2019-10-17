
console.log('hello world');

//import { strict as assert } from 'assert';
//@ts-ignore
import { WorldScene } from "/base/js/world/scene.js"
var canvas = document.body.appendChild(document.createElement('canvas'));


describe("Test Suite 1", () => {
    var engine = new BABYLON.Engine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });
    var scene = new WorldScene(engine, { provider: 'anomyous', accessToken: '123' }, {}, 0);
    let ray = BABYLON.Ray.Zero();
    it("Test A", async () => {
        return scene.terrainReady.then((ground: BABYLON.GroundMesh) => {
            let world = ground.getWorldMatrix();
            var cameraViewport = scene.tools['CameraTAB'].camera.viewport;

            var viewport = cameraViewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
            let x = 200 / engine.getHardwareScalingLevel() - viewport.x;
            let y = 200 / engine.getHardwareScalingLevel() - (engine.getRenderHeight() - viewport.y - viewport.height);

            ray.unprojectRayToRef(x, y, viewport.width, viewport.height, world, this.camera.getViewMatrix(), this.camera.getProjectionMatrix());
        });
    });

    it("Test B", () => {
        //assert.ok(1 === 1, "This shouldn't fail");
        console.log("This shouldn't fail");
        throw new Error("This should fail")
        // assert.ok(false, "This should fail");
    });

});

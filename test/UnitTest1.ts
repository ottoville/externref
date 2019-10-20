
//import { strict as assert } from 'assert';

import { WorldScene } from "../src/world/scene.js"
import { CameraTAB } from "../src/tools/camera.js";
var canvas = document.body.appendChild(document.createElement('canvas'));

describe("Test Suite 1", function() {
    this.timeout(100000);
    var engine = new BABYLON.Engine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });
    var scene = new WorldScene(engine, { provider: 'anomyous', accessToken: '123' }, {}, 0);
    let ray = BABYLON.Ray.Zero();
    it("Test A", async () => {
        return scene.terrainReady.then((ground: BABYLON.GroundMesh) => {
            console.log('terrain is Ready');
            let world = ground.getWorldMatrix();
            console.log('get cameraViewport');
            var cameraViewport = (<CameraTAB>scene.tools['CameraTAB']).camera.viewport;
            console.log('get cameraViewport.toGlobal');
            var viewport = cameraViewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
            let x = 200 / engine.getHardwareScalingLevel() - viewport.x;
            let y = 200 / engine.getHardwareScalingLevel() - (engine.getRenderHeight() - viewport.y - viewport.height);
            console.log(ray.unprojectRayToRef(x, y, viewport.width, viewport.height, world, (<CameraTAB>scene.tools['CameraTAB']).camera.getViewMatrix(), (<CameraTAB>scene.tools['CameraTAB']).camera.getProjectionMatrix()));
            console.log(ray.direction);
            if (Number.isNaN(ray.direction.x) || Number.isNaN(ray.direction.y) || Number.isNaN(ray.direction.z)) {
                throw new Error("Creating picking ray failed")
            }
            
        });
    });
});

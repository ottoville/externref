
//import { strict as assert } from 'assert';
//@ts-ignore
import { WorldScene } from "/js/world/scene.js"
//@ts-ignore
import { CameraTAB } from "/js/tools/camera.js";
var canvas = document.body.appendChild(document.createElement('canvas'));
var engine = new BABYLON.Engine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });

const canvasInited: Promise<WorldScene> = new Promise((res) => {
    //(<any>window).initCanvas = async function (blazor, ticks: number) {
    res(new WorldScene(engine, { provider: 'anomyous', accessToken: '123' }, {}, 0));
    //}
});

describe("Test Suite 1", function() {
    this.timeout(100000);
    let ray = BABYLON.Ray.Zero();
    it("Test A", async () => {
        console.log('Waiting canvas to be ready');
        let scene = await canvasInited;
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

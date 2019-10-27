var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
//import { strict as assert } from 'assert';
//@ts-ignore
import { WorldScene } from "/js/world/scene.js";
var canvas = document.body.appendChild(document.createElement('canvas'));
var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const canvasInited = new Promise((res) => {
    //(<any>window).initCanvas = async function (blazor, ticks: number) {
    res(new WorldScene(engine, { provider: 'anomyous', accessToken: '123' }, {}, 0));
    //}
});
describe("Test Suite 1", function () {
    this.timeout(100000);
    let ray = BABYLON.Ray.Zero();
    it("Test A", () => __awaiter(this, void 0, void 0, function* () {
        console.log('Waiting canvas to be ready');
        let scene = yield canvasInited;
        return scene.terrainReady.then((ground) => {
            console.log('terrain is Ready');
            let world = ground.getWorldMatrix();
            console.log('get cameraViewport');
            var cameraViewport = scene.tools['CameraTAB'].camera.viewport;
            console.log('get cameraViewport.toGlobal');
            var viewport = cameraViewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
            let x = 200 / engine.getHardwareScalingLevel() - viewport.x;
            let y = 200 / engine.getHardwareScalingLevel() - (engine.getRenderHeight() - viewport.y - viewport.height);
            console.log(ray.unprojectRayToRef(x, y, viewport.width, viewport.height, world, scene.tools['CameraTAB'].camera.getViewMatrix(), scene.tools['CameraTAB'].camera.getProjectionMatrix()));
            console.log(ray.direction);
            if (Number.isNaN(ray.direction.x) || Number.isNaN(ray.direction.y) || Number.isNaN(ray.direction.z)) {
                throw new Error("Creating picking ray failed");
            }
        });
    }));
});

//@ts-ignore
import { WorldScene } from "/js/world/scene.js"
//@ts-ignore
import { CameraTAB } from "/js/tools/camera.js";

const canvasInited: Promise<WorldScene> = new Promise((res) => {
    //(<any>window).initCanvas = async function (blazor, ticks: number) {
    res();
    //}
});

canvasInited.then(() => {
    let ray = BABYLON.Ray.Zero();
    //@ts-ignore
    window.sceneReady(WorldScene, ray);

});

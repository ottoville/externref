//@ts-ignore
import { WorldScene } from "/js/world/scene.js";
var canvasInited = new Promise(function (res) {
    //(<any>window).initCanvas = async function (blazor, ticks: number) {
    res();
    //}
});
canvasInited.then(function () {
    var ray = BABYLON.Ray.Zero();
    //@ts-ignore
    window.sceneReady(WorldScene, ray);
});

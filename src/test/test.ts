//@ts-ignore
let BABYLON = require('babylonjs'); 
import { WorldScene } from "../world/scene.js"
let canvas = {};
let blazor = {};
var engine = new BABYLON.Engine(<HTMLCanvasElement>canvas, true, { preserveDrawingBuffer: true, stencil: true });
var scene = new WorldScene(engine, { provider: 'anomyous', accessToken: '123' }, <DotNet.BlazorInstance>blazor, 0);

var pickInfo = scene.pick(scene.pointerX, scene.pointerY, (m) => {
    return true;
});

console.log(pickInfo);
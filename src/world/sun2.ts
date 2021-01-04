import { worldPosition } from "../traits/worldPosition";
import { hasPhysics } from "../physics";
import { Scene } from "../Scene";
import { isLight } from "../lights";
import { TerraNode } from "../TerraNode";
//const sundistance = 149600000000;

/*
function matrixTranslate(x: number, y: number, z: number, m: Float32Array) {
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z))
        throw ('Non numeric input passed to translate()');
    var rx = x * m[0] + y * m[1] + z * m[2] + m[3];
    var ry = x * m[4] + y * m[5] + z * m[6] + m[7];
    var rz = x * m[8] + y * m[9] + z * m[10] + m[11];
    var rw = x * m[12] + y * m[13] + z * m[14] + m[15];
    return {
        x: rx,
        y: ry,
        z: rz,
        w: rw
    }
}*/
const zAngle = Math.cos(Math.PI * 0.2);
const yAngle = Math.sin(Math.PI * 0.2);
export class Sun2 extends TerraNode implements hasPhysics, isLight {

    worldPosition: worldPosition = new worldPosition(this);
    lightType: 'point' = 'point';

    clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
    }

    onPhysicTick = (/*delta: number*/) => {
        let anglePerMinute = (Math.PI * 2) / 1439;
        //let meridian: number = Math.PI * 0.1;
        let meridian: number = Math.PI * 0.5;
        //149597870000

        //let sundistance = 149600; //divided by 100000
        let secondsOfDay = ~~((Number(this.engine.physics.tickTime * 60)) % 86400);
        let minutesOfDay = secondsOfDay / 60;
        let sunAngle = new Angle(minutesOfDay * anglePerMinute).sub(meridian);

        let sunPositionX = Math.sin(sunAngle);
        let sunPositionY = Math.cos(sunAngle);

        let sunPositionZ = sunPositionY * zAngle;


        sunPositionY = sunPositionY * yAngle;
        const currentPos = this.worldPosition.translation;
        this.worldPosition.SetTranslationDelta([sunPositionX - currentPos[0], sunPositionY - currentPos[1], sunPositionZ - currentPos[2]]);
        //const ambientR = this.clamp((sunPositionY * 2 + 0.4) * 0.8, 0.05, 0.3);
        const ambientR = this.clamp((sunPositionY + 0.4) * 0.8, 0.05, 0.3);
        const ambientGB = this.clamp((sunPositionY + 0.1) * 0.4 - 0.1, 0.05, 0.3);


        //earth shadow
        const shadow = this.clamp(sunPositionY * 8 + 1, 0, 1); // <<3 == * 8
        this.customData.set([ambientR, ambientGB, ambientGB, shadow]);
        this.updateDynamicBuffer();
        // this.worldPosition.translation = [sunPositionX, sunPositionY, sunPositionZ];



        //let sunm = rotateMatrix(Math.PI * 0.2, 'x');
        // let newpos = matrixTranslate(sunPositionX, sunPositionY, 0, sunm);
        // this.worldPosition.translation = [newpos.x, newpos.y, newpos.z];
    }
    constructor(scene: Scene, sunBufferOffsetBytes: number) {
        super(scene.engine, sunBufferOffsetBytes);


        (async () => {
            const [vertex, fragment] = await Promise.all(['/shaders/wgsl/sun.vert.wgsl', '/shaders/wgsl/sun.frag.wgsl'].map(async u => scene.gpu.device.createShaderModule({ code: await (await fetch(u)).text() })) as [Promise<GPUShaderModule>, Promise<GPUShaderModule>]);
            const sunPipeline = scene.engine.positionBindGroupTime.addRenderPipeline({
                rasterizationState: {
                    cullMode: 'none',
                },
                primitiveTopology: 'triangle-strip',
                colorStates: [{
                    format: "bgra8unorm",
                }],
                vertexStage: {
                    module: vertex,
                    entryPoint: "main",
                },
                fragmentStage: {
                    module: fragment,
                    entryPoint: "main"
                },
                vertexState: {
                    indexFormat: 'uint16' //todo: this is not needed as shader does not use indexes.
                }
            },[this.bufferOffsetBytes]);
            sunPipeline.addDrawableSimple(scene, new Set([scene.gpu.renderPassScreen]), 14);
        })();


    }
}
import type { hasPhysics } from "../physics.js";
import type { Scene } from "../Scene.js";
import type { isLight } from "../lights.js";
import { TerraNodeGPU } from "../TerraNode.js";
import { Angle } from "../Math.js";
import type { GPU } from "../GPU.js";
import type { RenderPipeline } from "../GPU/RenderPipeline.js";

//const sundistance = 149600000000;

const zAngle = Math.cos(Math.PI * 0.2);
const yAngle = Math.sin(Math.PI * 0.2);



const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function getRenderPipeline(scene: Scene, sunBufferOffsetBytes: number) {
    let renderPipeline: RenderPipeline | undefined = renderPipelines.get(scene.gpu);
    if (renderPipeline)
        return renderPipeline;
    const vertex = scene.engine.gpu.shaderModules.get('sun.vert.wgsl')
    const fragment = scene.engine.gpu.shaderModules.get('sun.frag.wgsl')
    if (!vertex || !fragment)
        throw ('Missing shader')
    //const [vertex, fragment] = await Promise.all(['/shaders/wgsl/simple.vert.wgsl', '/shaders/wgsl/simple.frag.wgsl'].map(async u => scene.gpu.device.createShaderModule({ code: await (await fetch(u)).text() })));
    //const bindGroupLayout = scene.gpu.addBindGroup(scene.lights.uniformBindGroupLightsWGSL);

    renderPipeline = scene.engine.positionBindGroupTime.addRenderPipeline({
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
    }, [sunBufferOffsetBytes]);
    renderPipelines.set(scene.gpu, renderPipeline);
    return renderPipeline
}


export class Sun2 extends TerraNodeGPU implements hasPhysics, isLight {
    hasGravity = false;
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
        const currentPos = this.translation;

        this.SetTranslationDelta([sunPositionX - currentPos[0], sunPositionY - currentPos[1], sunPositionZ - currentPos[2]]);
        //const ambientR = this.clamp((sunPositionY * 2 + 0.4) * 0.8, 0.05, 0.3);
        const ambientR = this.clamp((sunPositionY + 0.4) * 0.8, 0.05, 0.3);
        const ambientGB = this.clamp((sunPositionY + 0.1) * 0.4 - 0.1, 0.05, 0.3);


        //earth shadow
        const shadow = this.clamp(sunPositionY * 8 + 1, 0, 1); // <<3 == * 8
        this.customData.set([ambientR, ambientGB, ambientGB, shadow]);
        this.updateDynamicBuffer();
    }
    Drawable=this.renderPipeline.addDrawableSimple(this.scene, new Set([this.scene.gpu.renderPassScreen]), 14);
    constructor(private scene: Scene, sunBufferOffsetBytes: number) {
        super(scene.engine, getRenderPipeline(scene, sunBufferOffsetBytes), sunBufferOffsetBytes);
    }
}
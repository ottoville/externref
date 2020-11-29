import { Light } from "./lights";
import type { BoundableNode } from "./TerraNode";
import type { GPU } from "./GPU";
import { Sun2 } from "./world/sun2";
import type { Engine } from "./engine";
import type { BindGroupLayout, LayoutGroupDrawable } from "./GPU/BindGroupLayout";

export abstract class Scene {
    boundables: Set<BoundableNode> = new Set();
    lights;
    lightsBindGroup: BindGroupLayout;
    lightsBindGroupWGSL: BindGroupLayout;
    positionBindGroupLightsTime;
    positionBindGroupLightsTimeWGSL;
    lightsBindGroupTexture: LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry]>;

    constructor(public gpu: GPU, public engine: Engine) {
        const sun = new Sun2(this);
        this.lights = new Light(gpu, sun.bufferOffsetBytes);
        this.lightsBindGroup = gpu.addBindGroup(this.lights.uniformBindGroupLights);
        this.lightsBindGroupWGSL = gpu.addBindGroup(this.lights.uniformBindGroupLightsWGSL);
        this.positionBindGroupLightsTime = this.lightsBindGroup.addChildBindGroup(this.gpu.BindGroup, true);
        this.positionBindGroupLightsTime.onRender = async () => {
            return this.gpu.updateGPUBuffer();
        }
        this.positionBindGroupLightsTimeWGSL = this.lightsBindGroupWGSL.addChildBindGroup(this.gpu.BindGroup, true);
        this.lightsBindGroupTexture = this.lightsBindGroupWGSL.addChildLayout(this.gpu.createBindGroupLayout({
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampler'
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampled-texture'
        }));
    }
 }


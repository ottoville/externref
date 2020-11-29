import { Light } from "./lights";
import type { BoundableNode } from "./TerraNode";
import type { GPU } from "./GPU";
import { Sun2 } from "./world/sun2";
import type { Engine } from "./engine";
import type { BindGroupLayout } from "./GPU/BindGroupLayout";

export abstract class Scene {
    boundables: Set<BoundableNode> = new Set();
    lights;
    lightsBindGroup: BindGroupLayout;
    lightsBindGroupWGSL: BindGroupLayout;
    constructor(public gpu: GPU, public engine: Engine) {
        const sun = new Sun2(this);
        this.lights = new Light(gpu, sun.bufferOffsetBytes);
        this.lightsBindGroup = gpu.addBindGroup(this.lights.uniformBindGroupLights);
        this.lightsBindGroupWGSL = gpu.addBindGroup(this.lights.uniformBindGroupLightsWGSL);

    }
 }


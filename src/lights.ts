import type { GPU } from "./GPU";
import type { worldPosition } from "./traits/worldPosition";
export interface isLight {
    lightType: 'point' | 'directional' | 'spot' | 'ambient'
    worldPosition: worldPosition
}
const maxLights = 1;
export class Light {
/*
* Goround shader
*
* sun direction: vec3
* lights amount: uint32,
*
* otherLights[]:
* position vec3,
* type: uint32 (point, directional, spotlight, ambient)
*
* light color vec3
* intensity uint32
* */
    #instances: Set<isLight> = new Set();
    add(light: isLight) {
        this.#instances.add(light);
    }

    uniformBindGroupLightsWGSL: BindGroupOneBinding;

    constructor(public gpu: GPU, byteoffset:number) {
        this.uniformBindGroupLightsWGSL = this.gpu.createBindGroup(this.gpu.uniformBindGroupLayoutLightsWGSL2,
            {
                binding: 0,
                resource: {
                    buffer: this.gpu.GPUData, //this.#lightsBuffer
                    size: 256,
                    offset: byteoffset
                }
            });
    }
}
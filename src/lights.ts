import type { GPUScene } from "./GPUScene";
import type { worldPosition } from "./traits/worldPosition";
export interface isLight {
    lightType: 'point' | 'directional' | 'spot' | 'ambient'
    worldPosition: worldPosition
}
const maxLights = 1;
export class Light {
    #instances: Set<isLight> = new Set();



    

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
    //#lightsBuffer = this.scene.createGPUBuffer(3 * 4 + 4 + maxLights * (3 * 4 + 4 + 3 * 4 + 4), [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]);

    #uniformBindGroupLayoutLights = this.scene.createBindGroupLayout({
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        type: 'readonly-storage-buffer'
    });

    #uniformBindGroupLights = this.scene.createBindGroup(this.#uniformBindGroupLayoutLights,
        {
            binding: 0,
            resource: {
                buffer: this.scene.worldPositionScene.matrix, //this.#lightsBuffer
                size:256
            }
        });
    lightsBindGroup = this.scene.baseBindGroup.addChildBindGroup(this.#uniformBindGroupLights);
    lightsBindGroupNoTime = this.scene.baseBindGroupNoTime.addChildBindGroup(this.#uniformBindGroupLights);

    add(light: isLight) {
        this.#instances.add(light);
    }
    constructor(public scene: GPUScene) {
      //  this.#uniformBindGroupLayoutLights.createBindGroup()
    }
}
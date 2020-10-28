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


    
    lightsBindGroup;
    lightsBindGroupTexture;
    lightsBindGroupNoTime;

    add(light: isLight) {
        this.#instances.add(light);
    }
    constructor(public scene: GPUScene) {
        const uniformBindGroupLayoutLights = this.scene.createBindGroupLayout({
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            type: 'readonly-storage-buffer'
        });
         const uniformBindGroupLights = this.scene.createBindGroup(uniformBindGroupLayoutLights,
                {
                    binding: 0,
                    resource: {
                        buffer: this.scene.GPUData, //this.#lightsBuffer
                        size: 256
                    }
             });
        this.lightsBindGroupNoTime = this.scene.baseBindGroupNoTime.addChildBindGroup(uniformBindGroupLights);
        this.lightsBindGroup = this.scene.baseBindGroup.addChildBindGroup(uniformBindGroupLights);
        uniformBindGroupLights.label = 'lights'

        this.lightsBindGroupTexture = this.lightsBindGroup.addChildLayout(this.scene.createBindGroupLayout({
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampler'
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampled-texture'
        }))

        //  this.#uniformBindGroupLayoutLights.createBindGroup()
    }
}
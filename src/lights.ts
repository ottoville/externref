import type { GPU } from "./GPU";
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


   
    uniformBindGroupLightsWGSL: BindGroupOneBinding;
    uniformBindGroupLights: BindGroupOneBinding;

    add(light: isLight) {
        this.#instances.add(light);
    }
    constructor(public gpu: GPU, byteoffset:number) {
        const uniformBindGroupLayoutLights = this.gpu.createBindGroupLayout({
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            type: 'readonly-storage-buffer'
        });
        const uniformBindGroupLayoutLightsWGSL = this.gpu.createBindGroupLayout({
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            type: 'uniform-buffer'
        });
        this.uniformBindGroupLights = this.gpu.createBindGroup(uniformBindGroupLayoutLights,
                {
                    binding: 0,
                    resource: {
                        buffer: this.gpu.GPUData, //this.#lightsBuffer
                        size: 256,
                        offset: byteoffset
                    }
             });
        this.uniformBindGroupLightsWGSL = this.gpu.createBindGroup(uniformBindGroupLayoutLightsWGSL,
            {
                binding: 0,
                resource: {
                    buffer: this.gpu.GPUData, //this.#lightsBuffer
                    size: 256,
                    offset: byteoffset
                }
            });
      /*  this.lightsBindGroupNoTime = this.scene.baseBindGroupNoTime.addChildBindGroup(uniformBindGroupLights);
        this.lightsBindGroupNoTimeWGSL = this.scene.buildBindGroupHierarcy(this.scene.baseBindGroupNoTime,this.uniformBindGroupLightsWGSL);

        this.lightsBindGroup = this.scene.baseBindGroup.addChildBindGroup(uniformBindGroupLights);
        this.lightsBindGroupWGSL = this.scene.baseBindGroup.addChildBindGroup(this.uniformBindGroupLightsWGSL);*/
       // uniformBindGroupLights.label = 'lights'
     /*   this.lightsBindGroupTexture = this.lightsBindGroupWGSL.addChildLayout(this.scene.createBindGroupLayout({
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampler'
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            type: 'sampled-texture'
        }))*/

        //  this.#uniformBindGroupLayoutLights.createBindGroup()
    }
}
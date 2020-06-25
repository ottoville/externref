import { Terrain } from "./world/terrain";
import { TerrainPositionDrawable } from "./drawables/TerrainPosition";
import { TerrainTimePositionDrawable } from "./drawables/TerrainTimePosition";
import { Mesh } from "./drawables/Mesh";

export class GPUScene {
    static canvas: HTMLCanvasElement;

    sampleCount: number = 1;

    shaderModules: Map<string, GPUShaderModule> = new Map();

    #updateTime: GPUCommandBuffer[];
    #settingTime: boolean = false;
    #time: number = 0;
    #createdAt: number = new Date().getTime();
   

    get canvas(): HTMLCanvasElement {
        return GPUScene.canvas;
    }
    uniformBindGroupLayout = this.device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                type: 'uniform-buffer'
            }
        ]
    });
    timeBuffer = this.device.createBuffer({ //Todo: set to private
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    }); 
    #timeBindGroup = this.device.createBindGroup({
        layout: this.uniformBindGroupLayout,
        entries: [{
            binding: 0,
            resource: {
                buffer: this.timeBuffer
            }
        }],
    });
    uniformBuffer = this.device.createBuffer({  //Todo: set to private
        size: 4 * 16 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    #uniformBindGroup = this.device.createBindGroup({
        layout: this.uniformBindGroupLayout,
        entries: [{
            binding: 0,
            resource: {
                buffer: this.uniformBuffer
            }
        }],
    });
    #timeBufferStorage = this.device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE
    });; 
    static instance: GPUScene;
    constructor(public device: GPUDevice) {
       
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.#timeBufferStorage, 0,
            this.timeBuffer, 0,
            4);
        this.#updateTime = [commandEncoder.finish()];
        GPUScene.instance = this;
    }
    async updateTime() {
        if (this.#settingTime)
            return;
        this.#settingTime = true;
        let arr = await this.#timeBufferStorage.mapWriteAsync();
        new Float32Array(arr).set([(this.#createdAt - this.#time) % 100000 / 1000]); // %100000 is to keep float minimal for greater precise
        this.#timeBufferStorage.unmap();
        this.device.defaultQueue.submit(this.#updateTime);
        this.#settingTime = false;

    }
    render(renderPass: GPURenderPassEncoder, terrain: Terrain) {
        renderPass.setBindGroup(0, this.#uniformBindGroup)
        Mesh.Meshes.forEach(m => {
            m.draw(renderPass);
        });

        renderPass.setBindGroup(1, terrain.bindGroup)
        TerrainPositionDrawable.Meshes.forEach(m => {
            m.draw(renderPass);
        });
        if (TerrainTimePositionDrawable.Meshes.size) {
            this.#time = new Date().getTime();
            this.updateTime();
            renderPass.setBindGroup(2, this.#timeBindGroup)
            TerrainTimePositionDrawable.Meshes.forEach(m => {
                m.draw(renderPass);
            })
        }
    }
}
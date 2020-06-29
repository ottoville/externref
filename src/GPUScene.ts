import { Terrain } from "./world/terrain";
import { TerrainPositionDrawable } from "./drawables/TerrainPosition";
import { TerrainTimePositionDrawable } from "./drawables/TerrainTimePosition";
import { Mesh } from "./drawables/Mesh";

export class GPUVertexBuffer extends GPUBuffer {
    vertex = true;
}
export class GPUIndexBuffer extends GPUBuffer {
    index = true;
}
type vertex = 'vertex';
type index = 'index';


type MAP_READ = 0x0001;
type MAP_WRITE = 0x0002;
type COPY_SRC = 0x0004;
type COPY_DST = 0x0008;
type INDEX = 0x0010;
type VERTEX = 0x0020;
type UNIFORM = 0x0040;
type STORAGE = 0x0080;
type INDIRECT = 0x0100;

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
    singleWritableStorageLayout = this.device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                type: "storage-buffer"
            }]
    })
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
    //terrain.js:182 Only CopyDst is allowed with MapRead
    createGPUBuffer(size: number, usage: typeof GPUBufferUsage.INDEX, ...usages: (typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.MAP_WRITE | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.INDIRECT)[]): GPUIndexBuffer
    createGPUBuffer(size: number, usage: typeof GPUBufferUsage.VERTEX, ...usages: (typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.MAP_WRITE | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.INDIRECT)[]): GPUVertexBuffer
    createGPUBuffer(size: number, ...usages: (typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST)[]): GPUVertexBuffer
    createGPUBuffer(size: number, ...usages: (typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.MAP_WRITE | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.INDIRECT)[]): GPUBuffer
    createGPUBuffer(size: number, ...usages: (typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.MAP_WRITE | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.INDIRECT)[]): GPUBuffer {
        const usage=usages.reduce((prev, curr) => prev|curr,0)
        return this.device.createBuffer({
            usage: usage,
            size: size
        });
    }
    createGPUBufferMapped(size: number, usage: typeof GPUBufferUsage.INDEX, ...usages: (typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.MAP_WRITE | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.INDIRECT)[]): [GPUIndexBuffer, ArrayBuffer]
    createGPUBufferMapped(size: number, usage: typeof GPUBufferUsage.VERTEX, ...usages: (typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.MAP_WRITE | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.INDIRECT)[]): [GPUVertexBuffer, ArrayBuffer]
    createGPUBufferMapped(size: number, ...usages: (typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST)[]): [GPUVertexBuffer, ArrayBuffer]
    createGPUBufferMapped(size: number, ...usages: (typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.MAP_WRITE | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.INDIRECT)[]): [GPUBuffer, ArrayBuffer]
    createGPUBufferMapped(size: number, ...usages: (typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.MAP_WRITE | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.INDIRECT)[]): [GPUBuffer, ArrayBuffer] {
        const usage = usages.reduce((prev, curr) => prev | curr, 0)
        return this.device.createBufferMapped({
            usage: usage,
            size: size
        });
    }
   /* createGPUBuffer(size: number, usage: VERTEX): GPUVertexBuffer
    createGPUBuffer(size: number, usage: MAP_READ | MAP_WRITE | COPY_SRC | COPY_DST | INDEX | VERTEX | UNIFORM | STORAGE | INDIRECT): GPUBuffer
    createGPUBuffer(size: number, usage: any): GPUBuffer {
        return this.device.createBuffer({
            usage: usage,
            size: size
        }) as GPUVertexBuffer;
    }*/
  /*  createGPUBuffer(size: number, usage: number): GPUBuffer
    createGPUBuffer(size: number, usage: number, type?: vertex): GPUVertexBuffer
    createGPUBuffer(size: number, usage: number, type?: index): GPUBuffer
    createGPUBuffer(size: number, usage: number, type?: vertex | index): any {
        const b = this.device.createBuffer({
            usage: usage,
            size: size
        });
        if(type)
            (b as GPUVertexBuffer | GPUIndexBuffer)[type] = true;
        return this.device.createBuffer({
            usage: usage,
            size: size
        }) as GPUVertexBuffer;
    }*/
    createComputePipeline(shader: string, layout?: GPUPipelineLayout, entryPoint = 'main'): GPUComputePipeline {
        //let t = this.createGPUBuffer(5, GPUBufferUsage.COPY_DST, GPUBufferUsage.MAP_READ);

        const shaderModule = this.shaderModules.get(shader);
        if (!shaderModule)
            throw (new Error('Shader ' + shader + ' not found'));        
        const desc: GPUComputePipelineDescriptor = {
            computeStage: {
                module: shaderModule,
                entryPoint
            }
        };
        if (layout)
            desc.layout = layout;
        return this.device.createComputePipeline(desc)
    }
    render(renderPass: GPURenderPassEncoder, terrain: Terrain) {
        renderPass.setBindGroup(0, this.#uniformBindGroup)
        Mesh.Meshes.forEach(m => {
            m.draw(renderPass);
        });

        renderPass.setBindGroup(1, terrain.heightsBindGroup);
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
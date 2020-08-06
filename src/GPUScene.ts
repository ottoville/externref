import { Drawable } from "./drawables/Drawable";

interface GPUUniformBuffer extends GPUBuffer {
    uniform: 'true';
}
export interface GPUVertexBuffer extends GPUBuffer {
    vertex:'true';
}
export interface GPUIndexBuffer extends GPUBuffer {
    index: 'true';
}
interface GPUStorageBuffer extends GPUBuffer {
    storage: 'true';
}
interface GPUMapReadBuffer extends GPUBuffer {
    readAndDestroy: (callback: (buff: ArrayBuffer) => Promise<void>) => Promise<void>;
}
export interface GPUMapWriteBuffer extends GPUBuffer {
    mapread:boolean
}
export interface GPUCopySRCBuffer extends GPUBuffer {
    CopySRC:'true'
}
interface GPUCopyDSTBuffer extends GPUBuffer {
    CopyDST: 'true';
}

interface BindGroupLayoutOneBinding extends GPUBindGroupLayout {
    numBindings: 'one';
}
export interface BindGroupLayoutTwoBinding extends GPUBindGroupLayout {
    numBindings: 'two';
}
interface BindGroupLayoutThreeBinding extends GPUBindGroupLayout {
    numBindings: 'three';
}
interface BindGroupLayoutFourBinding extends GPUBindGroupLayout {
    numBindings: 'four';
}
interface BindGroupOneBinding extends GPUBindGroup {
    numBindings: 'one';
}
interface BindGroupTwoBinding extends GPUBindGroup {
    numBindings: 'two';
}
interface BindGroupThreeBinding extends GPUBindGroup {
    numBindings: 'three';
}
interface BindGroupFourBinding extends GPUBindGroup {
    numBindings: 'four';
}

interface TerraGPUComputePipeLine extends GPUComputePipeline {
    createBindGroup(layout: number|GPUBindGroupLayout, entries: Iterable<{
        binding: number;
        resource: GPUSampler | GPUTextureView | {
            buffer: GPUStorageBuffer;
            offset?: number;
            size?: number;
        }
    }>): GPUBindGroup
}
export interface TerraGPUCommandEncoder extends GPUCommandEncoder {
    copyBufferToBuffer(
        source: GPUCopySRCBuffer,
        sourceOffset: number,
        destination: GPUCopyDSTBuffer,
        destinationOffset: number,
        size: number
    ): void;
}
export class GPUScene { 
    static canvas: HTMLCanvasElement;
    bufferSizes: WeakMap<GPUBuffer, number> = new WeakMap();
    sampleCount: number = 1;

    shaderModules: Map<string, GPUShaderModule> = new Map();


    addBindGroup(bindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)) {
        const bglayout = this.GPUBindGroupLayouts.get(bindgroup);
        if (!bglayout)
            throw ('Bindgroup layout not found from weakmap');
        return new BindGroupDrawable(this, bglayout,undefined, bindgroup);
    }

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
    singleVertexUniformLayout = this.createBindGroupLayout(
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                type: 'uniform-buffer'
            })
    GPUBindGroupLayouts: WeakMap<GPUBindGroup, GPUBindGroupLayout> = new WeakMap();

    createBindGroupLayout(entry1: GPUBindGroupLayoutEntry): BindGroupLayoutOneBinding
    createBindGroupLayout(entry1: GPUBindGroupLayoutEntry, entry2: GPUBindGroupLayoutEntry): BindGroupLayoutTwoBinding
    createBindGroupLayout(entry1: GPUBindGroupLayoutEntry, entry2: GPUBindGroupLayoutEntry, entry3 :GPUBindGroupLayoutEntry): BindGroupLayoutThreeBinding
    createBindGroupLayout(entry1: GPUBindGroupLayoutEntry, entry2: GPUBindGroupLayoutEntry, entry3: GPUBindGroupLayoutEntry, entry4: GPUBindGroupLayoutEntry): BindGroupLayoutFourBinding
    createBindGroupLayout(...entries: GPUBindGroupLayoutEntry[]): GPUBindGroupLayout {
        return this.device.createBindGroupLayout({ entries })
    }
    createBindGroup(layout: BindGroupLayoutOneBinding, entry1: GPUBindGroupEntry): BindGroupOneBinding
    createBindGroup(layout: BindGroupLayoutTwoBinding, entry1: GPUBindGroupEntry, entry2: GPUBindGroupEntry): BindGroupTwoBinding
    createBindGroup(layout: BindGroupLayoutThreeBinding, entry1: GPUBindGroupEntry, entry2: GPUBindGroupEntry, entry3: GPUBindGroupEntry): BindGroupThreeBinding
    createBindGroup(layout: BindGroupLayoutFourBinding, entry1: GPUBindGroupEntry, entry2: GPUBindGroupEntry, entry3: GPUBindGroupEntry, entry4: GPUBindGroupEntry): BindGroupFourBinding
    createBindGroup(layout: GPUBindGroupLayout, ...entries: GPUBindGroupEntry[]): GPUBindGroup {
        const bindGroup = this.device.createBindGroup({ layout, entries });
        this.GPUBindGroupLayouts.set(bindGroup, layout);
        return bindGroup
    }

    #uniformBindGroupLayout = this.singleVertexUniformLayout;
    #uniformBindGroupLayoutLights = this.createBindGroupLayout({
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        type: 'uniform-buffer'
    }/*,
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                type: 'uniform-buffer'
            }*/);
    #uniformBindGroupLayoutWithTime = this.createBindGroupLayout(
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            type: 'uniform-buffer'
        },
        {
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            type: 'uniform-buffer'
        }
    );

    timeBuffer = this.createGPUBuffer(4,[GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]);  //Todo: set to private


    //viewprojection and camera position
    uniformBuffer = this.createGPUBuffer(4 * 16 * 2 + 4 * 4 + 3 * 4, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]); //Todo: set to private


    readonly maxLights = 1;

    /*
     * Goround shader
     * lights amount: uint8,
     * ambient light (sun): vec2
     * pointlights[]: light position vec3, light color vec3
     * */
    #lightsBuffer = this.createGPUBuffer(1+4*2+this.maxLights*6, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]);


    #uniformBufferSwap = this.createGPUBuffer(4 * 16 * 2 + 4 * 4 + 3 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);
    #uniformBindGroupNoTime = this.createBindGroup(
        this.#uniformBindGroupLayout,
        {
            binding: 0,
            resource: {
                buffer: this.uniformBuffer
            }
        }
    );
    #uniformBindGroupLights = this.createBindGroup(this.#uniformBindGroupLayoutLights,
    {
        binding: 0,
        resource: {
            buffer: this.#lightsBuffer
        }
    });
    #uniformBindGroup = this.createBindGroup(
        this.#uniformBindGroupLayoutWithTime,
        {
            binding: 0,
            resource: {
                buffer: this.uniformBuffer
            }
        }, {
            binding: 1,
            resource: {
                buffer: this.timeBuffer
            }
        }
    );
    #timeBufferStorage = this.createGPUBuffer(4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]); 
    static instance: GPUScene;
    #bufferUpdateEncoders: WeakMap<GPUMapWriteBuffer, GPUCommandBuffer> = new WeakMap();
    baseBindGroup = this.addBindGroup(this.#uniformBindGroup); 
    #currentTime: Float32Array = new Float32Array(1);
    #createdAt: number = new Date().getTime();
    constructor(public device: GPUDevice) {
        this.baseBindGroup.onRender = async (time) => {
            this.#currentTime.set([(this.#createdAt - time) % 100000 / 1000]);  // %100000 is to keep float minimal for greater precise
            await this.updateBuffer(this.#timeBufferStorage, this.#currentTime.buffer)
        }
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.#timeBufferStorage, 0,
            this.timeBuffer, 0,
            4);
        this.#bufferUpdateEncoders.set(this.#timeBufferStorage, commandEncoder.finish());
        const commandEncoderView = device.createCommandEncoder();
        commandEncoderView.copyBufferToBuffer(
            this.#uniformBufferSwap, 0,
            this.uniformBuffer, 0,
            4 * 16 * 2 + 4 * 4 + 3 * 4);
        this.#bufferUpdateEncoders.set(this.#uniformBufferSwap, commandEncoderView.finish());
        GPUScene.instance = this;
    }
    async updateBuffer(buffer:GPUMapWriteBuffer, ...data:ArrayBuffer[]) {
        if (this.#syncedBuffers.has(buffer))
            return
        const size = data.reduce((prev, curr) => prev + curr.byteLength, 0);
        this.#syncedBuffers.add(buffer);
        await buffer.mapAsync(GPUMapMode.WRITE, 0, size);
        let offset = 0;
        data.forEach(buff => {
            new Int8Array(buffer.getMappedRange(offset, buff.byteLength)).set(new Int8Array(buff));
            offset += buff.byteLength;
        });
        buffer.unmap();
        this.device.defaultQueue.submit([this.#bufferUpdateEncoders.get(buffer)!])
        this.#syncedBuffers.delete(buffer);
    }
    async updateView(viewProjection: Float32Array, view: Float32Array, viewPosition: Float32Array, cameraPosition: Float32Array) {
        await this.updateBuffer(this.#uniformBufferSwap, viewProjection.buffer, view.buffer, viewPosition.buffer, cameraPosition.buffer);

    }
    

    
    #syncedBuffers: WeakSet<GPUMapWriteBuffer | GPUMapReadBuffer> = new WeakSet()
    //uniform
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUUniformBuffer & GPUCopyDSTBuffer
    //index
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX], mappedAtCreation?: boolean): GPUIndexBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUIndexBuffer & GPUStorageBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUIndexBuffer & GPUStorageBuffer & GPUCopySRCBuffer
    //vertex
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.VERTEX], mappedAtCreation?: boolean): GPUVertexBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUVertexBuffer & GPUStorageBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUVertexBuffer & GPUCopyDSTBuffer

    //storage 
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUStorageBuffer //(can be mapped at creation)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUStorageBuffer & GPUCopySRCBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUStorageBuffer & GPUCopyDSTBuffer

    //MAP read (Only CopyDst is allowed with MapRead)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUMapReadBuffer & GPUCopyDSTBuffer

    //MAP write (Only CopySrc is allowed with MapWrite)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.MAP_WRITE, typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.MAP_WRITE], mappedAtCreation?: boolean): GPUMapWriteBuffer & GPUCopySRCBuffer
    //copy source for mapped at creation
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUCopySRCBuffer


    createGPUBuffer(size: number, usages: number[], mappedAtCreation: boolean=false): GPUBuffer {
        if (size === 0)
            throw (new Error('Cannot create zero sized buffer'));
        const usage = usages.reduce((prev, curr) => prev | curr, 0);
        const buff = this.device.createBuffer({ usage, size, mappedAtCreation });
       
        if (usage & GPUBufferUsage.MAP_READ) {
            (buff as GPUMapReadBuffer).readAndDestroy = (callback: (buff: ArrayBuffer) => Promise<void>): Promise<void> => {
                return buff.mapAsync(GPUMapMode.READ).then(() => {
                    const arrbuff = buff.getMappedRange();
                    callback(arrbuff).finally(() => buff.destroy())
                });
            }
        }
         else if (usage & GPUBufferUsage.COPY_SRC)
            this.bufferSizes.set(buff, size);

        return buff;
    }
    createCopy(commandEncoder: GPUCommandEncoder, ...buffers: GPUCopySRCBuffer[]): (GPUMapReadBuffer & GPUCopyDSTBuffer)[]  {
        const readBuffers: (GPUMapReadBuffer & GPUCopyDSTBuffer)[] = [];
        buffers.forEach(buffer => {
            let size: number | undefined;
            if (size = this.bufferSizes.get(buffer)) {
                const gpuReadBuffer = this.createGPUBuffer(size, [GPUBufferUsage.COPY_DST ,GPUBufferUsage.MAP_READ])
                readBuffers.push(gpuReadBuffer);
                commandEncoder.copyBufferToBuffer(
                    buffer, // source buffer
                    0, //source offset
                    gpuReadBuffer, //destination buffer
                    0, //destination offset
                    size
                );
            }
            else
                throw (new Error('Buffer size not found from weakmap'));
        });
        return readBuffers; 
    }
    createUpdate(buffer: GPUCopyDSTBuffer, data: ArrayBuffer | SharedArrayBuffer): void {
        const commandEncoder = this.device.createCommandEncoder() as TerraGPUCommandEncoder;
        const gpuBuffer = this.createGPUBuffer(data.byteLength, [GPUBufferUsage.COPY_SRC], true);
        const arr = gpuBuffer.getMappedRange();
        new Int8Array(arr).set(new Int8Array(data));
        gpuBuffer.unmap();
        commandEncoder.copyBufferToBuffer(
            gpuBuffer, // source buffer
            0, //source offset
            buffer, //destination buffer
            0, //destination offset
            data.byteLength
        );
    }
    createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): TerraGPUCommandEncoder  {
        const commandEncoder = this.device.createCommandEncoder(descriptor) as TerraGPUCommandEncoder;
     /*   commandEncoder.finishWithCopy = (callback: (...buff: GPUBuffer[]) => Promise<void>, ...buffers: GPUCopySRCBuffer[]) => {
            this.createCopyBuffers(commandEncoder, buffers, callback);
        }*/
        return commandEncoder;
    }
    GPU2CPU(callback: (...buff: GPUBuffer[]) => Promise<void>, ...buffers: GPUCopySRCBuffer[]): void {
        const commandEncoder = this.device.createCommandEncoder();
        const readBuffers = this.createCopy(commandEncoder, ...buffers);
        this.device.defaultQueue.submit([commandEncoder.finish()]);
        callback(...readBuffers).finally(() => readBuffers.forEach(gpuReadBuffer => gpuReadBuffer.destroy()));
    }
    createComputePipeline(shader: string, layout?: GPUPipelineLayout, entryPoint = 'main'): TerraGPUComputePipeLine {
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
        const pipeline = this.device.createComputePipeline(desc) as TerraGPUComputePipeLine;
        pipeline.createBindGroup = (layout: number | GPUBindGroupLayout, entries) => this.device.createBindGroup({
            layout: layout instanceof GPUBindGroupLayout ? layout : pipeline.getBindGroupLayout(layout),
            entries: entries
        });
        return pipeline
    }
  /*  BindGroupDrawablesTree: BindGroupDrawablesTree = {
        layout: this.device.createPipelineLayout({
            bindGroupLayouts: [this.uniformBindGroupLayoutWithTime]
        }),
        bindgroup: this.#uniformBindGroup,
        meshes: new Set(),
        subBindGroups: new Set()
    }*/
   
    baseBindGroupNoTime = this.addBindGroup(this.#uniformBindGroupNoTime); 

    lightsBindGroup = this.baseBindGroupNoTime.addChildBindGroup(this.#uniformBindGroupLights);


    render(renderPass: GPURenderPassEncoder, time: DOMHighResTimeStamp) {
        //let updateTime = false;
        let index = 0;
        BindGroupDrawable.instances.forEach(function drawBindGroups(bgt) {
            if (bgt.meshes.size || bgt.subBindGroups.size) {
                bgt.onRender && bgt.onRender(time);
                if (bgt.sharedBindgroup)
                    renderPass.setBindGroup(index, bgt.sharedBindgroup);
                bgt.meshes.forEach(m => {
                   // !updateTime && m.useTime && (updateTime = true);
                    m.draw(renderPass);
                });
                if (bgt.subBindGroups.size) {
                    index++;
                    bgt.subBindGroups.forEach(drawBindGroups);
                    index--;
                }
            }
        });
        //console.group();
       // console.log('iterate');
     /*   BindGroupDrawable.instances.forEach(drawBindGroup => {
            (function drawBindGroups(bgt: BindGroupDrawable, index: number) {
                if (bgt.meshes.size || bgt.subBindGroups.size) {
                   // console.log('setBindGroup index ', index);
                    if (bgt.sharedBindgroup)
                        renderPass.setBindGroup(index, bgt.sharedBindgroup);
                    bgt.meshes.forEach(m => {
                        !updateTime && m.useTime && (updateTime = true);
                        m.draw(renderPass);
                    });
                    bgt.subBindGroups.forEach(sm => drawBindGroups(sm, index + 1));
                }
            })(drawBindGroup, 0);
        });*/
        //console.groupEnd();
/*
        if (updateTime) {
            this.#time = time;
            this.updateTime();
        }
        */
    }
    
}
export class BindGroupDrawable {
    static instances: Set<BindGroupDrawable> = new Set();
    meshes: Set<Drawable> = new Set();
    subBindGroups: Set<BindGroupDrawable> = new Set();
    layout: GPUPipelineLayout;
    onRender: ((time: DOMHighResTimeStamp) => void) | null = null;
    constructor(public gpuscene: GPUScene, public bindGroupLayout: GPUBindGroupLayout, public parent?:BindGroupDrawable, public sharedBindgroup?: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)) {
        const layoutTree: GPUBindGroupLayout[] = [bindGroupLayout];
        if (parent) {
            let curparent: BindGroupDrawable | undefined = parent;
            do {
                layoutTree.unshift(curparent.bindGroupLayout);
            } while (curparent = curparent.parent)
            parent.subBindGroups.add(this);
        } else
            BindGroupDrawable.instances.add(this);
        this.layout = this.gpuscene.device.createPipelineLayout({ bindGroupLayouts: layoutTree });
        
    }
    addChildLayout(meshBindGroupLayout: (BindGroupLayoutOneBinding | BindGroupLayoutTwoBinding | BindGroupLayoutThreeBinding | BindGroupLayoutFourBinding)): BindGroupDrawable {
        return new BindGroupDrawable(this.gpuscene, meshBindGroupLayout, this);
    }
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)): BindGroupDrawable {

        return new BindGroupDrawable(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup);
    }
    addDrawable(renderPipeline: GPURenderPipelineDescriptor, bindGroups: GPUBindGroup[] | null, indexOrVertexCount: number, instanceCount = 1, firstInstance = 0, firstVertexOrIndex = 0) {
        if (!renderPipeline.rasterizationState) {
            renderPipeline.rasterizationState = {
                cullMode: 'front',
            }
        }
        const d = new Drawable(renderPipeline, bindGroups||[], indexOrVertexCount, instanceCount, firstInstance, firstVertexOrIndex, this)
        this.meshes.add(d);
        return d;
    }
}
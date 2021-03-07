import { TerraNodeGPU } from "./TerraNode.js";
import type { RenderPass, RenderPassCanvas } from "./GPU/RenderPass.js";
import { BindGroupLayout, DynamicBindGroupLayout } from "./GPU/BindGroupLayout.js";
import type { Scene } from "./Scene.js";
type CopyBuffers<T> = {
    [K in keyof T]: (GPUMapReadBuffer & GPUCopyDSTBuffer)
};
export class GPU {
    #bufferSizes: WeakMap<GPUBuffer, number> = new WeakMap();
    #bufferIndexFormats: WeakMap<GPUBuffer, GPUIndexFormat> = new WeakMap();

   // NodeInstances: Map<TerraNodeGPU, number> = new Map();

    GPUBindGroupLayouts: WeakMap<GPUBindGroup, GPUBindGroupLayout> = new WeakMap();
    DynamicBindGroups: WeakSet<GPUBindGroup> = new WeakSet();

    uniformBindGroupLayoutWithTime = this.createBindGroupLayout(
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer:{
                type:"uniform"
            }
        },
        {
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            buffer:{
                type:"uniform"
            }        }
    );
    uniformBindGroupLayoutLightsWGSL2 = this.createBindGroupLayout({
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer:{
            type:"uniform"
        }    });
    uniformBindGroupLayoutLightsWGSL = this.device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: { }
        }]
    });
    rootlayout = new BindGroupLayout(this, this.uniformBindGroupLayoutWithTime, undefined, undefined, false, true);
    rootSceneLayout = new BindGroupLayout(this, this.uniformBindGroupLayoutLightsWGSL2, this.rootlayout, undefined, false);

    //viewprojection and camera position

    singleWritableStorageLayout = this.device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer:{
                    type:"storage"
                }
            }]
    })

    shaderModules: Map<string, GPUShaderModule> = new Map();
    //Todo: Remove COPY_SRC
    GPUData = this.createGPUBuffer(TerraNodeGPU.alignment * TerraNodeGPU.maxInstances, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);
    CPUData = new SharedArrayBuffer(TerraNodeGPU.alignment * TerraNodeGPU.maxInstances);
    DataSlots: number[] = new Array(TerraNodeGPU.maxInstances).fill(TerraNodeGPU.alignment).map((v, i) => i * v);
    
    BindGroup: BindGroupOneBinding;
    BindGroupLayout = this.createBindGroupLayout(
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer:{
                type:"uniform",
                hasDynamicOffset: true
            }
        });
    timeGroup: { binding: number; resource: { buffer: GPUUniformBuffer & GPUCopyDSTBuffer; }; };
    timeBuffer: GPUUniformBuffer & GPUCopyDSTBuffer;

    cameraAndTimeBindGroupLayout = this.device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: { }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.VERTEX,
                buffer: { }
            }]
    });

    addBindGroup(bindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)): BindGroupLayout
    addBindGroup(bindgroup: (BindGroupOneBinding), isDynamic: boolean): DynamicBindGroupLayout<[number]>
    addBindGroup(bindgroup: (BindGroupTwoBinding), isDynamic: boolean): DynamicBindGroupLayout<[number, number]>
    addBindGroup(bindgroup: (BindGroupThreeBinding), isDynamic: boolean): DynamicBindGroupLayout<[number, number, number]>
    addBindGroup(bindgroup: (BindGroupFourBinding), isDynamic: boolean): DynamicBindGroupLayout<[number, number, number, number]>
    addBindGroup(bindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), isDynamic?: boolean): BindGroupLayout | DynamicBindGroupLayout<number[]>{
        const bglayout = this.GPUBindGroupLayouts.get(bindgroup);
        if (!bglayout)
            throw ('Bindgroup layout not found from weakmap');
        if(!isDynamic)
            return new BindGroupLayout(this, bglayout, undefined, bindgroup);
        return new DynamicBindGroupLayout(this, bglayout, undefined, bindgroup, isDynamic);
    }

    createBindGroupLayout(entry: GPUBindGroupLayoutEntry): BindGroupLayoutOneBinding
    createBindGroupLayout(...entries: [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]): BindGroupLayoutTwoBinding
    createBindGroupLayout(...entries: [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]): BindGroupLayoutThreeBinding
    createBindGroupLayout<T extends GPUBindGroupLayoutEntry[]>(...entries: T): TerraBindGroupLayout {
        const layout = this.device.createBindGroupLayout({ entries }) as TerraBindGroupLayout;
        layout.createBindGroup = (...entries: GPUBindGroupEntry[]) => {
            const bindGroup = this.device.createBindGroup({ layout, entries });
            this.GPUBindGroupLayouts.set(bindGroup, layout);
            return bindGroup
        }
        return this.device.createBindGroupLayout({ entries }) as TerraBindGroupLayout;
    }

    createBindGroup<T extends GPUBindGroupLayout, U extends bindings<T>>(layout: T, ...entries: U): getBindType<T>
    createBindGroup(layout: GPUBindGroupLayout, ...entries: GPUBindGroupEntry[]): GPUBindGroup {
        const bindGroup = this.device.createBindGroup({ layout, entries });
        this.GPUBindGroupLayouts.set(bindGroup, layout);
        return bindGroup
    }

    static instance: GPU;


    async getShaderModule(url: string) {
        let module = this.shaderModules.get(url);
        if (module)
            return module
        module = this.device.createShaderModule({
            code: await (await fetch(url)).text()
        });
        this.shaderModules.set(url, module);
        return module;
    }
    onResizes: Set<() => void> = new Set();
    queue: Map<Float32Array, number> = new Map();
    buildBindGroupHierarcy(baseBindGroup: BindGroupLayout, ...bindgroups: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)[]) {
        let parentBGLayout = baseBindGroup;
        let childBG: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding) | undefined
        while (childBG = bindgroups.shift()) {
            if (this.DynamicBindGroups.has(childBG))
                parentBGLayout = parentBGLayout.addChildBindGroup(childBG, true);
            else
                parentBGLayout = parentBGLayout.addChildBindGroup(childBG);
        }
        return parentBGLayout;
    }
    renderPassScreen: RenderPassCanvas
    renderPassWater: RenderPass
    constructor(public canvas: HTMLCanvasElement, public device: GPUDevice, createRenderPasses: (gpu: GPU) => [RenderPassCanvas, RenderPass]) {

        //Scene layoyt is iterated manually so remove it not to iterate it twise.
        this.rootlayout.subBindGroups.delete(this.rootSceneLayout);

        [this.renderPassScreen, this.renderPassWater] = createRenderPasses(this)
        this.BindGroup = this.createBindGroup(this.BindGroupLayout,
            {
                binding: 0,
                resource: {
                    buffer: this.GPUData,
                    offset: 0,
                    size: TerraNodeGPU.GPUDataSize*4
                }
            });
        this.DynamicBindGroups.add(this.BindGroup);
        const timeAndDeltaBuffer = new ArrayBuffer(8);
        this.timeBuffer = this.createGPUBuffer(timeAndDeltaBuffer.byteLength, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]);
        this.timeGroup = {
            binding: 1,
            resource: {
                buffer: this.timeBuffer
            }
        }
      /*  this.baseBindGroup.onRender = function (time, delta) {

           // windIntensivy = Math.min(Math.max(windIntensivy+0.000625-(Math.random()*0.00125),-1),1)
            timeView.set([time]);
            if (me.properties & 1) {
               // console.log('set animation', Math.cos(time * 0.0001) * Math.PI * 2)
               // animationView.set([Math.cos(time * 0.0001) * Math.PI * 2]);
                animationView.set([Math.cos(time * 0.001)]);
                //animationView.set([time * 0.001]);
              //  animationView.set([windIntensivy]);
            }
            if (delta !== null)
                deltaView.set([delta]);
            return me.updateBufferRaw(timeBufferStorage, timeBuffer, timeAndDeltaBuffer);

        }*/
        GPU.instance = this;
    }
    updateBufferRaw(commandEncoder: GPUCommandEncoder, destination: GPUCopyDSTBuffer, data: ArrayBuffer) {
        const tempBuffer = this.createGPUBuffer(data.byteLength, [GPUBufferUsage.COPY_SRC], true);
        new Int8Array(tempBuffer.getMappedRange()).set(new Int8Array(data));
        tempBuffer.unmap();
        commandEncoder.copyBufferToBuffer(
            tempBuffer, 0,
            destination, 0,
            data.byteLength);
    }
    async updateBuffer(buffer: GPUCopySRCBuffer, destination: GPUCopyDSTBuffer, ...data: (Float32Array | Uint32Array)[]): Promise<GPUCommandBuffer | null> {
        const size = data.reduce((prev, curr) => prev + curr.byteLength, 0);
        await buffer.mapAsync(GPUMapMode.WRITE, 0, size);
        let offset = 0;
        data.forEach(view => {
            new Int8Array(buffer.getMappedRange(offset, view.byteLength)).set(new Int8Array(view.buffer, 0, view.byteLength));
            offset += view.byteLength;
        });
        return this.copyBufferToBuffer(buffer, destination, size)
    }
    copyBufferToBuffer(buffer: GPUCopySRCBuffer, destination: GPUCopyDSTBuffer, size: number): GPUCommandBuffer {
        buffer.unmap();
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            buffer, 0,
            destination, 0,
            size);
        return commandEncoder.finish();
    }

    createInputBuffer(usage: typeof GPUBufferUsage.VERTEX, data: SharedArrayBuffer): GPUVertexBuffer
    createInputBuffer(usage: typeof GPUBufferUsage.VERTEX, data: Float32Array): [SharedArrayBuffer, GPUVertexBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.INDEX, data: (Uint16Array | Uint32Array)): [SharedArrayBuffer, GPUIndexBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.VERTEX, data: Float32Array, updatable: boolean): [SharedArrayBuffer, GPUVertexBuffer & GPUCopyDSTBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.INDEX, data: Uint16Array | Uint32Array, updatable: boolean): [SharedArrayBuffer, GPUIndexBuffer & GPUCopyDSTBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.VERTEX, data: Float32Array | Uint16Array | Uint32Array | SharedArrayBuffer, updatable = false) {
        if (data instanceof SharedArrayBuffer) {
            var CPUBuffer = data;
            var uintView = new Uint8Array(CPUBuffer);
        }
        else {
            var CPUBuffer = new SharedArrayBuffer(data.byteLength);
            var uintView = new Uint8Array(CPUBuffer);
            uintView.set(new Uint8Array(data.buffer));
        }
        if (updatable)
            usage |= GPUBufferUsage.COPY_DST;
        const GPUBuffer = this.device.createBuffer({ usage, size: data.byteLength, mappedAtCreation: true });
        new Uint8Array(GPUBuffer.getMappedRange()).set(uintView);
        GPUBuffer.unmap();
        if (data instanceof SharedArrayBuffer)
            return GPUBuffer;
        return [CPUBuffer, GPUBuffer]
    }
    //uniform
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUUniformBuffer & GPUCopyDSTBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUUniformBuffer & GPUCopyDSTBuffer & GPUStorageBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUUniformBuffer & GPUCopyDSTBuffer & GPUStorageBuffer & GPUCopySRCBuffer
    //index
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX], mappedAtCreation?: boolean): GPUIndexBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUIndexBuffer & GPUCopyDSTBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUIndexBuffer & GPUStorageBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUIndexBuffer & GPUStorageBuffer & GPUCopySRCBuffer
    //vertex
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.VERTEX], mappedAtCreation?: boolean): GPUVertexBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUVertexBuffer & GPUStorageBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUVertexBuffer & GPUCopyDSTBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUVertexBuffer & GPUCopyDSTBuffer & GPUStorageBuffer
    //indirect
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDIRECT], mappedAtCreation?: boolean): GPUIndirectBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDIRECT | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.INDIRECT | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUIndirectBuffer & GPUCopyDSTBuffer

    //storage 
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUStorageBuffer //(can be mapped at creation)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUStorageBuffer & GPUCopySRCBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUStorageBuffer & GPUCopyDSTBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUStorageBuffer & GPUCopyDSTBuffer & GPUCopySRCBuffer

    //MAP read (Only CopyDst is allowed with MapRead)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUMapReadBuffer & GPUCopyDSTBuffer

    //MAP write (Only CopySrc is allowed with MapWrite)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.MAP_WRITE, typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.MAP_WRITE], mappedAtCreation?: boolean): GPUMapWriteBuffer & GPUCopySRCBuffer
    //copy source for mapped at creation
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUCopySRCBuffer


    createGPUBuffer(size: number, usages: number[], mappedAtCreation: boolean = false, GPUIndexFormat?: GPUIndexFormat): GPUBuffer {
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
            this.#bufferSizes.set(buff, size);

        if (usage & GPUBufferUsage.INDEX) {
            this.#bufferIndexFormats.set(buff, GPUIndexFormat!);
        }

        return buff;
    }
    createCopy<T extends GPUCopySRCBuffer[]>(commandEncoder: GPUCommandEncoder, ...buffers: T): CopyBuffers<T> {
        const readBuffers: (GPUMapReadBuffer & GPUCopyDSTBuffer)[] = [];
        buffers.forEach(buffer => {
            let size: number | undefined;
            if (size = this.#bufferSizes.get(buffer)) {
                const gpuReadBuffer = this.createGPUBuffer(size, [GPUBufferUsage.COPY_DST, GPUBufferUsage.MAP_READ])
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
        return readBuffers as CopyBuffers<T>;
    }

    createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): TerraGPUCommandEncoder {
        const commandEncoder = this.device.createCommandEncoder(descriptor) as TerraGPUCommandEncoder;
        /*   commandEncoder.finishWithCopy = (callback: (...buff: GPUBuffer[]) => Promise<void>, ...buffers: GPUCopySRCBuffer[]) => {
               this.createCopyBuffers(commandEncoder, buffers, callback);
           }*/
        return commandEncoder;
    }
    GPU2CPU(callback: (...buff: (GPUMapReadBuffer & GPUCopyDSTBuffer)[]) => Promise<void>, ...buffers: GPUCopySRCBuffer[]): void {
        const commandEncoder = this.device.createCommandEncoder();
        const readBuffers = this.createCopy(commandEncoder, ...buffers);
        this.device.queue.submit([commandEncoder.finish()]);
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
    properties = 0
    readonly onRenders2: (() => (GPUCommandBuffer | null))[] = []
    pendingCommandBuffers: GPUCommandBuffer[] = [];
    drawBindGroups(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, bgt: BindGroupLayout, renderPass: RenderPass, index: number, scene?: Scene) {
        let drawedMeshes = 0;
        if (bgt.renderPipeLines.size || bgt.subBindGroups.size) {
            if (bgt.sharedBindgroup && this.DynamicBindGroups.has(bgt.sharedBindgroup)) {
                bgt.renderPipeLines.forEach(m => {
                    renderPassEncoder.setBindGroup(index, bgt.sharedBindgroup!, m.dynamicBindGroupOffset);
                    drawedMeshes+=m.draw(renderPassEncoder, renderPass, index, scene);
                });
            }
            else {
                if (bgt.sharedBindgroup) {
                    renderPassEncoder.setBindGroup(index, bgt.sharedBindgroup);
                }
                bgt.renderPipeLines.forEach(m => {
                    this.properties |= m.properties;
                    drawedMeshes+=m.draw(renderPassEncoder, renderPass, index, scene)
                });
            }
            if (bgt.subBindGroups.size) {
                bgt.subBindGroups.forEach((bgt) => { drawedMeshes += this.drawBindGroups(renderPassEncoder, bgt, renderPass, ++index, scene)});
            }
        }
        return drawedMeshes;
    }
}
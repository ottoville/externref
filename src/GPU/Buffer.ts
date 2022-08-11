import { type GPU, GPUBufferUsage } from "../GPU.js";
import type { Engine } from "../engine.js";
import type { BindGroup } from "./BindGroup.js";
import { Bindable } from "./Bindable.js";
declare const engine:Engine;

export interface CopyDstBuffer extends Buffer {
    updateBufferRaw: (commandEncoder: GPUCommandEncoder, data: ArrayBuffer) => void
    copyFrom: (commandEncoder: GPUCommandEncoder, from:GPUBuffer, sourceOffset: GPUSize64, destinationOffset: GPUSize64, copySize: GPUSize64) => void
    copyFromTexture:(commandEncoder:GPUCommandEncoder, source: GPUImageCopyTexture, dataLayout: GPUImageDataLayout, copySize: GPUExtent3DStrict) => void
    write: (bufferOffset: GPUSize64, data:BufferSource | SharedArrayBuffer, dataOffset?: GPUSize64, writeSize?: GPUSize64) => void
}
//TODO
export interface MappedBuffer {
    getMappedRange: () => void
}
export interface BindUniformBuffer extends Buffer {
    getUniformBinding: (bindGroup: BindGroup, offset?: GPUSize64, size?:GPUSize64) => GPUBufferBinding;
}
export interface BindStorageBuffer extends Buffer {
    getStorageBinding: (bindGroup: BindGroup, offset?: GPUSize64, size?:GPUSize64) => GPUBufferBinding;
}
export interface VertexBuffer extends Buffer {
    vertexBuffer: GPUBuffer;
}
export interface IndexBuffer extends Buffer {
    indexBuffer: GPUBuffer;
}
export interface IndirectBuffer extends Buffer {
    indirectBuffer: GPUBuffer;
}
function bufferBinding(this:Buffer,label:string, bindGroup: BindGroup, offset=0,bindingSize?:GPUSize64): GPUBufferBinding&GPUObjectBase {
    const obj : GPUBufferBinding&GPUObjectBase={
        buffer: this.buffer,
        offset,
        label: label+'_Binding_for_buffer_'+this.label
    }
    if (bindingSize) {
        obj.size=bindingSize;
    }
    this.bindGroups.add(bindGroup);
    return obj;
}
export class Buffer extends Bindable {
    
    readonly QUERY_RESOLVE?: boolean
    protected usage: number;
    //uniform
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.UNIFORM], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): BindUniformBuffer
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): BindUniformBuffer & BindStorageBuffer
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void):  CopyDstBuffer & BindUniformBuffer
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void):CopyDstBuffer & BindUniformBuffer & BindStorageBuffer
    
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): copySrcBuffer & CopyDstBuffer & BindUniformBuffer & BindStorageBuffer
   
    //index
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.INDEX], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): IndexBuffer
    /* static create(size: number, usages: [typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean, label?:string): GPUIndexBuffer & GPUCopyDSTBuffer
    static create(size: number, usages: [typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean, label?:string): GPUIndexBuffer & GPUStorageBuffer
    */
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): copySrcBuffer & BindStorageBuffer & IndexBuffer
    //vertex
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.VERTEX], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): VertexBuffer
   /* static create(size: number, usages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean, label?:string): GPUVertexBuffer & GPUStorageBuffer
  */static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): CopyDstBuffer & VertexBuffer
   /* static create(size: number, usages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean, label?:string): GPUVertexBuffer & GPUCopyDSTBuffer & GPUStorageBuffer
    //indirect
    static create(size: number, usages: [typeof GPUBufferUsage.INDIRECT], mappedAtCreation?: boolean, label?:string): GPUIndirectBuffer
    */
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.INDIRECT | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.INDIRECT | typeof GPUBufferUsage.COPY_DST], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): CopyDstBuffer & IndirectBuffer

    //storage 
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.STORAGE], label:string,mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): BindStorageBuffer //(can be mapped at creation)
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): copySrcBuffer & BindStorageBuffer
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): CopyDstBuffer & BindStorageBuffer
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): copySrcBuffer & CopyDstBuffer & BindStorageBuffer
    static create(gpu: GPU, size: number, usages:[
        typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.VERTEX,
        typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.VERTEX,
        typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.VERTEX,
        typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.VERTEX], label:string, mappedAtCreation?: (buff: GPUBuffer) => void):  copySrcBuffer & CopyDstBuffer & BindStorageBuffer & VertexBuffer

    //copy source for mapped at creation
    static create(gpu: GPU, size: number, usages: [typeof GPUBufferUsage.COPY_SRC], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void): copySrcBuffer
    static create(gpu: GPU, size: number, usages: number[], label:string, mappedAtCreation?:(buff: GPUBuffer, gpu:GPU) => void) {
        let b:Buffer;
        if(usages.includes(GPUBufferUsage.COPY_SRC)) {
            b = new copySrcBuffer(gpu, size, usages, typeof mappedAtCreation !== "undefined", label);
        }
        else {
            b = new Buffer(gpu, size, usages, typeof mappedAtCreation !== "undefined", label)
        }
        if(mappedAtCreation) {
            try {
                mappedAtCreation(b.buffer, gpu);
            } catch(e) {
                engine.showError(e);
                return;
            }
            b.buffer.unmap();
        }
        return b;
    }
    protected buffer: GPUBuffer;
    constructor(protected gpu: GPU, size: number, protected usages: number[], mappedAtCreation = false, public label:string) {
        if (size === 0)
            throw (new Error('Cannot create zero sized buffer'));
        super();
        this.usage = usages.reduce((prev, curr) => prev | curr, 0);

        const desc:GPUBufferDescriptor = { usage:this.usage, size, mappedAtCreation }
        if(label)
            desc.label=label;
        try {
            this.buffer = gpu.device.createBuffer(desc);
        } catch(e) {
            engine.showError(e);
            throw(new Error('Cannot create buffer', {cause: (e instanceof Error ? e: new Error(new String(e).toString()))}));
        }
        if(usages.includes(GPUBufferUsage.UNIFORM)) {
            (this as unknown as BindUniformBuffer).getUniformBinding = bufferBinding.bind(this, 'UNIFORM');
        }
        if(usages.includes(GPUBufferUsage.STORAGE)) {
            (this as unknown as BindStorageBuffer).getStorageBinding = bufferBinding.bind(this, 'STORAGE')
        }
        if(usages.includes(GPUBufferUsage.VERTEX)) {
            (this as unknown as VertexBuffer).vertexBuffer = this.buffer
        }
        if(usages.includes(GPUBufferUsage.INDEX)) {
            (this as unknown as IndexBuffer).indexBuffer = this.buffer
        }
        if(usages.includes(GPUBufferUsage.INDIRECT)) {
            (this as unknown as IndirectBuffer).indirectBuffer = this.buffer
        }
        if(usages.includes(GPUBufferUsage.COPY_DST)) {
            (this as unknown as CopyDstBuffer).updateBufferRaw = (commandEncoder, data) => {
                const tempBuffer = new copySrcBuffer(gpu, data.byteLength, [], true, label+'_swap');
                this.gpu.tempGPUBuffers.push(tempBuffer.buffer);
                new Int8Array(tempBuffer.buffer.getMappedRange()).set(new Int8Array(data));
                tempBuffer.buffer.unmap();
                commandEncoder.copyBufferToBuffer(
                    tempBuffer.buffer, 0,
                    this.buffer, 0,
                    data.byteLength);
            }
            (this as unknown as CopyDstBuffer).copyFrom = (commandEncoder, from, sourceOffset, destinationOffset, copySize) => {
                commandEncoder.copyBufferToBuffer(
                    from, // source buffer
                    sourceOffset,
                    this.buffer, //destination buffer
                    destinationOffset,
                    copySize
                );
            }
            (this as unknown as CopyDstBuffer).copyFromTexture = (commandEncoder:GPUCommandEncoder, source: GPUImageCopyTexture, dataLayout: GPUImageDataLayout, copySize: GPUExtent3DStrict) => {
                commandEncoder.copyTextureToBuffer(
                    source, {
                        buffer: this.buffer,
                        ...dataLayout
                    },
                    copySize
                );
            }
            (this as unknown as CopyDstBuffer).write = (bufferOffset, data, dataOffset?, writeSize?) => {
                gpu.device.queue.writeBuffer(this.buffer, bufferOffset, data, dataOffset,writeSize);
            }
            
        }
    }
    override destroy() {
        this.buffer.destroy();
        super.destroy();
    }
}
class copySrcBuffer extends Buffer {
    constructor(gpu: GPU, private size: number, usages: number[], mappedAtCreation=false, label: string) {
        super(gpu, size, [GPUBufferUsage.COPY_SRC, ...usages],mappedAtCreation, label)
    }
    copyTo(commandEncoder: GPUCommandEncoder, buffer: CopyDstBuffer, sourceOffset: GPUSize64, destinationOffset: GPUSize64, copySize: GPUSize64) {
        buffer.copyFrom(commandEncoder, this.buffer, sourceOffset, destinationOffset, copySize);
    }
    createReadCopy(commandEncoder: GPUCommandEncoder) {
        const gpuReadBuffer = new ReadBuffer(this.gpu, this.size, this.label+'_readCopy');
        gpuReadBuffer.copyFrom(commandEncoder,this.buffer,0,0,this.size);
        return gpuReadBuffer;
    }
    resize(size: number) {
        try {
            const commandEncoder = this.gpu.device.createCommandEncoder({label: 'bufferResizeEncoder'})
            const newBuffer = this.gpu.device.createBuffer({ usage:this.usage | GPUBufferUsage.COPY_DST, size, label: this.label });
            commandEncoder.copyBufferToBuffer(this.buffer, 0, newBuffer,0,this.size);
            this.gpu.device.queue.submit([commandEncoder.finish()]);
            this.size=size;
            this.destroy();
            this.buffer=newBuffer;
        } catch(e) {
            engine.showError(e);
            throw(new Error('Cannot create buffer', {cause: (e instanceof Error ? e: new Error(new String(e).toString()))}));
        }
    }
}
 //MAP write (Only CopySrc is allowed with MapWrite)
export class WriteBuffer extends copySrcBuffer {
    constructor(gpu: GPU, size: number, label: string) {
        super(gpu, size, [GPUBufferUsage.MAP_WRITE, GPUBufferUsage.COPY_SRC], false, label)
    }
}
 //MAP read (Only CopyDtst is allowed with MapRead)
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ReadBuffer extends CopyDstBuffer {}
export class ReadBuffer extends Buffer {
    constructor(gpu: GPU, size: number, label: string) {
        super(gpu, size, [GPUBufferUsage.MAP_READ, GPUBufferUsage.COPY_DST], false, label)
    }
    async readAndDestroy(callback: (buff: ArrayBuffer) => Promise<void> | void): Promise<void> {
        let arrbuff: ArrayBuffer;
        try {
            await this.buffer.mapAsync(GPUMapMode.READ);
            arrbuff = this.buffer.getMappedRange();
        } catch(e) {
            engine.showError(e);
            return;
        }
        
        await callback(arrbuff);
        this.buffer.destroy();
    }
}
export type CopySrcBuffer = copySrcBuffer
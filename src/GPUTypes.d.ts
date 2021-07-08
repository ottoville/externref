interface GPUUniformBuffer extends GPUBuffer {
    uniform: 'true';
}
interface GPUVertexBuffer extends GPUBuffer {
    vertex: 'true';
}
interface GPUIndexBuffer extends GPUBuffer {
    index: 'true';
}
interface GPUIndirectBuffer extends GPUBuffer {
    indirect: 'true';
}
interface GPUStorageBuffer extends GPUBuffer {
    storage: 'true';
}
interface GPUMapReadBuffer extends GPUBuffer {
    readAndDestroy: (callback: (buff: ArrayBuffer) => Promise<void>) => Promise<void>;
}
interface GPUMapWriteBuffer extends GPUBuffer {
    mapread: boolean
}
interface GPUCopySRCBuffer extends GPUBuffer {
    CopySRC: 'true'
}
interface GPUCopyDSTBuffer extends GPUBuffer {
    CopyDST: 'true';
}

interface TerraGPUTextureView<T extends GPUTexture> extends GPUTextureView {
    brand:T
}
interface GPUTextureSampled<FORMAT extends GPUTextureFormat = 'bgra8unorm'> extends GPUTexture {
    sampled: 'true';
    createView(descriptor?: GPUTextureViewDescriptor): TerraGPUTextureView<GPUTextureSampled<FORMAT>>
}
interface GPUTextureRenderAttachment<FORMAT extends GPUTextureFormat = 'bgra8unorm'> extends GPUTexture {
    RenderAttachment: 'true';
    createView(descriptor?: GPUTextureViewDescriptor): TerraGPUTextureView<GPUTextureRenderAttachment<FORMAT>>
}
interface GPUTextureCopySrc extends GPUTexture {
    CopySrc: 'true';
    createView(descriptor?: GPUTextureViewDescriptor): TerraGPUTextureView<GPUTextureCopySrc>
}

type storageBindGroupLayout = {
    binding: number;
    resource: GPUSampler | GPUTextureView | {
        buffer: GPUStorageBuffer;
        offset?: number;
        size?: number;
    }
}
interface TerraGPUComputePipeLine extends GPUComputePipeline {
    createBindGroup(layout: number | GPUBindGroupLayout, entries: Iterable<GPUBindGroupEntry>): GPUBindGroup
}
interface TerraGPUCommandEncoder extends GPUCommandEncoder {
    copyBufferToBuffer(
        source: GPUCopySRCBuffer,
        sourceOffset: GPUSize64,
        destination: GPUCopyDSTBuffer,
        destinationOffset: GPUSize64,
        size: GPUSize64
    ): undefined;
}

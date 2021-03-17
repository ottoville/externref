type GPUBindGroupLayoutEntryNoDynamic = Omit<GPUBindGroupLayoutEntry, "hasDynamicOffset">;

interface TerraGPUBindingResource<bufferType extends GPUBuffer> extends GPUBufferBinding {
    buffer: bufferType
}

interface TerraGPUBindGroupEntry<bufferType extends GPUBuffer> extends GPUBindGroupEntry {
    resource: TerraGPUBindingResource<bufferType>
}
 
interface GPUBindGroupLayoutEntryReadStorage extends Omit<GPUBindGroupLayoutEntry, 'type'>
{
    type: 'readonly-storage-buffer'
   // entry: TerraGPUBindGroupEntry<GPUStorageBuffer>
}
interface GPUBindGroupLayoutEntryUniform extends Omit<GPUBindGroupLayoutEntry, 'type'> {
    type: 'uniform-buffer'
  //  entry: TerraGPUBindGroupEntry<GPUUniformBuffer>
}
type bindings<T> = T extends BindGroupLayoutOneBinding ? [GPUBindGroupEntry]
    : T extends BindGroupLayoutTwoBinding ? [GPUBindGroupEntry, GPUBindGroupEntry]
    : T extends BindGroupLayoutThreeBinding ? [GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]
    : T extends BindGroupLayoutFiveBinding ? [GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]
    : never;

type getBindType<T> = T extends BindGroupLayoutOneBinding ? BindGroupOneBinding
    : T extends BindGroupLayoutTwoBinding ? BindGroupTwoBinding
    : T extends BindGroupLayoutThreeBinding ? BindGroupThreeBinding
    : T extends BindGroupLayoutFiveBinding ? BindGroupFiveBinding
    : never;

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
interface GPUTextureSampled extends GPUTexture {
    sampled: 'true';
    createView(descriptor?: GPUTextureViewDescriptor): TerraGPUTextureView<GPUTextureSampled>
}

interface TerraBindGroupLayout extends GPUBindGroupLayout {
    createBindGroup: (...entries:  GPUBindGroupEntry[]) => GPUBindGroup;
}
interface BindGroupLayoutOneBinding extends TerraBindGroupLayout {
    numBindings: 'one';
}
interface BindGroupLayoutTwoBinding extends GPUBindGroupLayout {
    createBindGroup: (...entries: [GPUBindGroupEntry, GPUBindGroupEntry]) => GPUBindGroup;
    numBindings: 'two';
}
interface BindGroupLayoutThreeBinding extends GPUBindGroupLayout {
    createBindGroup: (...entries: [GPUBindGroupEntry, GPUBindGroupEntry]) => GPUBindGroup;
    numBindings: 'three';
}
interface BindGroupLayoutFourBinding extends GPUBindGroupLayout {
    numBindings: 'four';
}
interface BindGroupLayoutFiveBinding extends GPUBindGroupLayout {
    numBindings: 'five';
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
interface BindGroupFiveBinding extends GPUBindGroup {
    numBindings: 'five';
}
interface TerraGPUComputePipeLine extends GPUComputePipeline {
    createBindGroup(layout: number | GPUBindGroupLayout, entries: Iterable<{
        binding: number;
        resource: GPUSampler | GPUTextureView | {
            buffer: GPUStorageBuffer;
            offset?: number;
            size?: number;
        }
    }>): GPUBindGroup
}
interface TerraGPUCommandEncoder extends GPUCommandEncoder {
    copyBufferToBuffer(
        source: GPUCopySRCBuffer,
        sourceOffset: number,
        destination: GPUCopyDSTBuffer,
        destinationOffset: number,
        size: number
    ): void;
}
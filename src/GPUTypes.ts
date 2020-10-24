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
type bindings<T> = T extends BindGroupLayoutOneBinding<GPUBindGroupLayoutEntry> ? [GPUBindGroupEntry]
    : T extends BindGroupLayoutTwoBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> ? [GPUBindGroupEntry, GPUBindGroupEntry]
    : T extends BindGroupLayoutFiveBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> ? [GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]
    : never;

type getBindType<T> = T extends BindGroupLayoutOneBinding<GPUBindGroupLayoutEntry> ? BindGroupOneBinding
    : T extends BindGroupLayoutTwoBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> ? BindGroupTwoBinding
    : T extends BindGroupLayoutFiveBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> ? BindGroupFiveBinding
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

interface TerraBindGroupLayout<T extends GPUBindGroupLayoutEntry[]> extends GPUBindGroupLayout {
    createBindGroup: (...entries:  GPUBindGroupEntry[]) => GPUBindGroup;
}
interface BindGroupLayoutOneBinding<T extends GPUBindGroupLayoutEntry> extends TerraBindGroupLayout<[T]> {
    numBindings: 'one';
}
interface BindGroupLayoutTwoBinding<T extends [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> extends GPUBindGroupLayout {
    createBindGroup: (...entries: [GPUBindGroupEntry, GPUBindGroupEntry]) => GPUBindGroup;
    numBindings: 'two';
}
interface BindGroupLayoutThreeBinding<T extends [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> extends GPUBindGroupLayout {
    createBindGroup: (...entries: [GPUBindGroupEntry, GPUBindGroupEntry]) => GPUBindGroup;
    numBindings: 'three';
}
interface BindGroupLayoutFourBinding extends GPUBindGroupLayout {
    numBindings: 'four';
}
interface BindGroupLayoutFiveBinding<T extends [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> extends GPUBindGroupLayout {
    numBindings: 'five';
}
/*interface DynamicBindGroupLayoutOneBinding<T extends GPUBindGroupLayoutEntry> extends BindGroupLayoutOneBinding<T> {
    dynamic: 'yes';
}
interface DynamicBindGroupLayoutTwoBinding extends BindGroupLayoutTwoBinding {
    dynamic: 'yes';
}
interface DynamicBindGroupLayoutThreeBinding extends BindGroupLayoutThreeBinding {
    dynamic: 'yes';
}
interface DynamicBindGroupLayoutFourBinding extends BindGroupLayoutFourBinding {
    dynamic: 'yes';
}
*/

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
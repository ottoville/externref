type GPUBindGroupLayoutEntryNoDynamic = Omit<GPUBindGroupLayoutEntry, "hasDynamicOffset">;


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
interface BindGroupLayoutOneBinding extends GPUBindGroupLayout {
    numBindings: 'one';
}
interface BindGroupLayoutTwoBinding extends GPUBindGroupLayout {
    numBindings: 'two';
}
interface BindGroupLayoutThreeBinding extends GPUBindGroupLayout {
    numBindings: 'three';
}
interface BindGroupLayoutFourBinding extends GPUBindGroupLayout {
    numBindings: 'four';
}
interface DynamicBindGroupLayoutOneBinding extends BindGroupLayoutOneBinding {
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
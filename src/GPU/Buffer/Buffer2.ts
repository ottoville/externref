import { Bindable } from '../Bindable.js';
import type { GPU } from '../../GPU.js';
import type { Engine } from '../../engine.js';
import { COPY_SRC_TEXTURE, Texture } from '../Texture.js';
import { RenderPass } from '../RenderPasses/RenderPass.js';
import { BindGroup } from '../BindGroup.js';
declare const engine: Engine;

export const enum BufferUsageEnums {
    MAP_READ = 1,
    MAP_WRITE = 2,
    COPY_SRC = 4,
    COPY_DST = 8,
    INDEX = 16,
    VERTEX = 32,
    UNIFORM = 64,
    STORAGE = 128,
    'MAP_READ|COPY_DST' = BufferUsageEnums.MAP_READ | BufferUsageEnums.COPY_DST,
    'STORAGE|COPY_SRC' = BufferUsageEnums.STORAGE | BufferUsageEnums.COPY_SRC,
    'VERTEX|STORAGE' = BufferUsageEnums.VERTEX | BufferUsageEnums.STORAGE,
    'VERTEX|COPY_DST' = BufferUsageEnums.VERTEX | BufferUsageEnums.COPY_DST,
    'VERTEX|STORAGE|COPY_SRC' = BufferUsageEnums.VERTEX | BufferUsageEnums.STORAGE | BufferUsageEnums.COPY_SRC,
    'VERTEX|STORAGE|COPY_SRC|COPY_DST' = BufferUsageEnums.VERTEX | BufferUsageEnums.STORAGE | BufferUsageEnums.COPY_SRC | BufferUsageEnums.COPY_DST
}
type MAP_READ_BUFFER =  typeof BufferUsageEnums['MAP_READ'] |
                        typeof BufferUsageEnums['MAP_READ|COPY_DST'];
type COPY_SRC_BUFFER =  typeof BufferUsageEnums['COPY_SRC'] |
                        typeof BufferUsageEnums['STORAGE|COPY_SRC'] |
                        typeof BufferUsageEnums['VERTEX|STORAGE|COPY_SRC'] |
                        typeof BufferUsageEnums['VERTEX|STORAGE|COPY_SRC|COPY_DST']
type COPY_DST_BUFFER =  typeof BufferUsageEnums['COPY_DST'] |
                        typeof BufferUsageEnums['MAP_READ|COPY_DST'] |
                        typeof BufferUsageEnums['VERTEX|COPY_DST'] |
                        typeof BufferUsageEnums['VERTEX|STORAGE|COPY_SRC|COPY_DST']
type STORAGE_BUFFER =   typeof BufferUsageEnums['STORAGE'] |
                        typeof BufferUsageEnums['STORAGE|COPY_SRC'] |
                        typeof BufferUsageEnums['VERTEX|STORAGE'] |
                        typeof BufferUsageEnums['VERTEX|STORAGE|COPY_SRC'] |
                        typeof BufferUsageEnums['VERTEX|STORAGE|COPY_SRC|COPY_DST']
type UNIFORM_BUFFER =   typeof BufferUsageEnums['UNIFORM']
export type VERTEX_BUFFER =    typeof BufferUsageEnums['VERTEX'] |
                        typeof BufferUsageEnums['VERTEX|STORAGE'] |
                        typeof BufferUsageEnums['VERTEX|COPY_DST'] |
                        typeof BufferUsageEnums['VERTEX|STORAGE|COPY_SRC'] |
                        typeof BufferUsageEnums['VERTEX|STORAGE|COPY_SRC|COPY_DST'];



export type BufferProps<U extends BufferUsageEnums> = {
    gpu: GPU,
    size: number,
    usages: U,
    label: string,
}

export class Buffer2<U extends BufferUsageEnums> extends Bindable {
    renderPasses: Set<RenderPass> = new Set();
    readonly #buffer: GPUBuffer;
    constructor(public props: BufferProps<U>, mappedAtCreation?: (buff: GPUBuffer, gpu: GPU) => void) {
        if (props.size <= 0)
            throw (new Error('Cannot create zero sized buffer'));
        if(props.size > 268435456) {
            //https://gpuweb.github.io/gpuweb/#dom-supported-limits-maxbuffersize
            throw new Error(`Tried to create buffer ${props.label} but its too large with size ${props.size}`);
        }
        if((props.usages & BufferUsageEnums.STORAGE) === BufferUsageEnums.STORAGE
        && props.size > 134217728) {
            //https://gpuweb.github.io/gpuweb/#dom-supported-limits-maxstoragebufferbindingsize
            throw new Error(`Tried to create buffer ${props.label} for binding but the size is too large with size ${props.size}`);
        }
        super();
        const desc: GPUBufferDescriptor = {
            label: props.label,
            mappedAtCreation: mappedAtCreation?true:false,
            size: props.size,
            usage: props.usages,
        };
        try {
            this.#buffer = props.gpu.device.createBuffer(desc);
        } catch (e) {
            engine.showError(e);
            throw (new Error('Cannot create buffer',
                {
                    cause: (e instanceof Error ? e : new Error(new String(e).toString())),
                }));
        }
        if (mappedAtCreation) {
            mappedAtCreation(this.#buffer,
                props.gpu);
            this.#buffer.unmap();
        }
    }
    copyFromTexture(this: Buffer2<COPY_DST_BUFFER>,
        commandEncoder: GPUCommandEncoder,
        from: Texture<GPUTextureFormat, COPY_SRC_TEXTURE>,
        sourceDetails: Omit<GPUImageCopyTexture, 'texture'>,
        destinationDataLayout: GPUImageDataLayout,
        copySize: GPUExtent3DStrict) {
        commandEncoder.copyTextureToBuffer(
            {
                texture: from.texture,
                ...sourceDetails,
            },
            {
                buffer: this.#buffer,
                ...destinationDataLayout,
            },
            copySize
        );
    }
    async read(
        this: Buffer2<MAP_READ_BUFFER>,
        callback: (buff: ArrayBuffer) => Promise<void> | void) {
        await this.#buffer.mapAsync(GPUMapMode.READ);
        const arrbuff = this.#buffer.getMappedRange();
        await callback(arrbuff);
        this.#buffer.unmap();
    }
    async readAndDestroy(
        this: Buffer2<MAP_READ_BUFFER>,
        callback: (buff: ArrayBuffer) => Promise<void> | void): Promise<void> {
        let arrbuff: ArrayBuffer;
        try {
            await this.#buffer.mapAsync(GPUMapMode.READ);
            arrbuff = this.#buffer.getMappedRange();
        } catch (e) {
            if(!this.props.gpu.destroyed) {
                engine.showError(e,
                    this.props.gpu);
            }
            return;
        }
        try {
            await callback(arrbuff);
        } catch(e) {
            engine.showError(e,
                this.props.gpu);
        }
        this.destroy();
    }
    copyFrom(this: Buffer2<COPY_DST_BUFFER>, commandEncoder: GPUCommandEncoder, from: GPUBuffer, sourceOffset: GPUSize64, destinationOffset: GPUSize64, copySize?: GPUSize64) {
        commandEncoder.copyBufferToBuffer(
            from, // source buffer
            sourceOffset,
            this.#buffer, //destination buffer
            destinationOffset,
            copySize ?? this.#buffer.size
        );
    }

    copyTo(this: Buffer2<COPY_SRC_BUFFER>,
        commandEncoder: GPUCommandEncoder,
        buffer: Buffer2<COPY_DST_BUFFER>,
        sourceOffset: GPUSize64,
        destinationOffset: GPUSize64,
        copySize?: GPUSize64) {

        buffer.copyFrom(commandEncoder,
            this.#buffer,
            sourceOffset,
            destinationOffset,
            copySize);
    }
    #bufferBinding(label: string, bindGroup: BindGroup, offset = 0, bindingSize?: GPUSize64) {
        const obj: GPUBufferBinding & GPUObjectBase = {
            buffer: this.#buffer,
            label: label + '_Binding_for_buffer_' + this.props.label,
            offset,
        };
        if (bindingSize) {
            obj.size = bindingSize;
        }
        this.bindGroups.add(bindGroup);
        return obj;
    }
    getStorageBinding(this: Buffer2<STORAGE_BUFFER>, bindGroup: BindGroup, offset = 0, bindingSize?: GPUSize64) {
        return this.#bufferBinding('STORAGE',
            bindGroup,
            offset,
            bindingSize);
    }
    getUniformBinding(this: Buffer2<UNIFORM_BUFFER>, bindGroup: BindGroup, offset?: GPUSize64, bindingSize?: GPUSize64) {
        return this.#bufferBinding('UNIFORM',
            bindGroup,
            offset,
            bindingSize);
    }
    getVertexBinding(this: Buffer2<VERTEX_BUFFER>, renderPass: RenderPass) {
        this.renderPasses.add(renderPass);
        return this.#buffer;
    }
    override destroy() {
        this.#buffer.destroy();
        this.renderPasses.forEach(rp =>
            rp.bundles.forEach(b =>
                b.destroy()));
        super.destroy();
    }
}

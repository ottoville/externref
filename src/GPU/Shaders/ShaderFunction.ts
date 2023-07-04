import { PipelineLayout } from '../PipelineLayout.js';
import type { BGLayout, BindGroupLayoutEntry, ShaderStage } from '../BindGroupLayout.js';
import type { VertexBufferLayout2 } from './VertexShader.js';
import type { Struct } from './structs/Structs.js';

export type VertexEntry = BindGroupLayoutEntry<ShaderStage.VERTEX | ShaderStage.COMPUTE_AND_VERTEX | ShaderStage.VERTEX_AND_FRAGMENT>;
export type FragmentEntry = BindGroupLayoutEntry<ShaderStage.FRAGMENT | ShaderStage.COMPUTE_AND_FRAGMENT | ShaderStage.VERTEX_AND_FRAGMENT>;
export type ComputeEntry = BindGroupLayoutEntry<ShaderStage.COMPUTE | ShaderStage.COMPUTE_AND_VERTEX | ShaderStage.COMPUTE_AND_FRAGMENT>;

export type FilteredBindgroupEntrys<B extends readonly BGLayout[], F extends BindGroupLayoutEntry> = Readonly<{ [K in keyof B]:  {[BE in keyof B[K]['entries']]: B[K]['entries'][BE] extends F ? B[K]['entries'][BE] : never}   }>

export class VertexShaderFunction<B extends readonly BGLayout[] = readonly BGLayout[],
    const V extends readonly VertexBufferLayout2[] | readonly [] = readonly VertexBufferLayout2[] | readonly []> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #code: (args: any, bufferArgs: any) => string;
    readonly vertexBufferLayout: V;
    buffers: GPUVertexBufferLayout[] = [];
    constructor(
        public output: Struct,
        public pipelineLayout: PipelineLayout<B>,
        vertexBufferLayout: V,
        code: (args: FilteredBindgroupEntrys<B, VertexEntry>, bufferArgs: Readonly<{ [K in keyof V]: { [KK in keyof V[K]['attributes2']]: KK } }>) => string,
        // TODO: use enums
        private inputs = ''

    ) {
        this.#code = code;
        this.vertexBufferLayout = Object.freeze(vertexBufferLayout);
        this.buffers = vertexBufferLayout.map(layout => {
            return {
                ...layout,
                attributes: Object.values(layout.attributes2),
            };
        });
    }
    createCode(bindGroups: FilteredBindgroupEntrys<B, VertexEntry>, name: string) {
        const variableNames = this.vertexBufferLayout.map(buffer => {
            const keys = Object.keys(buffer.attributes2);
            return Object.fromEntries(keys.map((o, i) =>
                [o, keys[i]!]));
        }) as { [K in keyof V]: { [KK in keyof V[K]['attributes2']]: KK; }; };

        let attributesString = '';
        const bufferVariables: string[] = [];
        this.vertexBufferLayout.forEach(buffer => {
            for (const varName in buffer.attributes2) {
                bufferVariables.push(varName);
                attributesString += `@location(${buffer.attributes2[varName]!.shaderLocation}) ${varName} : ${buffer.attributes2[varName]!.shaderFormat},\n`;
            }
        });
        const wgsl = /* wgsl */`
            @vertex
            fn ${name}(
                ${this.inputs}
                ${attributesString}
                ) -> ${this.output.name} {
                    ${this.#code(bindGroups,
        variableNames)}
                }`;
        return wgsl;
    }
}

export class FragmentShaderFunction<B extends readonly BGLayout[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #code: (args: any) => string;
    constructor(
        public output: Struct,
        public pipelineLayout: PipelineLayout<B>,
        /* TODO: use struct array from vertex shader output */
        private inputs: string,
        code: (args: FilteredBindgroupEntrys<B, FragmentEntry>) => string
    ) {
        this.#code = code;
    }
    createCode(bindGroups: FilteredBindgroupEntrys<B, FragmentEntry>, name: string) {
        const wgsl = /* wgsl */`
                @fragment
                fn ${name}(
                    ${this.inputs}
                    ) -> ${this.output.name} {
                        ${this.#code(bindGroups)}
                    }`;
        return wgsl;
    }
}
export class ComputeShaderFunction<B extends readonly BGLayout[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #code: (args: any) => string;
    constructor(
        /* TODO: use const enumns */
        private inputs: string,
        public pipelineLayout: PipelineLayout<B>,
        private readonly workgroupSize: readonly [x: number, y?:number, z?:number],
        code: (args: FilteredBindgroupEntrys<B, ComputeEntry>) => string
    ) {
        this.#code = code;
    }
    createCode(bindGroups: FilteredBindgroupEntrys<B, ComputeEntry>, name: string) {
        const wgsl = /* wgsl */`
                @compute @workgroup_size(${this.workgroupSize.join()})
                fn ${name} (
                    ${this.inputs}
                    ) {
                        ${this.#code(bindGroups)}
                    }`;
        return wgsl;
    }
}

export type ShaderFunction = VertexShaderFunction<readonly BGLayout[]> | ComputeShaderFunction<readonly BGLayout[]> | FragmentShaderFunction<readonly BGLayout[]>
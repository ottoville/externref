import { PipelineLayout } from '../PipelineLayout.js';
import type { BGLayout } from '../BindGroupLayout.js';
import type { FilterCompute } from './ComputeShader.js';
import type { FilterFragment } from './FragmentShader.js';
import type { FilterVertex, VertexBufferLayout2 } from './VertexShader.js';
import type { Struct } from './structs/Structs.js'

export class VertexShaderFunction<B extends readonly BGLayout[] = readonly BGLayout[],
    const V extends readonly VertexBufferLayout2[] | readonly [] = readonly VertexBufferLayout2[] | readonly []> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #code: (args: any, bufferArgs: any) => string;
    readonly vertexBufferLayout: V
    buffers: GPUVertexBufferLayout[] = []
    constructor(
        public output: Struct,
        public pipelineLayout: PipelineLayout<B>,
        // TODO: use enums
        private inputs: string,
        vertexBufferLayout: V,
        code: (args: Readonly<{ [K in keyof B]: FilterVertex<B[K]['entries']> }>, bufferArgs: Readonly<{ [K in keyof V]: { [KK in keyof V[K]['attributes2']]: KK } }>) => string
    ) {
        this.#code = code;
        this.vertexBufferLayout = Object.freeze(vertexBufferLayout);
        this.buffers = vertexBufferLayout.map(layout => {
            return {
                ...layout,
                attributes: Object.values(layout.attributes2)
            }
        })
    }
    createCode(bindGroups: { [K in keyof B]: FilterVertex<B[K]['entries']>; }, name: string) {
        const variableNames = this.vertexBufferLayout.map(buffer => {
            const keys = Object.keys(buffer.attributes2);
            return Object.fromEntries(keys.map((o, i) => [o, keys[i]!]))
        }) as { [K in keyof V]: { [KK in keyof V[K]['attributes2']]: KK; }; };

        let attributesString = '';
        const bufferVariables: string[] = []
        this.vertexBufferLayout.forEach(buffer => {
            for (const varName in buffer.attributes2) {
                bufferVariables.push(varName);
                attributesString += `@location(${buffer.attributes2[varName]!.shaderLocation}) ${varName} : ${buffer.attributes2[varName]!.shaderFormat},\n`
            }
        });
        const wgsl = /* wgsl */`
            @vertex
            fn ${name}(
                ${this.inputs}
                ${attributesString}
                ) -> ${this.output.name} {
                    ${this.#code(bindGroups, variableNames)}
                }`
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
        code: (args: Readonly<{ [K in keyof B]: FilterFragment<B[K]['entries']> }>) => string
    ) {
        this.#code = code;
    }
    createCode(bindGroups: { [K in keyof B]: FilterFragment<B[K]['entries']>; }, name: string) {
        const wgsl = /* wgsl */`
                @fragment
                fn ${name}(
                    ${this.inputs}
                    ) -> ${this.output.name} {
                        ${this.#code(bindGroups)}
                    }`
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
        code: (args: Readonly<{ [K in keyof B]: FilterCompute<B[K]['entries']> }>) => string
    ) {
        this.#code = code;
    }
    createCode(bindGroups: { [K in keyof B]: FilterCompute<B[K]['entries']>; }, name: string) {
        const wgsl = /* wgsl */`
                fn ${name}(
                    ${this.inputs}
                    ) {
                        ${this.#code(bindGroups)}
                    }`
        return wgsl;
    }
}

export type ShaderFunction = VertexShaderFunction<readonly BGLayout[]> | ComputeShaderFunction<readonly BGLayout[]> | FragmentShaderFunction<readonly BGLayout[]>
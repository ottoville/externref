import { PipelineLayout } from '../PipelineLayout.js';
import type {
  ShaderStage,
  VertexShaderFunction,
  BindGroupLayoutEntry,
  BGLayout,
  FragmentShaderFunction,
} from '../../webgpu-ts/index.js';

export type VertexEntry = BindGroupLayoutEntry<
  | ShaderStage.VERTEX
  | ShaderStage.COMPUTE_AND_VERTEX
  | ShaderStage.VERTEX_AND_FRAGMENT
>;
export type FragmentEntry = BindGroupLayoutEntry<
  | ShaderStage.FRAGMENT
  | ShaderStage.COMPUTE_AND_FRAGMENT
  | ShaderStage.VERTEX_AND_FRAGMENT
>;
export type ComputeEntry = BindGroupLayoutEntry<
  | ShaderStage.COMPUTE
  | ShaderStage.COMPUTE_AND_VERTEX
  | ShaderStage.COMPUTE_AND_FRAGMENT
>;

export type FilteredBindgroupEntrys<
  B extends readonly BGLayout[],
  F extends BindGroupLayoutEntry,
> = Readonly<{
  [K in keyof B]: {
    [BE in keyof B[K]['entries']]: B[K]['entries'][BE] extends F
      ? B[K]['entries'][BE]
      : never;
  };
}>;
export class ComputeShaderFunction<B extends readonly BGLayout[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #code: (args: any) => string;
  constructor(
    /* TODO: use const enumns */
    private inputs: string,
    public pipelineLayout: PipelineLayout<B>,
    private readonly workgroupSize: readonly [
      x: number,
      y?: number,
      z?: number,
    ],
    code: (args: FilteredBindgroupEntrys<B, ComputeEntry>) => string,
  ) {
    this.#code = code;
  }
  createCode(
    bindGroups: FilteredBindgroupEntrys<B, ComputeEntry>,
    name: string,
  ) {
    const wgsl = /* wgsl */ `
                @compute @workgroup_size(${this.workgroupSize.join()})
                fn ${name} (
                    ${this.inputs}
                    ) {
                        ${this.#code(bindGroups)}
                    }`;
    return wgsl;
  }
}

export type ShaderFunction =
  | VertexShaderFunction
  | ComputeShaderFunction<readonly BGLayout[]>
  | FragmentShaderFunction;

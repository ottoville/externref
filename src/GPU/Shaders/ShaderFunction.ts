import type {
  ShaderStage,
  BindGroupLayoutEntry,
  BGLayout,
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

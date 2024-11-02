import {
  BGLayout,
  BindGroup,
  BufLayout,
  ShaderStage,
  Buffer,
  BufferUsageEnums,
  FragmentShaderFunction,
  FragmentShaderBuilder,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import {
  IntArray,
  PlaneArray,
  colorPositionOutput,
  diffuseOutput,
} from './structs/Structs.js';
import { createSimpleVertShader } from './SingleColoredWithNormal.vert.js';
import { createSimpleFragShader } from './Simple.frag.js';
import { createVertexColorShader } from './VertexColoredWithNormal.vert.js';
import { createGroundFragShader } from './Ground.frag.js';
export const TerrainSubdivisions = [64, 64] as const;
export const gpu_memory_index_size = 256;

export const colorFragmentFunction = new FragmentShaderFunction(
  diffuseOutput,
  (_, { color }) => /* wgsl */ `
      var output:Output;
      output.Diffuse = vec4<f32>(${color},1.0);
      return output;`,
  colorPositionOutput,
);

export function createShaderBuilders(gpu: GPU) {
  const facet12ArrGPUBuffer = new Buffer({
    gpu: gpu.device,
    label: 'facet12ArrGPUBuffer',
    size:
      Float32Array.BYTES_PER_ELEMENT *
      TerrainSubdivisions[0] *
      TerrainSubdivisions[1] *
      4 *
      2,
    usages: BufferUsageEnums['STORAGE|COPY_SRC|COPY_DST'],
  });
  const slopeArrGPUBuffer = new Buffer({
    gpu: gpu.device,
    label: 'slopeArrGPUBuffer',
    size:
      Int32Array.BYTES_PER_ELEMENT *
      TerrainSubdivisions[0] *
      TerrainSubdivisions[1],
    usages: BufferUsageEnums.STORAGE,
  });
  const heightsLayout = new BGLayout(gpu.device, 'terrainBindGroupLayout', {
    facet12: new BufLayout(
      {
        buffer: {
          minBindingSize: 32,
          type: 'read-only-storage',
        },
        visibility: ShaderStage.VERTEX,
      },
      PlaneArray,
    ),
    slopes: new BufLayout(
      {
        buffer: {
          minBindingSize: 32,
          type: 'read-only-storage',
        },
        visibility: ShaderStage.VERTEX,
      },
      IntArray,
    ),
  });
  const terrainHeightsbindGroupTreePosition =
    gpu.pipelineLayouts.rootCameralayout.appendBinds(
      'TerrainHeightsbindGroupTreePosition',
      [
        {
          bindGroup: new BindGroup(
            heightsLayout,
            'TerrainHeightsbindGroupTree',
            (bindGroup) => ({
              facet12: facet12ArrGPUBuffer.getStorageBinding(bindGroup),
              slopes: slopeArrGPUBuffer.getStorageBinding(bindGroup),
            }),
          ),
        },
        gpu.pipelineLayouts.BindGroupLayoutPosition,
      ],
    );

  const ColorShader = new FragmentShaderBuilder(
    [
      terrainHeightsbindGroupTreePosition,
      gpu.pipelineLayouts.rootCameralayout,
      gpu.pipelineLayouts.positionAndTimeBindGroup,
    ],
    'color.frag',
  ).addFunction('main', colorFragmentFunction);
  const simpleFragShader = createSimpleFragShader(
    gpu.pipelineLayouts.positionAndTimeBindGroup,
  );
  const vertexColorShader = createVertexColorShader(gpu);

  const groundFragShader = createGroundFragShader(gpu);
  return {
    /**
     Non pickable single color shader where color is set from vertice
     See Simple.frag.ts for pickable counterpart
     See SingleColor.frag.ts for pickable shared single color for all vertices
     */
    ColorShader,
    facet12ArrGPUBuffer,
    groundFragShader,
    simpleFragShader,
    simpleVertShader: createSimpleVertShader(gpu),
    slopeArrGPUBuffer,
    terrainHeightsbindGroupTreePosition,
    vertexColorShader,
  } as const;
}

import {
  BGLayout,
  BindGroup,
  BufLayout,
  ShaderStage,
  Buffer,
  BufferUsageEnums,
  RenderPipelineLayout,
  ShaderBuilder,
  FragmentShaderFunction,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import {
  Clusters,
  IntArray,
  MeshArray,
  MeshUniforms,
  PlaneArray,
  ProjectionStruct,
  Scene,
  ScreenDimensions,
  Time,
  colorPositionOutput,
  diffuseOutput,
} from './structs/Structs.js';
import { PROJECTION_BUFFER_SIZE } from '../../GPU/Projection.js';
export const TerrainSubdivisions = [64, 64] as const;
export const gpu_memory_index_size = 256;
// eslint-disable-next-line import/no-unused-modules
export function createShaderBuilders(gpu: GPU) {
  const BindGroupLayoutPosition = new BGLayout(
    gpu.device,
    'BindGroupLayoutPosition',
    {
      world: new BufLayout(
        {
          buffer: {
            hasDynamicOffset: true,
            minBindingSize: gpu_memory_index_size,
            type: 'uniform',
          },
          visibility: ShaderStage.VERTEX_AND_FRAGMENT,
        },
        MeshUniforms,
      ),
    },
  );
  const uniformBindGroupLayoutWithTime = new BGLayout(
    gpu.device,
    'uniformBindGroupLayoutWithTime',
    {
      clusters_array: new BufLayout(
        {
          //clusters
          buffer: {
            minBindingSize: 7962624, //Must be in sync with Struct Clusters in shader
            type: 'read-only-storage',
          },
          visibility: ShaderStage.FRAGMENT,
        },
        Clusters,
      ),
      meshes: new BufLayout(
        {
          // mesh array for lights
          buffer: {
            minBindingSize: 512,
            type: 'read-only-storage',
          },
          visibility: ShaderStage.FRAGMENT,
        },
        MeshArray,
      ),
      projection: new BufLayout(
        {
          //projection
          buffer: {
            minBindingSize: PROJECTION_BUFFER_SIZE,
            type: 'uniform',
          },
          visibility: ShaderStage.FRAGMENT,
        },
        ProjectionStruct,
      ),
      scene: new BufLayout(
        {
          buffer: {
            minBindingSize: 144,
            type: 'uniform',
          },
          visibility: ShaderStage.VERTEX_AND_FRAGMENT,
        },
        Scene,
      ),
      time: new BufLayout(
        {
          buffer: {
            minBindingSize: 8,
            type: 'uniform',
          },
          visibility: ShaderStage.VERTEX,
        },
        Time,
      ),
    },
  );
  const sizeBindGroupLayout = new BGLayout(gpu.device, 'sizeBindGroupLayout', {
    screen_dimensions: new BufLayout(
      {
        buffer: {
          minBindingSize: 16,
          type: 'uniform',
        },
        visibility: ShaderStage.COMPUTE_AND_FRAGMENT,
      },
      ScreenDimensions,
    ),
  });
  const rootCameralayout = new RenderPipelineLayout({
    bindGroupLayouts: [sizeBindGroupLayout, uniformBindGroupLayoutWithTime] as [
      typeof sizeBindGroupLayout,
      typeof uniformBindGroupLayoutWithTime,
    ],
    label: 'rootCamera',
  });
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
  const terrainHeightsbindGroupTreePosition = rootCameralayout.appendBinds(
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
      BindGroupLayoutPosition,
    ],
  );
  const positionAndTimeBindGroup = rootCameralayout.appendBinds(
    'positionBindGroupTimeWGSLLayot',
    [BindGroupLayoutPosition],
  );
  return {
    BindGroupLayoutPosition,
    /**
     Non pickable single color shader where color is set from vertice
     See Simple.frag.ts for pickable counterpart
     See SingleColor.frag.ts for pickable shared single color for all vertices
     */
    ColorShader: new ShaderBuilder([
      terrainHeightsbindGroupTreePosition,
      rootCameralayout,
      positionAndTimeBindGroup,
    ] as const)
      .addFunction(
        'main',
        new FragmentShaderFunction(
          diffuseOutput,
          () => /* wgsl */ `
              var output:Output;
              output.Diffuse = vec4<f32>(color,1.0);
              return output;`,
          colorPositionOutput,
        ),
      )
      .build('color.frag'),
    facet12ArrGPUBuffer,
    heightsLayout,
    positionAndTimeBindGroup,
    rootCameralayout,
    sizeBindGroupLayout,
    slopeArrGPUBuffer,
    terrainHeightsbindGroupTreePosition,
    uniformBindGroupLayoutWithTime,
  } as const;
}

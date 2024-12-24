import {
  BGLayout,
  BufLayout,
  RenderPipelineLayout,
  SampLayout,
  ShaderStage,
  TextLayout,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import {
  Clusters,
  float2f32,
  Lights,
  ProjectionStruct,
  Scene,
  ScreenDimensions,
  Time,
  ViewUniforms,
} from './structs/Structs.js';
import { gpu_memory_index_size } from './ShaderBuilders.js';
import { PROJECTION_BUFFER_SIZE } from './Clusters.comp.js';

const UpdateClustersBufferLayout = new BufLayout(
  {
    buffer: {
      hasDynamicOffset: false,
      minBindingSize: 7962624,
      type: 'storage',
    },
    visibility: ShaderStage.COMPUTE,
  },
  Clusters,
);
export function createPipelineLayouts(gpu: GPU) {
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
        gpu.meshUniforms.asArray,
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
    bindGroupLayouts: [
      sizeBindGroupLayout,
      uniformBindGroupLayoutWithTime,
    ] as const,
    label: 'rootCamera',
  });
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
        gpu.meshUniforms,
      ),
    },
  );
  const positionAndTimeBindGroup = rootCameralayout.appendBinds(
    'positionBindGroupTimeWGSLLayot',
    [BindGroupLayoutPosition],
  );
  const lightsTextureBindGroup = positionAndTimeBindGroup.appendBinds(
    'lightsBindGroupTexture2Layout2',
    [
      new BGLayout(gpu.device, 'lightsBindGroupTexture2', {
        diffuseTexture: new TextLayout(
          {
            texture: {},
            visibility: ShaderStage.FRAGMENT,
          },
          'texture_2d<f32>',
        ),
        mySampler: new SampLayout(
          {
            sampler: {},
            visibility: ShaderStage.FRAGMENT,
          },
          'sampler',
        ),
      }),
    ],
  );
  const waterTextureLayot = new BGLayout(
    gpu.device,
    'lightsBindGroupTexture2water',
    {
      diffuseTexture: new TextLayout(
        {
          texture: {},
          visibility: ShaderStage.FRAGMENT,
        },
        'texture_2d<f32>',
      ),
      mySampler: new SampLayout(
        {
          sampler: {},
          visibility: ShaderStage.FRAGMENT,
        },
        'sampler',
      ),
    },
  );
  const BindGroupLayoutCanvas = new BGLayout(gpu.device, 'BindGroupLayoutUI', {
    texture: new TextLayout(
      {
        texture: {},
        visibility: ShaderStage.FRAGMENT,
      },
      'texture_2d<f32>',
    ),
    uniforms: new BufLayout(
      {
        buffer: {
          minBindingSize: 8,
          type: 'uniform',
        },
        visibility: ShaderStage.VERTEX,
      },
      float2f32,
    ),
  });
  const canvasRootLayout = new RenderPipelineLayout({
    bindGroupLayouts: [BindGroupLayoutCanvas],
    label: 'canvasRootLayout',
  });
  const clustersLayout = new BGLayout(gpu.device, 'CreateClustersLayout2', {
    clusters: UpdateClustersBufferLayout,
    screentoview: new BufLayout(
      {
        buffer: {
          hasDynamicOffset: false,
          minBindingSize: PROJECTION_BUFFER_SIZE,
          type: 'uniform',
        },
        visibility: ShaderStage.COMPUTE,
      },
      ProjectionStruct,
    ),
  });
  const updateClustersLayout = new BGLayout(
    gpu.device,
    'UpdateClustersLayout',
    {
      clusters: UpdateClustersBufferLayout,
      viewUniforms: new BufLayout(
        {
          buffer: {
            hasDynamicOffset: false,
            minBindingSize: 144,
            type: 'uniform',
          },
          visibility: ShaderStage.COMPUTE,
        },
        ViewUniforms,
      ),
    },
  );
  const updateViewLayout = new BGLayout(gpu.device, 'UpdateViewLayout', {
    directional_lights: new BufLayout(
      {
        buffer: {
          hasDynamicOffset: false,
          minBindingSize: 16,
          type: 'read-only-storage',
        },
        visibility: ShaderStage.COMPUTE,
      },
      Lights,
    ),
    meshes: new BufLayout(
      {
        buffer: {
          hasDynamicOffset: false,
          minBindingSize: 512,
          type: 'read-only-storage',
        },
        visibility: ShaderStage.COMPUTE,
      },
      gpu.meshUniforms.asArray,
    ),
    point_lights: new BufLayout(
      {
        buffer: {
          hasDynamicOffset: false,
          minBindingSize: 16,
          type: 'read-only-storage',
        },
        visibility: ShaderStage.COMPUTE,
      },
      Lights,
    ),
  });
  return {
    BindGroupLayoutCanvas,
    BindGroupLayoutPosition,
    canvasRootLayout,
    clustersLayout,
    lightsTextureBindGroup,
    positionAndTimeBindGroup,
    rootCameralayout,
    sizeBindGroupLayout,
    uniformBindGroupLayoutWithTime,
    updateClustersLayout,
    updateViewLayout,
    waterTextureLayot,
  };
}

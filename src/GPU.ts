import { RenderPass } from './GPU/RenderPasses/RenderPass.js';
import { PickableRenderPass } from './GPU/RenderPasses/PickableRenderPass.js';

import { Projection, PROJECTION_BUFFER_SIZE } from './GPU/Projection.js';
import { BindGroup } from './GPU/BindGroup.js';
import {
  BindStorageBuffer,
  BindUniformBuffer,
  Buffer,
  CopyDstBuffer,
  CopySrcBuffer,
  GPUBufferUsage,
} from './GPU/Buffer/Buffer.js';

import type { Engine } from './engine.js';
import { Uint16Vector2 } from './Math.js';
import { DepthRenderTarget } from './GPU/RenderTargets/DepthRenderTarget.js';
import { DepthRenderPass } from './GPU/RenderPasses/DepthRenderPass.js';
import { TerraCamera } from './TerraCamera.js';
import {
  createUpdateViewShader,
  UpdateView,
} from './GPU/Shaders/UpdateView.comp.js';
import { createClustersCompShader } from './GPU/Shaders/Clusters.comp.js';
import { RenderPipelineLayout } from './GPU/PipelineLayout.js';
import { RenderPipeline } from './GPU/RenderPipeline.js';
import {
  Clusters,
  MeshArray,
  MeshUniforms,
  Scene,
  Time,
  UIUniforms,
  ScreenDimensions,
  ProjectionStruct,
  diffuseOutput,
  colorPositionOutput,
} from './GPU/Shaders/structs/Structs.js';
import {
  createUIVertShader,
  position_uv_attrs,
  UIVertShader,
} from './GPU/Shaders/UI.vert.js';
import { createUIFragmentShader, UIFragShader } from './GPU/Shaders/UI.frag.js';
import { MainNode } from './MainNode.js';
import {
  BGLayout,
  BufLayout,
  type RENDER_TARGET_FORMAT,
  SampLayout,
  ShaderStage,
  TextLayout,
  TextureUsageEnums,
  type VertexShader,
  FragmentShader,
  FragmentShaderFunction,
  ColorRenderTarget,
  MSAARenderTarget,
} from './webgpu-ts/index.js';
import {
  createSimpleFragShader,
  SimpleFragShader,
} from './GPU/Shaders/Simple.frag.js';
import {
  createUIFragmentShaderArray,
  UIFragShaderArray,
} from './GPU/Shaders/UI_array.frag.js';
declare const engine: Engine;

let curSecond = 0;
let framecount = 0;

// Cluster debug
/*

let debugNumber=0;
//@ts-ignore
window.resetDebugNumber = () => {
    debugNumber = 0;
}
*/

export type CreateRenderPipelineProps = {
  gpu: GPU;
  label: string;
  primitive: GPUPrimitiveState;
};

export type CreateRenderPipelineCB<
  R extends RenderPipeline,
  VP extends { stride: number } = { stride: number },
> = readonly [
  label: string,
  create: (props: CreateRenderPipelineProps, vertexBufferProps: VP) => R,
];

export class GPU {
  #maxInstances = 10;

  readonly mousePositionBuffer = new SharedArrayBuffer(4);
  readonly mousePosition = new Uint16Vector2(this.mousePositionBuffer);

  static readonly gpu_memory_index_size = 256;
  readonly gpu_screen_buffer_size = 16; //screen width and height and ratio
  readonly #gpu_max_point_lights = 63;

  readonly #DynamicBindGroups: WeakSet<BindGroup> = new WeakSet();

  readonly pendingCommandBuffers: GPUCommandBuffer[] = [];
  readonly tempGPUBuffers: GPUBuffer[] = [];

  readonly rootCameralayout: RenderPipelineLayout<
    readonly [
      typeof this.sizeBindGroupLayout,
      typeof this.uniformBindGroupLayoutWithTime,
    ]
  >;

  readonly projections: Set<Projection> = new Set();
  readonly cameras: TerraCamera[] = [];

  //Todo: Remove COPY_SRC
  readonly GPUMeshes: CopySrcBuffer &
    CopyDstBuffer &
    BindStorageBuffer &
    BindUniformBuffer;
  readonly #GPUPointLights: CopyDstBuffer &
    BindStorageBuffer &
    BindUniformBuffer;
  readonly #GPUDirectionalLights: CopyDstBuffer & BindStorageBuffer;
  readonly positionAndTimeBindGroup: RenderPipelineLayout<
    readonly [
      typeof this.sizeBindGroupLayout,
      typeof this.uniformBindGroupLayoutWithTime,
      BGLayout<{
        world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>;
      }>,
    ]
  >;
  readonly lightsTextureBindGroup: RenderPipelineLayout<
    [
      typeof this.sizeBindGroupLayout,
      typeof this.uniformBindGroupLayoutWithTime,
      BGLayout<{
        world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>;
      }>,
      BGLayout<{
        mySampler: SampLayout<ShaderStage.FRAGMENT, 'sampler'>;
        diffuseTexture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
      }>,
    ]
  >;

  readonly BindGroupPosition: BindGroup;
  readonly timeBuffer: CopyDstBuffer & BindUniformBuffer;

  readonly #renderPasses: RenderPass[];

  readonly scale = {
    x: 1,
    y: 1,
  };
  readonly renderPassScreen: PickableRenderPass<{
    gRenderTargetDiffuse: MSAARenderTarget<
      'bgra8unorm',
      (typeof TextureUsageEnums)['RENDER_ATTACHMENT|TEXTURE_BINDING']
    >;
  }>;

  readonly renderPassWater: DepthRenderPass<{
    diffuse: ColorRenderTarget<
      'bgra8unorm',
      (typeof TextureUsageEnums)['RENDER_ATTACHMENT|TEXTURE_BINDING']
    >;
  }>;
  readonly renderPassCanvas: RenderPass<{
    swap: ColorRenderTarget<
      RENDER_TARGET_FORMAT,
      (typeof TextureUsageEnums)['RENDER_ATTACHMENT']
    >;
  }>;

  readonly #updateViewBindGroup: BindGroup;
  readonly clustersInRow: [number, number, number] = [32, 18, 48];

  readonly clusterSizeinBytes: number;

  readonly #CLUSTER_WORKGROUP_SIZE: [number, number, number] = [4, 2, 4];
  readonly CLUSTER_DISPATCH_SIZE: [number, number, number] =
    this.clustersInRow.map((v, i) =>
      Math.ceil(v / this.#CLUSTER_WORKGROUP_SIZE[i]!),
    ) as [number, number, number];

  readonly uniformBindGroupLayoutWithTime: BGLayout<{
    scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
    time: BufLayout<ShaderStage.VERTEX, typeof Time>;
    clusters_array: BufLayout<ShaderStage.FRAGMENT, typeof Clusters>;
    meshes: BufLayout<ShaderStage.FRAGMENT, typeof MeshArray>;
    projection: BufLayout<ShaderStage.FRAGMENT, typeof ProjectionStruct>;
  }>;

  readonly #presentationFormat = navigator.gpu.getPreferredCanvasFormat() as
    | 'rgba8unorm'
    | 'bgra8unorm';
  readonly pickRenderPass: RenderPass<{
    gRenderTargetId: ColorRenderTarget<
      'r32uint',
      (typeof TextureUsageEnums)['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC']
    >;
  }>;
  readonly sizeBindGroupLayout: BGLayout<{
    screen_dimensions: BufLayout<number, typeof ScreenDimensions>;
  }>;

  static readonly #renderPipelines: Map<string, RenderPipeline> = new Map();
  readonly bindGroupTextureWater: RenderPipelineLayout<
    [
      typeof this.sizeBindGroupLayout,
      typeof this.uniformBindGroupLayoutWithTime,
      BGLayout<{
        world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>;
      }>,
      BGLayout<{
        diffuseTexture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
        mySampler: SampLayout<ShaderStage.FRAGMENT, 'sampler'>;
      }>,
    ],
    BGLayout<{
      diffuseTexture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
      mySampler: SampLayout<ShaderStage.FRAGMENT, 'sampler'>;
    }>
  >;

  readonly #ro: ResizeObserver;
  readonly canvasRootLayout: RenderPipelineLayout<
    [typeof this.BindGroupLayoutCanvas]
  >;
  readonly canvasRootLayoutArray: RenderPipelineLayout<
    [typeof this.BindGroupLayoutCanvasArray]
  >;
  readonly UIPipeline: RenderPipeline<
    UIVertShader,
    UIFragShader,
    (typeof this)['canvasRootLayout']
  >;
  readonly UIPipelineArray: RenderPipeline<
    UIVertShader,
    UIFragShaderArray,
    (typeof this)['canvasRootLayoutArray']
  >;

  readonly updateViewShader: UpdateView;
  readonly BindGroupLayoutCanvas: BGLayout<{
    uniforms: BufLayout<ShaderStage.VERTEX, typeof UIUniforms>;
    texture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
  }>;
  readonly BindGroupLayoutCanvasArray: BGLayout<{
    uniforms: BufLayout<ShaderStage.VERTEX, typeof UIUniforms>;
    texture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d_array<f32>'>;
  }>;
  colorFragShader: FragmentShader<{
    main: FragmentShaderFunction;
  }>;
  destroyed = false;
  fps = 0;
  simpleFragShader: SimpleFragShader;
  createRenderPipeline<
    D extends CreateRenderPipelineCB<RenderPipeline<V>>,
    V extends VertexShader,
  >(
    desc: D,
    primitive: GPUPrimitiveState & {
      topology: 'triangle-strip' | 'line-strip';
      stripIndexFormat: GPUIndexFormat;
    },
    vertexBufferProps: Parameters<D['1']>['1'],
  ): ReturnType<D['1']>;
  createRenderPipeline<
    D extends CreateRenderPipelineCB<RenderPipeline<V>>,
    V extends VertexShader,
  >(
    desc: D,
    primitive: Omit<GPUPrimitiveState, 'stripIndexFormat'> & {
      topology: 'triangle-list' | 'line-list';
    },
    vertexBufferProps: Parameters<D['1']>['1'],
  ): ReturnType<D['1']>;
  createRenderPipeline<
    D extends CreateRenderPipelineCB<RenderPipeline<V>>,
    V extends VertexShader,
  >(
    desc: D,
    primitive: Omit<GPUPrimitiveState, 'topology'>,
    vertexBufferProps: Parameters<D['1']>['1'],
  ): ReturnType<D['1']>;
  createRenderPipeline<
    D extends CreateRenderPipelineCB<RenderPipeline<V>>,
    V extends VertexShader,
  >(
    desc: D,
    primitive: GPUPrimitiveState = {},
    vertexBufferProps: Parameters<D['1']>['1'],
  ): ReturnType<D['1']> {
    const primitiveWithDefaults: GPUPrimitiveState = {
      cullMode: 'back',
      frontFace: 'cw',
      topology: 'triangle-list',
      ...primitive,
    };
    const [label, createRenderPipeline] = desc;
    const hash =
      label +
      [
        ...Object.values(primitiveWithDefaults),
        ...Object.values(vertexBufferProps ?? {}),
      ]
        .sort()
        .join();
    let renderPipeline = GPU.#renderPipelines.get(hash);
    if (!renderPipeline) {
      renderPipeline = createRenderPipeline(
        {
          gpu: this,
          label: hash,
          primitive: primitiveWithDefaults,
        },
        vertexBufferProps,
      );
      GPU.#renderPipelines.set(hash, renderPipeline);
    }
    return renderPipeline as ReturnType<D['1']>;
  }
  #GPUQueueCommandEncoder: GPUCommandEncoder | null = null;
  #renderFrame = 0;
  /**
   * Manually destroy the device.
   * Needed to mark device as destroyed before device.lost will resolve
   * so errors from mapAsync etc. can be handled gracefully.
   */
  destroy() {
    this.destroyed = true;
    this.device.destroy();
  }
  /**
   * Called from device.lost callback when device is lost
   */
  onDeviceLost() {
    console.log('destroy GPU', this.device.label);
    this.#ro.disconnect();
    cancelAnimationFrame(this.#renderFrame);
    this.destroyed = true;
  }
  constructor(
    public canvas: HTMLCanvasElement,
    public device: GPUDevice,
    private GPUDataSizeBytes: number,
  ) {
    const totalClusters =
      this.clustersInRow[0] * this.clustersInRow[1] * this.clustersInRow[2];
    this.clusterSizeinBytes =
      totalClusters * (8 + 64) * Uint32Array.BYTES_PER_ELEMENT;
    this.updateViewShader = createUpdateViewShader(this);

    this.GPUMeshes = Buffer.create(
      this,
      GPU.gpu_memory_index_size * this.#maxInstances,
      [
        GPUBufferUsage.UNIFORM,
        GPUBufferUsage.COPY_DST,
        GPUBufferUsage.STORAGE,
        GPUBufferUsage.COPY_SRC,
      ],
      'GPUMeshes',
    );
    this.#GPUPointLights = Buffer.create(
      this,
      this.#gpu_max_point_lights * 4,
      [GPUBufferUsage.UNIFORM, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST],
      'GPUPointLights',
    );
    this.#GPUDirectionalLights = Buffer.create(
      this,
      63 * 4,
      [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST],
      'GPUDirectionalLights',
    );

    this.#updateViewBindGroup = new BindGroup(
      this.updateViewShader[0][0],
      'updateViewBindGroup',
      (bindGroup) => ({
        directional_lights:
          this.#GPUDirectionalLights.getStorageBinding(bindGroup),
        meshes: this.GPUMeshes.getStorageBinding(bindGroup),
        point_lights: this.#GPUPointLights.getStorageBinding(bindGroup),
      }),
    );
    this.uniformBindGroupLayoutWithTime = new BGLayout(
      this.device,
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
    this.sizeBindGroupLayout = new BGLayout(
      this.device,
      'sizeBindGroupLayout',
      {
        screen_dimensions: new BufLayout(
          {
            buffer: {
              minBindingSize: 16,
              type: 'uniform',
            },
            visibility: ShaderStage.FRAGMENT | ShaderStage.COMPUTE,
          },
          ScreenDimensions,
        ),
      },
    );
    this.rootCameralayout = new RenderPipelineLayout({
      bindGroupLayouts: [
        this.sizeBindGroupLayout,
        this.uniformBindGroupLayoutWithTime,
      ] as [
        typeof this.sizeBindGroupLayout,
        typeof this.uniformBindGroupLayoutWithTime,
      ],
      label: 'rootCamera',
    });
    const BindGroupLayoutPosition = new BGLayout(
      this.device,
      'BindGroupLayoutPosition',
      {
        world: new BufLayout(
          {
            buffer: {
              hasDynamicOffset: true,
              minBindingSize: GPU.gpu_memory_index_size,
              type: 'uniform',
            },
            visibility: ShaderStage.VERTEX_AND_FRAGMENT,
          },
          MeshUniforms,
        ),
      },
    );
    this.BindGroupPosition = new BindGroup(
      BindGroupLayoutPosition,
      'BindGroupPosition',
      (bindGroup) => ({
        world: this.GPUMeshes.getUniformBinding(
          bindGroup,
          0,
          GPU.gpu_memory_index_size,
        ),
      }),
    );
    this.positionAndTimeBindGroup = this.rootCameralayout.createAppendedLayout(
      'positionBindGroupTimeWGSLLayot',
      BindGroupLayoutPosition,
    );
    this.simpleFragShader = createSimpleFragShader(
      this.positionAndTimeBindGroup,
    );

    this.lightsTextureBindGroup =
      this.positionAndTimeBindGroup.createAppendedLayout(
        'lightsBindGroupTexture2Layout',
        new BGLayout(this.device, 'lightsBindGroupTexture2', {
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
      );
    this.bindGroupTextureWater =
      this.positionAndTimeBindGroup.createSharedLayout(
        'lightsBindGroupTexture2PipelineLayout',
        new BGLayout(this.device, 'lightsBindGroupTexture2water', {
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
      );

    this.pickRenderPass = new RenderPass({
      colorRenderTargets: {
        gRenderTargetId: new ColorRenderTarget(
          {
            format: 'r32uint',
            gpu: this.device,
            label: 'idTexture',
            size: {
              height: 300,
              width: 300,
            },
            usages:
              TextureUsageEnums['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC'],
          },
          {
            context: undefined,
            textureViewDescriptor: {
              arrayLayerCount: 1,
              baseArrayLayer: 0,
            },
            writeMask: 0xf,
          },
          {
            blend: undefined,
            // prettier-ignore
            clearValue: {
              // eslint-disable-next-line sort-keys
              r: 0.0, g: 1.0, b: 0.0, a: 1.0,
            },
          },
        ),
      },
      entryPoint: 'pick',
      getSizeOnResize: (w, h) => {
        return [w, h];
      },
      gpu: this,
      label: 'pickRenderPass',
      rootLayouts: [this.rootCameralayout],
      sampleCount: 1,
      size: {
        height: canvas.height,
        width: canvas.width,
      },
    });

    this.renderPassScreen = new PickableRenderPass(
      {
        colorRenderTargets: {
          gRenderTargetDiffuse: new MSAARenderTarget(
            {
              format: 'bgra8unorm',
              gpu: this.device,
              label: 'diffuseTexture',
              size: {
                height: 300,
                width: 300,
              },
              usages: TextureUsageEnums['RENDER_ATTACHMENT|TEXTURE_BINDING'],
            },
            {
              context: undefined,
              writeMask: 0xf,
            },
            {
              blend: undefined,
              // prettier-ignore
              clearValue: {
                // eslint-disable-next-line sort-keys
                r: 0.53, g: 0.8, b: 0.92, a: 0.0,
              },
            },
          ),
        },
        entryPoint: 'main',
        getSizeOnResize: (w, h) => {
          return [w, h];
        },
        gpu: this,
        label: 'renderPassScreen',
        rootLayouts: [this.rootCameralayout],
        sampleCount: 4,
        size: {
          height: canvas.height,
          width: canvas.width,
        },
      },
      new DepthRenderTarget(
        0,
        {
          format: 'depth32float',
          gpu: this.device,
          initialSampleCount: 4,
          label: 'depthTexture_renderPassScreen',
          size: {
            height: 300,
            width: 300,
          },
          usages:
            TextureUsageEnums['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC'],
        },
        {
          context: undefined,
          writeMask: 0xf,
        },
      ),
    );
    this.renderPassWater = new DepthRenderPass(
      {
        colorRenderTargets: {
          diffuse: new ColorRenderTarget(
            {
              format: 'bgra8unorm',
              gpu: this.device,
              label: 'diffuseTextureWater',
              size: {
                height: 300,
                width: 300,
              },
              usages: TextureUsageEnums['RENDER_ATTACHMENT|TEXTURE_BINDING'],
            },
            {
              context: undefined,
              writeMask: 0xf,
            },
            {
              blend: undefined,
              // prettier-ignore
              clearValue: {
                // eslint-disable-next-line sort-keys
                r: 0.023, g: 0.25, b: 0.45, a: 1.0,
              },
            },
          ),
        },
        entryPoint: 'main',
        getSizeOnResize: (w, h) => [w >> 2, h >> 2],
        gpu: this,
        label: 'renderPassWater',
        rootLayouts: [this.rootCameralayout],
        sampleCount: 1,
        size: {
          height: canvas.height,
          width: canvas.width,
        },
      },
      new DepthRenderTarget(
        0,
        {
          format: 'depth32float',
          gpu: this.device,
          initialSampleCount: 1,
          label: 'depthTexture_renderPassWater',
          size: {
            height: 300,
            width: 300,
          },
          usages: TextureUsageEnums['RENDER_ATTACHMENT|COPY_SRC'],
        },
        {
          context: undefined,
          writeMask: 0xf,
        },
      ),
    );

    //TODO: this does not need to be canvas size
    /*const renderPassShadows = new DepthRenderPass(this, {}, 4, [canvas.width,canvas.height,1],
            (w, h) => [w, h],'shadows',this.rootCameralayout,'renderPassShadows');
    */

    const context: GPUCanvasContext | null = canvas.getContext(
      'webgpu',
    ) as unknown as GPUCanvasContext; // unknown for jest
    if (!context) throw new Error('Unable to get webgpu context');

    context.configure({
      device: device,
      format: this.#presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.BindGroupLayoutCanvas = new BGLayout(
      this.device,
      'BindGroupLayoutUI',
      {
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
          UIUniforms,
        ),
      },
    );
    this.BindGroupLayoutCanvasArray = new BGLayout(
      this.device,
      'BindGroupLayoutUIArray',
      {
        texture: new TextLayout(
          {
            texture: {},
            visibility: ShaderStage.FRAGMENT,
          },
          'texture_2d_array<f32>',
        ),
        uniforms: new BufLayout(
          {
            buffer: {
              minBindingSize: 8,
              type: 'uniform',
            },
            visibility: ShaderStage.VERTEX,
          },
          UIUniforms,
        ),
      },
    );
    this.canvasRootLayout = new RenderPipelineLayout({
      bindGroupLayouts: [this.BindGroupLayoutCanvas],
      label: 'canvasRootLayout',
    });
    this.canvasRootLayoutArray = new RenderPipelineLayout({
      bindGroupLayouts: [this.BindGroupLayoutCanvasArray],
      label: 'canvasRootLayoutArray',
    });
    const vertexShader = createUIVertShader(this.canvasRootLayout, {
      arrayStride: 4 * 4,
      attributes2: position_uv_attrs,
      stepMode: 'vertex',
    });
    const UIfragmentShader = createUIFragmentShader(this);
    const UIfragmentShaderArray = createUIFragmentShaderArray(this);
    this.UIPipeline = new RenderPipeline(
      {
        bindgroupdrawable: this.canvasRootLayout,
        connections: {
          main: 'main',
        },
        descriptor: {
          primitive: {
            frontFace: 'ccw',
            topology: 'triangle-list',
          },
        },
        fragmentShader: UIfragmentShader,
        label: 'UIRenderPipeline',
        vertexShader,
      },
      undefined,
    );
    this.UIPipelineArray = new RenderPipeline(
      {
        bindgroupdrawable: this.canvasRootLayoutArray,
        connections: {
          main: 'array',
        },
        descriptor: {
          primitive: {
            frontFace: 'ccw',
            topology: 'triangle-list',
          },
        },
        fragmentShader: UIfragmentShaderArray,
        label: 'UIRenderPipelineArray',
        vertexShader,
      },
      undefined,
    );
    this.colorFragShader = new FragmentShader({
      entryPoints: {
        main: new FragmentShaderFunction(
          diffuseOutput,
          colorPositionOutput,
          () => /* wgsl */ `
            var output:Output;
            output.Diffuse = vec4<f32>(color,1.0);
            return output;`,
        ),
      },
      gpu: this.device,
      label: 'color.frag',
      pipelineLayouts: [this.positionAndTimeBindGroup],
    });

    this.renderPassCanvas = new RenderPass({
      colorRenderTargets: {
        swap: new ColorRenderTarget(
          {
            format: this.#presentationFormat,
            gpu: this.device,
            label: 'canvasTexture',
            size: {
              height: 300,
              width: 300,
            },
            usages: TextureUsageEnums.RENDER_ATTACHMENT,
          },
          {
            context: context,
            writeMask: 0xf,
          },
          {
            blend: {
              alpha: {
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
                srcFactor: 'one',
              },
              color: {
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
                srcFactor: 'src-alpha',
              },
            },
            // prettier-ignore
            clearValue: {
              // eslint-disable-next-line sort-keys
              r: 0.53, g: 0.8, b: 0.92, a: 1.0,
            },
          },
        ),
      },
      entryPoint: 'main',
      getSizeOnResize: (w, h) => {
        return [w, h];
      },
      gpu: this,
      label: 'renderPassCanvas',
      rootLayouts: [this.canvasRootLayout],
      sampleCount: 1,
      size: {
        height: canvas.height,
        width: canvas.width,
      },
    });

    //Scene layoyt is iterated manually so remove it not to iterate it twise.
    //this.rootCameralayout.subBindGroups.delete(this.rootSceneLayout);

    //water color { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }

    this.#renderPasses = [
      this.renderPassCanvas,
      this.renderPassScreen,
      this.renderPassWater,
      this.pickRenderPass,
    ];

    this.#DynamicBindGroups.add(this.BindGroupPosition);
    const timeAndDeltaBuffer = new ArrayBuffer(8);
    this.timeBuffer = Buffer.create(
      this,
      timeAndDeltaBuffer.byteLength,
      [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST],
      'timeBuffer',
    );

    const ClustersShader = createClustersCompShader(this.sizeBindGroupLayout);
    const computePipelineClustersP =
      ClustersShader[1].createComputePipeline('main');
    const updateViewPipelineP =
      this.updateViewShader[1].createComputePipeline('main');

    let resizeHandler: null | ReturnType<typeof setTimeout> = null;
    const maxResolution = {
      height: 1080,
      width: 1920,
    };
    this.#ro = new window.ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.contentRect.width === 0) {
        return;
      }
      window.cancelAnimationFrame(this.#renderFrame);
      if (resizeHandler) clearTimeout(resizeHandler);
      resizeHandler = setTimeout(async () => {
        try {
          const aspectRatio =
            entry.contentRect.width / entry.contentRect.height;
          canvas.width = Math.min(
            (entry.contentRect.width | 0) * window.devicePixelRatio,
            maxResolution.width,
          );

          canvas.height = canvas.width / aspectRatio;

          if (canvas.height > maxResolution.height) {
            canvas.height = maxResolution.height;
            canvas.width = canvas.height * aspectRatio;
          }

          this.scale.x = canvas.width / entry.contentRect.width;
          this.scale.y = canvas.height / entry.contentRect.height;
          // configure() must also be called if you want to change the size of the textures returned by getCurrentTexture()
          context.configure({
            device: this.device,
            format: this.#presentationFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
          });
          const commandEncoder = this.device.createCommandEncoder({
            label: 'resizeEncoder',
          });
          const passEncoder = commandEncoder.beginComputePass({
            label: 'resizePassEncoder',
          });
          passEncoder.setPipeline(await computePipelineClustersP);

          this.projections.forEach((projection) =>
            projection.update(aspectRatio, this),
          );
          this.#renderPasses.forEach((renderPass) => {
            renderPass.resize(canvas.width, canvas.height);
            passEncoder.setBindGroup(0, renderPass.sizeBindGroup().bindGroup);
            renderPass.perspectiveCameras.forEach((camera) => {
              camera.updateClusters(passEncoder, ClustersShader[0][1]);
            });
          });
          // Call onResize after all renderPasses have resizes so callbacks
          // can refer updated render target of other renderpasses.
          this.#renderPasses.forEach((renderPass) => {
            renderPass.onResize.forEach((cb) => cb());
          });
          passEncoder.end();
          this.device.queue.submit([commandEncoder.finish()]);
          const updateViewPipeline = await updateViewPipelineP;
          this.#renderFrame = window.requestAnimationFrame((time) =>
            this.#renderLoop(time, updateViewPipeline),
          );
        } catch (e) {
          engine.showError(e);
        }
      }, 500);
    });
    if (!canvas.parentElement) {
      throw new Error('Canvas must have parent element');
    }
    this.#ro.observe(canvas.parentElement);
  }

  handle_gpu_queue(pointerVec: number, length: number) {
    this.#GPUQueueCommandEncoder = this.device.createCommandEncoder({
      label: 'handle_gpu_queue_encoder',
    });
    let tempOffset = 0;
    Buffer.create(
      this,
      this.GPUDataSizeBytes * length,
      [GPUBufferUsage.COPY_SRC],
      'handle_gpu_queue',
      (tempBuffer, gpu2) => {
        const pointers_to_gpumesh_and_offset = new Uint32Array(
          engine.memory.buffer,
          pointerVec,
          length,
        );
        const meshes: [mesh: MainNode, gpu_alignment: number][] = [];
        for (let i = 0; i < pointers_to_gpumesh_and_offset.length; i++) {
          const meshID = pointers_to_gpumesh_and_offset[i]!;
          const mesh = MainNode.Meshes.get(meshID);
          if (!mesh) {
            console.warn('Tried to update non exist mesh with id ', meshID);
            continue;
          }
          const offset = engine.rust.gpu_alignment(meshID);
          meshes.push([mesh, offset]);
          if (offset >= this.#maxInstances) {
            this.#maxInstances = offset + 10;
            this.GPUMeshes.resize(
              GPU.gpu_memory_index_size * this.#maxInstances,
            );
          }
        }
        for (let i = 0; i < meshes.length; i++) {
          const [mesh, offset] = meshes[i]!;
          const gpumeshPointer = engine.rust.gpu_pointer(mesh.id);
          const dataLength = this.GPUDataSizeBytes / 4;
          const data = new Float32Array(
            engine.memory.buffer,
            gpumeshPointer,
            dataLength,
          );
          mesh.onMeshChange.forEach((cb) => cb());
          //Point light
          if (data[29]! > 0) {
            engine.updateLights = true;
          }
          new Float32Array(
            tempBuffer.getMappedRange(
              tempOffset * this.GPUDataSizeBytes,
              this.GPUDataSizeBytes,
            ),
          ).set(data);
          gpu2.GPUMeshes.copyFrom(
            this.#GPUQueueCommandEncoder!,
            tempBuffer,
            tempOffset++ * this.GPUDataSizeBytes,
            offset * GPU.gpu_memory_index_size,
            this.GPUDataSizeBytes,
          );
        }
        gpu2.tempGPUBuffers.push(tempBuffer);
      },
    );
  }
  update_directional_lights(pointer: number, length: number) {
    const lights = new Uint32Array(engine.memory.buffer, pointer, length);
    const commandEncoder = this.device.createCommandEncoder({
      label: 'update_directional_lights_encoder',
    });
    //TODO: Potential buffer overflow
    const byteLength = 4 + lights.byteLength;
    const tempBuffer = Buffer.create(
      this,
      byteLength,
      [GPUBufferUsage.COPY_SRC],
      'directional_lights_tempBuffer',
      (tempBuffer2) => {
        const gpu_buffer = new Uint32Array(tempBuffer2.getMappedRange());
        gpu_buffer[0] = lights.length;
        gpu_buffer.set(lights, 1);
      },
    );
    tempBuffer.copyTo(
      commandEncoder,
      this.#GPUDirectionalLights,
      0,
      0,
      byteLength,
    );
    this.pendingCommandBuffers.push(
      commandEncoder.finish({
        label: 'update_directional_lights',
      }),
    );
  }
  update_point_lights(pointer: number, length: number) {
    const lights = new Uint32Array(engine.memory.buffer, pointer, length);
    const commandEncoder = this.device.createCommandEncoder({
      label: 'update_point_lights_encoder',
    });
    //TODO: Potential buffer overflow
    const byteLength = 4 + lights.byteLength;
    const tempBuffer = Buffer.create(
      this,
      byteLength,
      [GPUBufferUsage.COPY_SRC],
      'point_lights_tempBuffer',
      (tempBuffer2) => {
        const gpu_buffer = new Uint32Array(tempBuffer2.getMappedRange());
        gpu_buffer[0] = lights.length;
        gpu_buffer.set(lights, 1);
      },
    );
    tempBuffer.copyTo(commandEncoder, this.#GPUPointLights, 0, 0, byteLength);
    this.pendingCommandBuffers.push(
      commandEncoder.finish({
        label: 'update_point_lights',
      }),
    );
  }
  readonly timeAndDeltaBuffer = new ArrayBuffer(8);
  readonly deltaView = new Float32Array(this.timeAndDeltaBuffer, 4, 1);
  readonly #timeView = new Uint32Array(this.timeAndDeltaBuffer, 0, 1);
  #renderStarted = false;
  onceAfterRender: (() => void)[] = [];
  afterRenderStart(cb: () => void) {
    if (this.#renderStarted) {
      cb();
    } else {
      this.onceAfterRender.push(cb);
    }
  }
  readonly #renderLoop = (
    time: DOMHighResTimeStamp,
    updateViewPipeline: GPUComputePipeline,
  ) => {
    //msPerFrame = performance.now() - startTime;
    //startTime = performance.now();

    const nowSecond = (Date.now() / 500) | 0;
    if (nowSecond !== curSecond) {
      this.fps = framecount * 2; // Update fps twice a second so framecount is for half second
      curSecond = nowSecond;
      framecount = 0;
    }
    framecount++;
    //performance.mark('renderloopStart');

    if (
      engine.inputManager?.checkInputs &&
      engine.inputManager?.checkInputs()
    ) {
      if (engine.inputManager.calculateCameraPositionAndTarget)
        engine.inputManager.calculateCameraPositionAndTarget();
    }

    const renderEncoder = this.device.createCommandEncoder({
      label: 'renderloop_renderEncoder',
    });

    this.#timeView.set([time]);
    let physicDelta: number | null;
    if (engine.physics.gameSpeed == -1) physicDelta = null;
    else
      physicDelta =
        (engine.physics.physicTime - engine.physics.tickTime) /
        engine.physics.tickIntervalMs;
    if (physicDelta !== null) this.deltaView.set([physicDelta]);
    this.timeBuffer.write(0, this.timeAndDeltaBuffer);

    try {
      const updatedCameras = engine.cameras.filter((camera) => {
        return camera.updateView(renderEncoder);
      });
      // Rust render loop start
      this.#GPUQueueCommandEncoder = null;
      engine.rust.renderloop();
      const commandBuff =
        //@ts-expect-error bug in TS
        this.#GPUQueueCommandEncoder?.finish({
          label: 'renderloop',
        }) ?? null;
      if (commandBuff) {
        // Insert this to begin of the array to get all changes to mesh properties affected first
        this.pendingCommandBuffers.unshift(commandBuff);
      }
      // Rust render loop end
      if (engine.updateLights || updatedCameras.length > 0) {
        const lightPass = renderEncoder.beginComputePass({
          label: 'lightPassEncoder',
        });
        lightPass.setPipeline(updateViewPipeline);
        lightPass.setBindGroup(0, this.#updateViewBindGroup.bindGroup);
        //If light source has been moved, update all cameras. Otherwise update only cameras that has been moved.
        const camerasToUpdate = engine.updateLights
          ? engine.cameras
          : updatedCameras;
        camerasToUpdate.forEach((camera) => {
          lightPass.setBindGroup(1, camera.updateViewBindGroup!.bindGroup);
          lightPass.dispatchWorkgroups(...this.CLUSTER_DISPATCH_SIZE);
        });
        lightPass.end();
        // Cluster debug
        //var readBuffer = engine.mainCamera.clusterArrayBuffer?.createReadCopy(renderEncoder)
        engine.updateLights = false;
      }

      this.#renderPasses.forEach((renderPass) => {
        //Do the actual drawing
        renderPass.render(renderEncoder);
      });
    } catch (e) {
      console.error(e);
    }

    this.pendingCommandBuffers.push(
      renderEncoder.finish({
        label: 'renderencoder',
      }),
    );
    this.device.queue.submit(this.pendingCommandBuffers);
    // Cluster debug
    /*
        if(debugNumber === 0) {
            readBuffer?.readAndDestroy((buff) => {
                console.log('clusters',new Uint32Array(buff,8*4 * 27648 + 4 * 27648, 2 ));
            });
            debugNumber=debugNumber+1;
        }*/
    this.pendingCommandBuffers.length = 0;
    this.tempGPUBuffers.forEach((buff) => buff.destroy());
    this.tempGPUBuffers.length = 0;
    this.onceAfterRender.forEach((cb) => cb());
    this.onceAfterRender.length = 0;

    if (!this.#renderStarted) this.#renderStarted = true;
    this.#renderFrame = window.requestAnimationFrame((time2) =>
      this.#renderLoop(time2, updateViewPipeline),
    );
  };
}

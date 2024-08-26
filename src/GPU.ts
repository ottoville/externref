import { RenderPass } from './GPU/RenderPasses/RenderPass.js';
import { PickableRenderPass } from './GPU/RenderPasses/PickableRenderPass.js';

import { Projection } from './GPU/Projection.js';

import type { Engine } from './engine.js';
import { Uint16Vector2 } from './Math.js';
import { DepthRenderPass } from './GPU/RenderPasses/DepthRenderPass.js';
import { TerraCamera } from './TerraCamera.js';
import {
  createUpdateViewShader,
  UpdateView,
} from './GPU/Shaders/UpdateView.comp.js';
import { createClustersCompShader } from './GPU/Shaders/Clusters.comp.js';
import type {
  RenderPipelineProps,
  RenderPipelineProps0,
} from './GPU/RenderPipeline.js';
import { tileCount, UIUniforms } from './GPU/Shaders/structs/Structs.js';
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
  ColorRenderTarget,
  MSAARenderTarget,
  createRenderPipelineBuilder,
  BindGroup,
  Buffer,
  BufferUsageEnums,
  DepthRenderTarget,
  RenderPipelineLayout,
  type RENDER_TARGET_TEXTURE,
  type STORAGE_BINDING_TEXTURE,
  type TEXTURE_BINDING_TEXTURE,
  type RenderpassTargetTextureParams,
  RenderpassTarget,
  type RenderpassTargetOptions,
  Struct,
  type FragmentShader,
  VertexShaderBuilder,
  FragmentShaderBuilder,
} from './webgpu-ts/index.js';
import { createSimpleFragShader } from './GPU/Shaders/Simple.frag.js';
import {
  createShaderBuilders,
  gpu_memory_index_size,
} from './GPU/Shaders/ShaderBuilders.js';

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

export type VertexBufferProps = {
  /**
   * Vertex buffer stride in DWORD
   */
  stride: Word<'dword'>;
};

export class GPU {
  #maxInstances = 10;

  readonly mousePositionBuffer = new SharedArrayBuffer(4);
  readonly mousePosition = new Uint16Vector2(this.mousePositionBuffer);

  readonly #gpu_max_point_lights = 63;

  readonly pendingCommandBuffers: GPUCommandBuffer[] = [];

  readonly projections: Set<Projection> = new Set();
  readonly cameras: TerraCamera[] = [];

  //Todo: Remove COPY_SRC
  readonly GPUMeshes: Buffer<
    (typeof BufferUsageEnums)['UNIFORM|STORAGE|COPY_SRC|COPY_DST']
  >;
  readonly #GPUPointLights: Buffer<
    (typeof BufferUsageEnums)['UNIFORM|STORAGE|COPY_DST']
  >;
  readonly #GPUDirectionalLights: Buffer<
    (typeof BufferUsageEnums)['STORAGE|COPY_DST']
  >;
  readonly lightsTextureBindGroup: RenderPipelineLayout<
    [
      typeof this.shaders.sizeBindGroupLayout,
      typeof this.shaders.uniformBindGroupLayoutWithTime,
      typeof this.shaders.BindGroupLayoutPosition,
      BGLayout<{
        mySampler: SampLayout<ShaderStage.FRAGMENT, 'sampler'>;
        diffuseTexture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
      }>,
    ]
  >;

  readonly BindGroupPosition: BindGroup<
    typeof this.shaders.BindGroupLayoutPosition
  >;
  readonly timeBuffer: Buffer<(typeof BufferUsageEnums)['UNIFORM|COPY_DST']>;

  readonly #renderPasses: RenderPass[];

  readonly scale = {
    x: 1,
    y: 1,
  };
  readonly renderPassScreen: PickableRenderPass<
    {
      gRenderTargetDiffuse: MSAARenderTarget<
        RenderpassTarget<
          RenderpassTargetOptions<
            RenderpassTargetTextureParams<
              RENDER_TARGET_FORMAT,
              Exclude<RENDER_TARGET_TEXTURE, STORAGE_BINDING_TEXTURE> &
                TEXTURE_BINDING_TEXTURE
            >
          >
        >
      >;
    },
    'main'
  >;

  readonly renderPassWater: DepthRenderPass<{
    diffuse: ColorRenderTarget<
      RenderpassTargetOptions<
        RenderpassTargetTextureParams<
          'bgra8unorm',
          (typeof TextureUsageEnums)['RENDER_ATTACHMENT|TEXTURE_BINDING']
        >
      >
    >;
  }>;
  readonly renderPassCanvas: RenderPass<{
    swap: ColorRenderTarget<
      RenderpassTargetOptions<{
        context: GPUCanvasContext;
        format: 'rgba8unorm' | 'bgra8unorm';
      }>
    >;
  }>;

  readonly #updateViewBindGroup: BindGroup;

  readonly clusterSizeinBytes: number;

  readonly #CLUSTER_WORKGROUP_SIZE: [number, number, number] = [4, 2, 4];
  readonly CLUSTER_DISPATCH_SIZE: [number, number, number] = tileCount.map(
    (v, i) => Math.ceil(v / this.#CLUSTER_WORKGROUP_SIZE[i]!),
  ) as [number, number, number];

  readonly #presentationFormat = navigator.gpu.getPreferredCanvasFormat() as
    | 'rgba8unorm'
    | 'bgra8unorm';
  readonly pickRenderPass: RenderPass<{
    gRenderTargetId: ColorRenderTarget<
      RenderpassTargetOptions<
        RenderpassTargetTextureParams<
          'r32uint',
          (typeof TextureUsageEnums)['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC']
        >
      >
    >;
  }>;

  static readonly #renderPipelines: Map<string, RenderPipelineProps> =
    new Map();
  readonly bindGroupTextureWater: RenderPipelineLayout<
    readonly [
      typeof this.shaders.sizeBindGroupLayout,
      typeof this.shaders.uniformBindGroupLayoutWithTime,
      typeof this.waterTextureLayot,
      typeof this.shaders.BindGroupLayoutPosition,
    ]
  >;

  readonly #ro: ResizeObserver;
  readonly canvasRootLayout: RenderPipelineLayout<
    [typeof this.BindGroupLayoutCanvas]
  >;
  readonly UIPipeline: RenderPipelineProps<UIVertShader, UIFragShader>;

  readonly updateViewShader: UpdateView;
  readonly BindGroupLayoutCanvas: BGLayout<{
    uniforms: BufLayout<ShaderStage.VERTEX, typeof UIUniforms>;
    texture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
  }>;
  destroyed = false;
  fps = 0;
  simpleFragShader: ReturnType<typeof createSimpleFragShader>;
  screenRenderTargets: {
    gRenderTargetDiffuse: MSAARenderTarget<
      RenderpassTarget<
        RenderpassTargetOptions<
          RenderpassTargetTextureParams<
            RENDER_TARGET_FORMAT,
            Exclude<RENDER_TARGET_TEXTURE, STORAGE_BINDING_TEXTURE> &
              TEXTURE_BINDING_TEXTURE
          >
        >
      >
    >;
  };
  waterTextureLayot: BGLayout<{
    diffuseTexture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
    mySampler: SampLayout<ShaderStage.FRAGMENT, 'sampler'>;
  }>;
  shaders: ReturnType<typeof createShaderBuilders>;
  meshUniforms: Struct<{
    transformation: ['', 'mat4x4<f32>'];
    transformation_normals: ['', 'mat3x3<f32>'];
    color: ['@size(16)', 'vec3<f32>'];
    ambient: ['@size(12)', 'vec3<f32>'];
    shadow: ['', 'f32'];
    spot_light: ['@size(16)', 'vec3<f32>'];
    id: ['', 'u32'];
    point_light_squared: ['', 'f32']; //30
    directional_light: ['', 'f32'];
    /**
     * bitmask
     */
    scenes: readonly ['', 'u32'];
    /**
     * padding
     */
    z: readonly [string, 'f32'];
  }>;
  meshArray: Struct<{ readonly mesh: readonly ['', 'array<MeshUniforms>'] }>;
  /**
   * Create render pipeline. The function calculates hash and checks if existing render pipeline exists with same parameters.
   * @param desc
   * @param primitive
   * @param vertexBufferProps
   */
  createRenderPipelineBuilder<
    D extends RenderPipelineProps0<
      V,
      F,
      GPUPrimitiveState & {
        topology: 'triangle-strip' | 'line-strip';
        stripIndexFormat: GPUIndexFormat;
      }
    >,
    V extends VertexShaderBuilder | VertexShader,
    F extends FragmentShaderBuilder | FragmentShader,
    P,
  >(
    desc: D,
    vertexShaderBuilder: (gpu: GPU, vertexBufferProps: P) => V,
    fragmentShaderBuilder: (gpu: GPU) => F,
    vertexBufferProps: P,
  ): RenderPipelineProps<
    VertexShader<V['entryPoints'], V['pipelineLayouts']>,
    FragmentShader
  >;
  createRenderPipelineBuilder<
    D extends RenderPipelineProps0<
      V,
      F,
      Omit<GPUPrimitiveState, 'stripIndexFormat'> & {
        topology: 'triangle-list' | 'line-list';
      }
    >,
    V extends VertexShaderBuilder | VertexShader,
    F extends FragmentShaderBuilder | FragmentShader,
    P,
  >(
    desc: D,
    vertexShaderBuilder: (gpu: GPU, vertexBufferProps: P) => V,
    fragmentShaderBuilder: (gpu: GPU) => F,
    vertexBufferProps: P,
  ): RenderPipelineProps<
    VertexShader<V['entryPoints'], V['pipelineLayouts']>,
    FragmentShader
  >;
  createRenderPipelineBuilder<
    D extends RenderPipelineProps0<V, F, Omit<GPUPrimitiveState, 'topology'>>,
    V extends VertexShaderBuilder | VertexShader,
    F extends FragmentShaderBuilder | FragmentShader,
    P,
  >(
    desc: D,
    vertexShaderBuilder: (gpu: GPU, vertexBufferProps: P) => V,
    fragmentShaderBuilder: (gpu: GPU) => F,
    vertexBufferProps: P,
  ): RenderPipelineProps<
    VertexShader<V['entryPoints'], V['pipelineLayouts']>,
    FragmentShader
  >;
  createRenderPipelineBuilder<
    D extends RenderPipelineProps0<V>,
    V extends VertexShaderBuilder | VertexShader,
    F extends FragmentShaderBuilder | FragmentShader,
    P extends VertexBufferProps | undefined,
  >(
    desc: D,
    vertexShaderBuilder: (gpu: GPU, vertexBufferProps: P) => V,
    fragmentShaderBuilder: (gpu: GPU) => F,
    vertexBufferProps: P,
  ): RenderPipelineProps<
    VertexShader<V['entryPoints'], V['pipelineLayouts']>,
    FragmentShader
  > {
    const primitiveWithDefaults: GPUPrimitiveState = {
      cullMode: 'back',
      frontFace: 'cw',
      topology: 'triangle-list',
      ...desc.primitive,
    };
    const vertexBuilder = vertexShaderBuilder(this, vertexBufferProps);
    const fragmentBuilder = fragmentShaderBuilder(this);

    const hash = [
      vertexBuilder.hash,
      fragmentBuilder.hash,
      ...Object.values(primitiveWithDefaults),
      ...Object.values(vertexBufferProps ?? {}),
    ]
      .sort()
      .join();

    let renderPipeline = GPU.#renderPipelines.get(hash) as
      | RenderPipelineProps<
          VertexShader<V['entryPoints'], V['pipelineLayouts']>,
          FragmentShader
        >
      | undefined;
    if (!renderPipeline) {
      renderPipeline = {
        gpu: this,
        label: hash,
        primitive: primitiveWithDefaults,
        ...desc,
        builder: createRenderPipelineBuilder(
          vertexBuilder instanceof VertexShaderBuilder
            ? vertexBuilder.build()
            : vertexBuilder,
          fragmentBuilder instanceof FragmentShaderBuilder
            ? fragmentBuilder.build()
            : fragmentBuilder,
        ),
      };
      GPU.#renderPipelines.set(hash, renderPipeline);
    }
    return renderPipeline;
  }
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
    this.meshUniforms = new Struct('MeshUniforms', {
      transformation: ['', 'mat4x4<f32>'],
      transformation_normals: ['', 'mat3x3<f32>'],
      // eslint-disable-next-line sort-keys
      color: ['@size(16)', 'vec3<f32>'],
      // eslint-disable-next-line sort-keys
      ambient: ['@size(12)', 'vec3<f32>'],
      shadow: ['', 'f32'],
      spot_light: ['@size(16)', 'vec3<f32>'],
      // eslint-disable-next-line sort-keys
      id: ['', 'u32'],
      point_light_squared: ['', 'f32'], //30
      // eslint-disable-next-line sort-keys
      directional_light: ['', 'f32'],
      scenes: ['', 'u32'],
      z: ['@size(' + (gpu_memory_index_size - GPUDataSizeBytes) + ')', 'f32'],
    });
    this.meshArray = new Struct(
      'MeshArray',
      {
        mesh: ['', 'array<MeshUniforms>'],
      },
      [this.meshUniforms],
    );

    const totalClusters = tileCount[0] * tileCount[1] * tileCount[2];
    this.clusterSizeinBytes =
      totalClusters * (8 + 64) * Uint32Array.BYTES_PER_ELEMENT;
    this.updateViewShader = createUpdateViewShader(this);

    this.GPUMeshes = new Buffer({
      gpu: device,
      label: 'GPUMeshes',
      size: gpu_memory_index_size * this.#maxInstances,
      usages: BufferUsageEnums['UNIFORM|STORAGE|COPY_SRC|COPY_DST'],
    });
    this.shaders = createShaderBuilders(this);

    this.#GPUPointLights = new Buffer({
      gpu: device,
      label: 'GPUPointLights',
      size: this.#gpu_max_point_lights * 4,
      usages: BufferUsageEnums['UNIFORM|STORAGE|COPY_DST'],
    });

    this.#GPUDirectionalLights = new Buffer({
      gpu: device,
      label: 'GPUDirectionalLights',
      size: 63 * 4,
      usages: BufferUsageEnums['STORAGE|COPY_DST'],
    });

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
    this.BindGroupPosition = new BindGroup(
      this.shaders.BindGroupLayoutPosition,
      'BindGroupPosition',
      (bindGroup) => ({
        world: this.GPUMeshes.getUniformBinding(
          bindGroup,
          0,
          gpu_memory_index_size,
        ),
      }),
    );
    this.simpleFragShader = createSimpleFragShader(
      this.shaders.positionAndTimeBindGroup,
    );
    this.lightsTextureBindGroup = this.shaders.rootCameralayout.appendBinds(
      'lightsBindGroupTexture2Layout2',
      [
        this.shaders.BindGroupLayoutPosition,
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
      ],
    );
    this.waterTextureLayot = new BGLayout(
      this.device,
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
    this.bindGroupTextureWater = this.shaders.rootCameralayout.appendBinds(
      'lightsBindGroupTexture2PipelineLayout',
      [this.waterTextureLayot, this.shaders.BindGroupLayoutPosition],
    );

    this.pickRenderPass = new RenderPass(
      {
        colorRenderTargets: {
          gRenderTargetId: new ColorRenderTarget(
            {
              context: {
                format: 'r32uint',
                gpu: this.device,
                label: 'idTexture',
                size: {
                  height: 300,
                  width: 300,
                },
                usages:
                  TextureUsageEnums[
                    'RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC'
                  ],
              },
              textureViewDescriptor: {
                arrayLayerCount: 1,
                baseArrayLayer: 0,
              },
            },
            {
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
        label: 'pickRenderPass',
        rootLayouts: [this.shaders.rootCameralayout],
        sampleCount: 1,
        size: {
          height: canvas.height,
          width: canvas.width,
        },
      },
      this,
    );
    this.screenRenderTargets = {
      gRenderTargetDiffuse: new MSAARenderTarget(
        {
          context: {
            format: 'bgra8unorm',
            gpu: this.device,
            label: 'diffuseTexture',
            size: {
              height: 300,
              width: 300,
            },
            usages: TextureUsageEnums['RENDER_ATTACHMENT|TEXTURE_BINDING'],
          },
        },
        {
          // prettier-ignore
          clearValue: {
            // eslint-disable-next-line sort-keys
            r: 0.53, g: 0.8, b: 0.92, a: 0.0,
          },
        },
        new RenderpassTarget({
          context: {
            format: 'bgra8unorm',
            gpu: this.device,
            label: 'diffuseTexture',
            size: {
              height: 300,
              width: 300,
            },
            usages: TextureUsageEnums['RENDER_ATTACHMENT|TEXTURE_BINDING'],
          },
        }),
      ),
    };
    this.renderPassScreen = new PickableRenderPass(
      {
        colorRenderTargets: this.screenRenderTargets,
        entryPoint: 'main',
        getSizeOnResize: (w, h) => {
          return [w, h];
        },
        label: 'renderPassScreen',
        rootLayouts: [this.shaders.rootCameralayout],
        sampleCount: 4,
        size: {
          height: canvas.height,
          width: canvas.width,
        },
      },
      new DepthRenderTarget(0, {
        context: {
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
      }),
      this,
    );
    this.renderPassWater = new DepthRenderPass(
      {
        colorRenderTargets: {
          diffuse: new ColorRenderTarget(
            {
              context: {
                format: 'bgra8unorm',
                gpu: this.device,
                label: 'diffuseTextureWater',
                size: {
                  height: 300,
                  width: 300,
                },
                usages: TextureUsageEnums['RENDER_ATTACHMENT|TEXTURE_BINDING'],
              },
            },
            {
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
        label: 'renderPassWater',
        rootLayouts: [this.shaders.rootCameralayout],
        sampleCount: 1,
        size: {
          height: canvas.height,
          width: canvas.width,
        },
      },
      new DepthRenderTarget(0, {
        context: {
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
      }),
      this,
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

    this.canvasRootLayout = new RenderPipelineLayout({
      bindGroupLayouts: [this.BindGroupLayoutCanvas],
      label: 'canvasRootLayout',
    });
    const vertexShader = createUIVertShader(this.canvasRootLayout, {
      arrayStride: 4 * 4,
      attributes: position_uv_attrs,
      stepMode: 'vertex',
    });
    const UIfragmentShader = createUIFragmentShader(this);
    this.UIPipeline = {
      builder: createRenderPipelineBuilder(vertexShader, UIfragmentShader),
      connections: {
        main: 'main',
      },
      label: 'UIRenderPipeline',
      primitive: {
        frontFace: 'ccw',
        topology: 'triangle-list',
      },
    } as RenderPipelineProps<UIVertShader, UIFragShader>;

    this.renderPassCanvas = new RenderPass(
      {
        colorRenderTargets: {
          swap: new ColorRenderTarget(
            {
              context: { context, format: this.#presentationFormat },
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
        label: 'renderPassCanvas',
        rootLayouts: [this.canvasRootLayout],
        sampleCount: 1,
        size: {
          height: canvas.height,
          width: canvas.width,
        },
      },
      this,
    );

    //Scene layoyt is iterated manually so remove it not to iterate it twise.
    //this.rootCameralayout.subBindGroups.delete(this.rootSceneLayout);

    //water color { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }

    this.#renderPasses = [
      this.renderPassCanvas,
      this.renderPassScreen,
      this.renderPassWater,
      this.pickRenderPass,
    ];

    const timeAndDeltaBuffer = new ArrayBuffer(8);

    this.timeBuffer = new Buffer({
      gpu: this.device,
      label: 'timeBuffer',
      size: timeAndDeltaBuffer.byteLength,
      usages: BufferUsageEnums['UNIFORM|COPY_DST'],
    });

    const ClustersShader = createClustersCompShader(
      this.shaders.sizeBindGroupLayout,
    );
    const computePipelineClustersP =
      ClustersShader[1].createComputePipeline('main');
    const updateViewPipelineP =
      this.updateViewShader[1].createComputePipeline('main');

    let resizeHandler: null | ReturnType<typeof setTimeout> = null;
    const maxResolution = {
      height: 1080,
      width: 1920,
    };
    context.configure({
      device: this.device,
      format: this.#presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
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
            passEncoder.setBindGroup(
              0,
              renderPass.createSizeBindGroup().bindGroup,
            );
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
          engine.showError(e, this);
        }
      }, 500);
    });
    if (!canvas.parentElement) {
      throw new Error('Canvas must have parent element');
    }
    this.#ro.observe(canvas.parentElement);
  }

  handle_gpu_queue(
    pointerVec: number,
    length: number,
    commandEncoder: GPUCommandEncoder,
    tempBuffer: Buffer<BufferUsageEnums.COPY_SRC, true>,
  ) {
    let tempOffset = 0;
    const pointers_to_gpumesh_and_offset = new Uint32Array(
      engine.rust.memory.buffer,
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
        this.GPUMeshes.resize(gpu_memory_index_size * this.#maxInstances);
      }
    }
    for (let i = 0; i < meshes.length; i++) {
      const [mesh, offset] = meshes[i]!;
      const gpumeshPointer = engine.rust.gpu_pointer(mesh.id);
      const dataLength = this.GPUDataSizeBytes / 4;
      const data = new Float32Array(
        engine.rust.memory.buffer,
        gpumeshPointer,
        dataLength,
      );
      new Float32Array(
        tempBuffer.getMappedRange(
          tempOffset * this.GPUDataSizeBytes,
          this.GPUDataSizeBytes,
        ),
      ).set(data);
      this.GPUMeshes.copyFrom(
        commandEncoder,
        tempBuffer,
        tempOffset++ * this.GPUDataSizeBytes,
        offset * gpu_memory_index_size,
        this.GPUDataSizeBytes,
      );
    }
    tempBuffer.unmap();
  }
  update_directional_lights(pointer: number, length: number) {
    const lights = new Uint32Array(engine.rust.memory.buffer, pointer, length);
    const commandEncoder = this.device.createCommandEncoder({
      label: 'update_directional_lights_encoder',
    });
    //TODO: Potential buffer overflow
    const byteLength = 4 + lights.byteLength;
    const tempBuffer = new Buffer(
      {
        gpu: this.device,
        label: 'directional_lights_tempBuffer',
        size: byteLength,
        usages: BufferUsageEnums.COPY_SRC,
      },
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
    const lights = new Uint32Array(engine.rust.memory.buffer, pointer, length);
    const commandEncoder = this.device.createCommandEncoder({
      label: 'update_point_lights_encoder',
    });
    //TODO: Potential buffer overflow
    const byteLength = 4 + lights.byteLength;
    const tempBuffer = new Buffer(
      {
        gpu: this.device,
        label: 'point_lights_tempBuffer',
        size: byteLength,
        usages: BufferUsageEnums.COPY_SRC,
      },
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

    const renderloop_commandEncoder = this.device.createCommandEncoder({
      label: 'renderloop_commandEncoder',
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
        return camera.updateView(renderloop_commandEncoder);
      });
      // Rust render loop start
      const GPUQueueCommandEncoder = this.device.createCommandEncoder({
        label: 'handle_gpu_queue_encoder',
      });
      engine.rust.process_gpu_queue({
        externref: GPUQueueCommandEncoder,
        reference: true,
      });
      const commandBuff = GPUQueueCommandEncoder.finish({
        label: 'renderloop',
      });

      // Insert this to begin of the array to get all changes to mesh properties affected first
      this.pendingCommandBuffers.unshift(commandBuff);

      const updateLights = engine.rust.get_update_lights();
      // Rust render loop end
      if (updateLights || updatedCameras.length > 0) {
        const lightPass = renderloop_commandEncoder.beginComputePass({
          label: 'lightPassEncoder',
        });
        lightPass.setPipeline(updateViewPipeline);
        lightPass.setBindGroup(0, this.#updateViewBindGroup.bindGroup);
        //If light source has been moved, update all cameras. Otherwise update only cameras that has been moved.
        const camerasToUpdate = updateLights ? engine.cameras : updatedCameras;
        camerasToUpdate.forEach((camera) => {
          lightPass.setBindGroup(1, camera.updateViewBindGroup!.bindGroup);
          lightPass.dispatchWorkgroups(...this.CLUSTER_DISPATCH_SIZE);
        });
        lightPass.end();
        // Cluster debug
        //var readBuffer = engine.mainCamera.clusterArrayBuffer?.createReadCopy(renderEncoder)
        engine.rust.set_update_lights(false);
      }

      this.#renderPasses.forEach((renderPass) => {
        //Do the actual drawing
        renderPass.render(renderloop_commandEncoder);
      });
    } catch (e) {
      console.error(e);
    }

    this.pendingCommandBuffers.push(
      renderloop_commandEncoder.finish({
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
    engine.rust.clear_temp_gpu_buffers();
    this.onceAfterRender.forEach((cb) => cb());
    this.onceAfterRender.length = 0;

    if (!this.#renderStarted) this.#renderStarted = true;
    this.#renderFrame = window.requestAnimationFrame((time2) =>
      this.#renderLoop(time2, updateViewPipeline),
    );
  };
}

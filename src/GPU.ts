import { RenderPass } from './GPU/RenderPasses/RenderPass.js';

import { type Engine } from './engine.js';
import { DepthRenderPass } from './GPU/RenderPasses/DepthRenderPass.js';
import { TerraCamera } from './TerraCamera.js';
import {
  createUpdateViewShader,
  UpdateView,
} from './GPU/Shaders/UpdateView.comp.js';
import { createClustersCompShader } from './GPU/Shaders/Clusters.comp.js';
import type {
  PrimitiveState,
  PrimitiveStateStrip,
  RenderPipelineProps,
  RenderPipelineProps0,
} from './GPU/RenderPipeline.js';
import { UIVertShader } from './GPU/Shaders/UI.vert.js';
import { UIFragShader } from './GPU/Shaders/UI.frag.js';
import {
  type RENDER_TARGET_FORMAT,
  TextureUsageEnums,
  type VertexShader,
  ColorRenderTarget,
  MSAARenderTarget,
  createRenderPipelineBuilder,
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
  PipelineIntersection,
  type IRenderBundleEncoder,
  type IBindGroup,
} from './webgpu-ts/index.js';
import {
  createShaderBuilders,
  gpu_memory_index_size,
} from './GPU/Shaders/ShaderBuilders.js';
import { StructProperty } from './webgpu-ts/index.js';
import { createPipelineLayouts } from './GPU/Shaders/Pipelinelayouts.js';
import { createUI } from './GPU/UI.js';
import { Externref } from './externref.js';
import { PickableRenderPassMSAA } from './GPU/RenderPasses/PickableRenderPassMSAA.js';

declare const engine: Engine;
let curSecond = 0;
let framecount = 0;

interface createRenderPipelineProps<
  P extends PrimitiveState | PrimitiveStateStrip,
  V extends VertexShaderBuilder | VertexShader,
  F extends FragmentShaderBuilder | FragmentShader,
> {
  desc: RenderPipelineProps0<V, F, P>;
  vertexShaderBuilder: V;
  fragmentShaderBuilder: F;
}

export class GPU {
  readonly BindGroupPosition: IBindGroup<
    typeof this.pipelineLayouts.BindGroupLayoutPosition
  >;

  readonly renderPassScreen: PickableRenderPassMSAA<
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

  readonly #presentationFormat = navigator.gpu.getPreferredCanvasFormat() as
    | 'rgba8unorm'
    | 'bgra8unorm';
  readonly pickRenderPass: RenderPass<{
    gRenderTargetId: ColorRenderTarget<
      RenderpassTargetOptions<
        RenderpassTargetTextureParams<
          'rg32uint',
          (typeof TextureUsageEnums)['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC']
        >
      >
    >;
  }>;

  static readonly #renderPipelines: Map<string, RenderPipelineProps> =
    new Map();
  readonly bindGroupTextureWater: RenderPipelineLayout<
    readonly [
      typeof this.pipelineLayouts.sizeBindGroupLayout,
      typeof this.pipelineLayouts.uniformBindGroupLayoutWithTime,
      typeof this.pipelineLayouts.waterTextureLayot,
      typeof this.pipelineLayouts.BindGroupLayoutPosition,
    ]
  >;

  readonly #ro: ResizeObserver;
  readonly UIPipeline: RenderPipelineProps<UIVertShader, UIFragShader>;

  readonly updateViewShader: UpdateView;
  destroyed = false;
  fps = 0;
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
  shaders: ReturnType<typeof createShaderBuilders>;
  pipelineLayouts: ReturnType<typeof createPipelineLayouts>;
  meshUniforms: Struct<{
    readonly transformation: StructProperty<'mat4x4<f32>'>;
    readonly transformation_normals: StructProperty<'mat3x3<f32>'>;
    readonly color: StructProperty<'vec3<f32>'>;
    readonly ambient: StructProperty<'vec3<f32>'>;
    readonly shadow: StructProperty<'f32'>;
    readonly spot_light: StructProperty<'vec3<f32>'>;
    readonly id: StructProperty<'u32'>;
    readonly generation: StructProperty<'u32'>;
    readonly point_light_squared: StructProperty<'f32'>; //30
    readonly directional_light: StructProperty<'f32'>;
    /**
     * bitmask
     */
    readonly scenes: StructProperty<'u32'>;
    /**
     * padding
     */
    readonly z: StructProperty<'f32'>;
  }>;
  mainCamera: TerraCamera;
  gpu_buffer?: number;
  bind_group_position?: rust_pointer<'bind_group_position'>;
  /**
   * Create render pipeline. The function calculates hash and checks if existing render pipeline exists with same parameters.
   * @param desc
   * @param primitive
   * @param vertexBufferProps
   */
  createRenderPipelineBuilder<
    V extends VertexShaderBuilder | VertexShader,
    F extends FragmentShaderBuilder | FragmentShader,
    P extends PrimitiveState,
  >(
    props: createRenderPipelineProps<P, V, F>,
  ): PipelineIntersection<
    V['pipelineLayouts'],
    F['pipelineLayouts']
  > extends never
    ? never
    : RenderPipelineProps<
        VertexShader<V['entryPoints'], V['pipelineLayouts']>,
        FragmentShader
      >;
  createRenderPipelineBuilder<
    V extends VertexShaderBuilder | VertexShader,
    F extends FragmentShaderBuilder | FragmentShader,
    P extends PrimitiveStateStrip,
  >(
    props: createRenderPipelineProps<P, V, F>,
    stripIndexFormat: GPUIndexFormat,
  ): PipelineIntersection<
    V['pipelineLayouts'],
    F['pipelineLayouts']
  > extends never
    ? never
    : RenderPipelineProps<
        VertexShader<V['entryPoints'], V['pipelineLayouts']>,
        FragmentShader
      >;
  createRenderPipelineBuilder<
    V extends VertexShaderBuilder | VertexShader,
    F extends FragmentShaderBuilder | FragmentShader,
    P extends PrimitiveState | PrimitiveStateStrip,
  >(
    props: createRenderPipelineProps<P, V, F>,
    stripIndexFormat?: GPUIndexFormat,
  ): PipelineIntersection<
    V['pipelineLayouts'],
    F['pipelineLayouts']
  > extends never
    ? never
    : RenderPipelineProps<
        VertexShader<V['entryPoints'], V['pipelineLayouts']>,
        FragmentShader
      > {
    const primitiveWithDefaults: GPUPrimitiveState = {
      cullMode: 'back',
      frontFace: 'cw',
      topology: 'triangle-list',
      ...props.desc.primitive,
    };
    if (props.desc.primitive?.topology.endsWith('strip')) {
      primitiveWithDefaults.stripIndexFormat = stripIndexFormat!;
    }

    const hash = [
      props.vertexShaderBuilder.hash,
      props.fragmentShaderBuilder.hash,
      ...Object.values(primitiveWithDefaults),
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
        builder: createRenderPipelineBuilder(
          props.vertexShaderBuilder instanceof VertexShaderBuilder
            ? props.vertexShaderBuilder.build()
            : props.vertexShaderBuilder,
          props.fragmentShaderBuilder instanceof FragmentShaderBuilder
            ? props.fragmentShaderBuilder.build()
            : props.fragmentShaderBuilder,
        ),
        connections: props.desc.connections,
        depthBuffer: props.desc.depthBuffer,
        label: hash,
        primitive: primitiveWithDefaults,
      };
      GPU.#renderPipelines.set(hash, renderPipeline);
    }
    //@ts-expect-error todo
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
    cancelAnimationFrame(this.#renderFrame);
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
    GPUDataSizeBytes: number,
  ) {
    this.meshUniforms = new Struct('MeshUniforms', {
      transformation: new StructProperty('', 'mat4x4<f32>'),
      transformation_normals: new StructProperty('', 'mat3x3<f32>'),
      // eslint-disable-next-line sort-keys
      color: new StructProperty('@size(16)', 'vec3<f32>'),
      // eslint-disable-next-line sort-keys
      ambient: new StructProperty('@size(12)', 'vec3<f32>'),
      shadow: new StructProperty('', 'f32'),
      spot_light: new StructProperty('@size(16)', 'vec3<f32>'),
      // eslint-disable-next-line sort-keys
      id: new StructProperty('', 'u32'),
      // eslint-disable-next-line sort-keys
      generation: new StructProperty('', 'u32'),
      point_light_squared: new StructProperty('', 'f32'), //30
      // eslint-disable-next-line sort-keys
      directional_light: new StructProperty('', 'f32'),
      scenes: new StructProperty('', 'u32'),
      z: new StructProperty(
        '@size(' + (gpu_memory_index_size - GPUDataSizeBytes) + ')',
        'f32',
      ),
    });

    this.pipelineLayouts = createPipelineLayouts(this);
    this.pickRenderPass = new RenderPass({
      colorRenderTargets: {
        gRenderTargetId: new ColorRenderTarget(
          {
            context: {
              format: 'rg32uint',
              gpu: this.device,
              label: 'idTexture',
              size: {
                height: 300,
                width: 300,
              },
              usages:
                TextureUsageEnums['RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC'],
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
      id: 2,
      label: 'pickRenderPass',
      rootLayout: this.pipelineLayouts.rootCameralayout,
      sampleCount: 1,
    });
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
        new RenderpassTarget(
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
          {},
        ),
      ),
    };
    const context: GPUCanvasContext | null = canvas.getContext(
      'webgpu',
    ) as unknown as GPUCanvasContext; // unknown for jest
    if (!context) throw new Error('Unable to get webgpu context');

    this.renderPassScreen = new PickableRenderPassMSAA(
      {
        colorRenderTargets: this.screenRenderTargets,
        entryPoint: 'main',
        id: 0,
        label: 'renderPassScreen',
        rootLayout: this.pipelineLayouts.rootCameralayout,
        sampleCount: 4,
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
        id: 1,
        label: 'renderPassWater',
        rootLayout: this.pipelineLayouts.rootCameralayout,
        sampleCount: 1,
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
    );
    this.renderPassCanvas = new RenderPass({
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
      id: 3,
      label: 'renderPassCanvas',
      rootLayout: this.pipelineLayouts.canvasRootLayout,
      sampleCount: 1,
    });
    const bindGroup_index = engine.rust.init_gpu(
      new Externref(true, device),
      device.queue,
      this.pipelineLayouts.updateViewLayout,
      true,
      this.pipelineLayouts.sizeBindGroupLayout,
      this.pipelineLayouts.BindGroupLayoutPosition,
      this.renderPassScreen,
      this.renderPassWater,
      this.renderPassCanvas,
      this.pickRenderPass,
    );
    this.renderPassScreen.link_renderpass(this);
    this.renderPassWater.link_renderpass(this);
    this.renderPassCanvas.link_renderpass(this);
    this.pickRenderPass.link_renderpass(this);
    this.shaders = createShaderBuilders(this);
    this.updateViewShader = createUpdateViewShader(this);

    const bindGroup = engine.rust.externrefs.get(
      bindGroup_index,
    ) as GPUBindGroup;

    this.BindGroupPosition = {
      bindGroup,
      destroy: function (): void {
        throw new Error('Function not implemented.');
      },

      getForRenderBundle: function (
        _renderBundleEncoder: IRenderBundleEncoder,
      ): GPUBindGroup {
        throw new Error('Function not implemented.');
      },
      //@ts-expect-error rust hax
      getForRenderBundle2: (
        rust_renderbundle_encoder: rust_pointer<'renderbundleencoder'>,
        bindGroupStartIndex: number,
        offsets?: readonly number[] | undefined,
      ) => {
        if (offsets) {
          if (offsets.length === 0) {
            engine.rust.renderbundle_set_bindgroup(
              rust_renderbundle_encoder,
              bindGroupStartIndex++,
              this.bind_group_position!,
              new Externref(true, engine.gpu!.device),
            );
          } else if (offsets.length === 1) {
            engine.rust.renderbundle_set_bindgroup_1(
              rust_renderbundle_encoder,
              bindGroupStartIndex++,
              this.bind_group_position!,
              new Externref(true, engine.gpu!.device),
              offsets[0]!,
            );
          } else if (offsets.length === 2) {
            engine.rust.renderbundle_set_bindgroup_2(
              rust_renderbundle_encoder,
              bindGroupStartIndex++,
              this.bind_group_position!,
              new Externref(true, engine.gpu!.device),
              offsets[0]!,
              offsets[1]!,
            );
          } else {
            throw new Error(
              'unsupported length of dynamic offsets ' + offsets.length,
            );
          }
        }
      },
      layout: this.pipelineLayouts.BindGroupLayoutPosition,
    };

    this.bindGroupTextureWater =
      this.pipelineLayouts.rootCameralayout.appendBinds(
        'lightsBindGroupTexture2PipelineLayout',
        [
          this.pipelineLayouts.waterTextureLayot,
          this.pipelineLayouts.BindGroupLayoutPosition,
        ],
      );

    this.mainCamera = new TerraCamera('mainCamera', this, [
      this.renderPassScreen,
      this.pickRenderPass,
    ]);

    new TerraCamera(
      'waterCamera',
      this,
      [this.renderPassWater],
      this.mainCamera,
    );
    //TODO: this does not need to be canvas size
    /*const renderPassShadows = new DepthRenderPass(this, {}, 4, [canvas.width,canvas.height,1],
            (w, h) => [w, h],'shadows',this.rootCameralayout,'renderPassShadows');
    */

    context.configure({
      device: device,
      format: this.#presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.UIPipeline = createUI(this);

    //Scene layoyt is iterated manually so remove it not to iterate it twise.
    //this.rootCameralayout.subBindGroups.delete(this.rootSceneLayout);

    //water color { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }

    const ClustersShader = createClustersCompShader(this);
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
            entry.devicePixelContentBoxSize[0]!.inlineSize /
            entry.devicePixelContentBoxSize[0]!.blockSize;
          canvas.width = Math.min(
            entry.devicePixelContentBoxSize[0]!.inlineSize,
            maxResolution.width,
          );

          canvas.height = canvas.width / aspectRatio;

          if (canvas.height > maxResolution.height) {
            canvas.height = maxResolution.height;
            canvas.width = canvas.height * aspectRatio;
          }

          engine.rust.on_resize(
            aspectRatio,
            canvas.width,
            canvas.height,
            await computePipelineClustersP,
            window.devicePixelRatio,
          );

          const updateViewPipeline = await updateViewPipelineP;
          this.#renderFrame = window.requestAnimationFrame((time) =>
            this.#renderLoop(time, updateViewPipeline),
          );
        } catch (e) {
          engine.showError(e);
        }
      }, 300);
    });
    if (!canvas.parentElement) {
      throw new Error('Canvas must have parent element');
    }
    this.#ro.observe(canvas.parentElement);
  }
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

    engine.rust.process_gpu_queue(time, updateViewPipeline);

    this.device.queue
      .onSubmittedWorkDone()
      .then(() => {
        this.onceAfterRender.forEach((cb) => cb());
        this.onceAfterRender.length = 0;
      })
      .catch((err) => engine.showError(err));
    if (!this.#renderStarted) this.#renderStarted = true;
    this.#renderFrame = window.requestAnimationFrame((time2) =>
      this.#renderLoop(time2, updateViewPipeline),
    );
  };
}

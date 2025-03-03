import { RenderPass } from './GPU/RenderPasses/RenderPass.js';
import { PickableRenderPass } from './GPU/RenderPasses/PickableRenderPass.js';

import { type Engine } from './engine.js';
import { Uint16Vector2 } from './Math.js';
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
import { tileCount } from './GPU/Shaders/structs/Structs.js';
import { UIVertShader } from './GPU/Shaders/UI.vert.js';
import { UIFragShader } from './GPU/Shaders/UI.frag.js';
import {
  type RENDER_TARGET_FORMAT,
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
  PipelineIntersection,
} from './webgpu-ts/index.js';
import {
  createShaderBuilders,
  gpu_memory_index_size,
} from './GPU/Shaders/ShaderBuilders.js';
import { StructProperty } from './webgpu-ts/index.js';
import { createPipelineLayouts } from './GPU/Shaders/Pipelinelayouts.js';
import { createUI } from './GPU/UI.js';
import { Externref } from './externref.js';

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
  readonly mousePositionBuffer = new SharedArrayBuffer(4);
  readonly mousePosition = new Uint16Vector2(this.mousePositionBuffer);

  readonly cameras: TerraCamera[] = [];

  readonly BindGroupPosition: BindGroup<
    typeof this.pipelineLayouts.BindGroupLayoutPosition
  >;
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
  gpu_lock?: rust_pointer<'gpu'>;
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
      point_light_squared: new StructProperty('', 'f32'), //30
      // eslint-disable-next-line sort-keys
      directional_light: new StructProperty('', 'f32'),
      scenes: new StructProperty('', 'u32'),
      z: new StructProperty(
        '@size(' + (gpu_memory_index_size - GPUDataSizeBytes) + ')',
        'f32',
      ),
    });

    const totalClusters = tileCount[0] * tileCount[1] * tileCount[2];
    this.clusterSizeinBytes =
      totalClusters * (8 + 64) * Uint32Array.BYTES_PER_ELEMENT;

    this.pipelineLayouts = createPipelineLayouts(this);
    engine.rust.init_gpu(
      new Externref(true, device),
      device.queue,
      this.pipelineLayouts.updateViewLayout,
      true,
    );
    this.shaders = createShaderBuilders(this);
    this.updateViewShader = createUpdateViewShader(this);

    this.BindGroupPosition = new BindGroup(
      this.pipelineLayouts.BindGroupLayoutPosition,
      'BindGroupPosition',
      (bindGroup) => {
        const index = engine.rust.get_gpu_mesh_buffer(this.gpu_lock!);
        const buffer = engine.rust.externrefs.get(index) as Externref<
          false,
          Buffer<(typeof BufferUsageEnums)['UNIFORM|STORAGE|COPY_SRC|COPY_DST']>
        >;
        return {
          world: buffer.externref.getUniformBinding(
            bindGroup,
            0,
            gpu_memory_index_size,
          ),
        };
      },
    );

    this.bindGroupTextureWater =
      this.pipelineLayouts.rootCameralayout.appendBinds(
        'lightsBindGroupTexture2PipelineLayout',
        [
          this.pipelineLayouts.waterTextureLayot,
          this.pipelineLayouts.BindGroupLayoutPosition,
        ],
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
        rootLayouts: [this.pipelineLayouts.rootCameralayout],
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
        rootLayouts: [this.pipelineLayouts.rootCameralayout],
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
        rootLayouts: [this.pipelineLayouts.rootCameralayout],
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
    this.mainCamera = new TerraCamera(
      'mainCamera',
      this,
      this.renderPassScreen,
    );

    new TerraCamera('waterCamera', this, this.renderPassWater, this.mainCamera);
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

    this.UIPipeline = createUI(this);

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
        rootLayouts: [this.pipelineLayouts.canvasRootLayout],
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
          engine.rust.on_resize(aspectRatio);
          this.#renderPasses.forEach((renderPass) => {
            renderPass.resize(canvas.width, canvas.height);
            passEncoder.setBindGroup(
              0,
              renderPass.createSizeBindGroup().bindGroup,
            );
            renderPass.perspectiveCameras.forEach((camera) => {
              passEncoder.setBindGroup(
                1,
                camera.updateClustersBindGroup!.bindGroup,
              );
              passEncoder.dispatchWorkgroups(...this.CLUSTER_DISPATCH_SIZE);
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
  #renderStarted = false;
  onceAfterRender: (() => void)[] = [];
  afterRenderStart(cb: () => void) {
    if (this.#renderStarted) {
      cb();
    } else {
      this.onceAfterRender.push(cb);
    }
  }
  #idleCallback: number | undefined;
  renderRenderPasses(
    renderloop_commandEncoder: GPUCommandEncoder,
    rust_gpu: rust_pointer<'gpu'>,
  ) {
    this.gpu_lock = rust_gpu;
    this.#renderPasses.forEach((renderPass) => {
      //Do the actual drawing
      renderPass.render(renderloop_commandEncoder);
    });
  }
  executeRuntime = false;
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

    if (engine.inputManager?.checkInputs) {
      engine.inputManager?.checkInputs();
    }
    if (engine.rust.process_gpu_queue(time, updateViewPipeline)) {
      // Some buffers did move from onqueue to pending, execute runtime later on
      this.executeRuntime = true;
    }
    if (this.executeRuntime && this.#idleCallback === undefined) {
      this.#idleCallback = requestIdleCallback(() => {
        this.#idleCallback = undefined;
        // If there are still pending buffers, execute runtime again later on
        this.executeRuntime = engine.rust.check_mapped_buffers();
      });
    }
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

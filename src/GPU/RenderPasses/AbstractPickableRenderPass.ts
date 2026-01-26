import {
  type ColorRenderTarget,
  type DEPTH_FORMATS,
  type DepthRenderTarget,
  type RENDER_TARGET_TEXTURE,
  type STORAGE_BINDING_TEXTURE,
  type TEXTURE_BINDING_TEXTURE,
  type RenderpassTargetOptions,
  type RenderpassTargetTextureParams,
} from '../../webgpu-ts/index.js';
import { DepthRenderPass } from './DepthRenderPass.js';
import { RenderPassProps } from './RenderPass.js';
import type { GPU } from '../../GPU.js';
import type { Engine } from '../../engine.js';
import { createReadDepth } from '../Shaders/ReadDepth.comp.js';
declare const engine: Engine;

export abstract class AbstractPickableRenderPass<
  T extends {
    [index: string]: ColorRenderTarget<
      RenderpassTargetOptions<RenderpassTargetTextureParams>
    >;
  } = {
    [index: string]: ColorRenderTarget<
      RenderpassTargetOptions<RenderpassTargetTextureParams>
    >;
  },
  E extends string = string,
> extends DepthRenderPass<T, E> {
  #pickPositionPipeline?: GPUComputePipeline;
  zAndIDPromise: Promise<[z: number, id: number, generation: number]> | null =
    null;
  pickBuffer: GPUBuffer;

  constructor(
    renderPassProps: RenderPassProps<T, E>,
    depthRenderTarget: DepthRenderTarget<
      RenderpassTargetOptions<
        RenderpassTargetTextureParams<
          DEPTH_FORMATS,
          Exclude<RENDER_TARGET_TEXTURE, STORAGE_BINDING_TEXTURE> &
            TEXTURE_BINDING_TEXTURE
        >
      >
    >,
    gpu: GPU,
    pickBufferDesc: GPUBufferDescriptor,
  ) {
    super(renderPassProps, depthRenderTarget);
    const readDepthShader = createReadDepth(gpu);
    readDepthShader
      .createComputePipeline('main')
      .then((pickPositionPipeline) => {
        this.#pickPositionPipeline = pickPositionPipeline;
      })
      .catch((err) => engine.showError(err));

    this.pickBuffer = gpu.device.createBuffer(pickBufferDesc);
  }
  pickPosition(): Promise<{
    position: readonly [number, number, number];
  } | null> | null;
  pickPosition(mesh: true): Promise<{
    position: readonly [number, number, number];
    meshId: number;
    generation: number;
  } | null> | null;
  pickPosition(_mesh = false): Promise<
    | { position: readonly [number, number, number] }
    | {
        position: readonly [number, number, number];
        meshId: number;
        generation: number;
      }
    | null
  > | null {
    return new Promise((resolve) => {
      engine.rust.do_pick(
        this.props.id,
        this.#pickPositionPipeline!,
        engine.gpu!.gpu,
        (x, y, z, mesh_id, generation) => {
          resolve({
            generation,
            meshId: mesh_id,
            position: [x, y, z],
          });
        },
      );
    });
  }
}

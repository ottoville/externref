import { MainNode } from '../../MainNode.js';
import { RenderPassProps } from './RenderPass.js';
import { createReadDepth } from '../../GPU/Shaders/ReadDepth.comp.js';
import {
  type ColorRenderTarget,
  type DEPTH_FORMATS,
  Buffer,
  BufferUsageEnums,
  BindGroup,
  type DepthRenderTarget,
  type RENDER_TARGET_TEXTURE,
  type STORAGE_BINDING_TEXTURE,
  type TEXTURE_BINDING_TEXTURE,
  type RenderpassTargetOptions,
  type RenderpassTargetTextureParams,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import type { Engine } from '../../engine.js';
import { AbstractPickableRenderPass } from './AbstractPickableRenderPass.js';
declare const engine: Engine;

export class PickableRenderPassMSAA<
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
> extends AbstractPickableRenderPass<T, E> {
  readonly #pickBufferRead: GPUBuffer;
  #pickPositionPipeline?: GPUComputePipeline;
  readonly #mousePositionBuffer: Buffer<
    (typeof BufferUsageEnums)['UNIFORM|COPY_DST']
  >;
  readonly #pickPositionBindGroup0: BindGroup;

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
  ) {
    super(renderPassProps, depthRenderTarget, gpu, {
      label: 'pickBuffer',
      size: 4 * 4, //depth + meshID (four pixel)
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
    });
    const readDepthShader = createReadDepth(gpu);
    readDepthShader
      .createComputePipeline('main')
      .then((pickPositionPipeline) => {
        this.#pickPositionPipeline = pickPositionPipeline;
      })
      .catch((err) => engine.showError(err));
    this.#pickBufferRead = gpu.device.createBuffer({
      label: 'pickBufferRead',
      size: 4 + 4 + 4, //depth + meshID + generation (four pixel)
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    this.#mousePositionBuffer = new Buffer({
      gpu: gpu.device,
      label: 'mousePositionBuffer',
      size: 8,
      usages: BufferUsageEnums['UNIFORM|COPY_DST'],
    });

    this.#pickPositionBindGroup0 = new BindGroup(
      gpu.pickBGLayout,
      'pickPositionBindGroup0',
      (bindGroup) => ({
        depth_and_mesh: {
          buffer: this.pickBuffer,
        },
        depth_texture: depthRenderTarget.renderTarget,
        mesh_texture:
          gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId
            .renderTarget,
        mouse: this.#mousePositionBuffer.getUniformBinding(bindGroup),
      }),
    );
  }
  doPick(_mesh: boolean, mouse_x: number, mouse_y: number) {
    if (!this.#pickPositionPipeline) {
      return null;
    }
    const gpu = this.depthRenderTarget.renderTarget.texture.props.gpu;
    const encoder = gpu.createCommandEncoder({
      label: 'pickPosition_encoder',
    });

    const mousePositionSwapBuffer = new Buffer({
      gpu,
      label: 'mousePositionSwapBuffer',
      mappedAtCreation: true,
      size: 8,
      usages: BufferUsageEnums.COPY_SRC,
    });
    new Uint32Array(mousePositionSwapBuffer.getMappedRange(0, 8)).set([
      mouse_x,
      mouse_y,
    ]);
    mousePositionSwapBuffer
      .unmap()
      .copyTo(encoder, this.#mousePositionBuffer, 0, 0, 8);
    const pickPass = encoder.beginComputePass({
      label: 'pickPass',
    });
    pickPass.setPipeline(this.#pickPositionPipeline);

    pickPass.setBindGroup(0, this.#pickPositionBindGroup0.bindGroup);
    pickPass.dispatchWorkgroups(1);
    pickPass.end();
    encoder.copyBufferToBuffer(
      this.pickBuffer,
      0,
      this.#pickBufferRead,
      0,
      4 + 4 + 4,
    );
    gpu.queue.submit([encoder.finish()]);

    return this.#pickBufferRead
      .mapAsync(GPUMapMode.READ, 0, 4 + 4 + 4)
      .then(() => {
        const b = this.#pickBufferRead.getMappedRange(0, 4 + 4 + 4);
        const z = new DataView(b).getFloat32(0, true);
        const meshID = new DataView(b).getUint32(4, true);
        const generation = new DataView(b).getUint32(8, true);
        this.#pickBufferRead.unmap();
        return [z, meshID, generation] as const;
      }) as Promise<[z: number, id: number, generation: number]>;
  }
  /**
   *
   * @param wantedMeshes List of meshes to test pick against
   * @returns
   */
  async pickMesh(wantedMeshes: MainNode[]): Promise<{
    position: readonly [number, number, number];
    mesh: MainNode;
  } | null> {
    const pickInfo = await this.pickPosition(true);
    if (!pickInfo) {
      return null;
    }

    const pickedMesh = wantedMeshes.find((mesh) =>
      engine.rust.compare_mesh_id(
        mesh.id,
        pickInfo.meshId,
        pickInfo.generation,
      ),
    );
    if (!pickedMesh) {
      return null;
    }
    return {
      mesh: pickedMesh,
      position: pickInfo.position,
    };
  }
}

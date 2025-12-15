import { MainNode } from '../../MainNode.js';
import { RenderPassProps } from './RenderPass.js';
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
import type { GPU } from '../../GPU.js';
import type { Engine } from '../../engine.js';
import { AbstractPickableRenderPass } from './AbstractPickableRenderPass.js';
declare const engine: Engine;

export class PickableRenderPass<
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
  #rowBytes: number = 0;
  #rowBytesDepth: number = 0;

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
    private gpu: GPU,
  ) {
    super(renderPassProps, depthRenderTarget, gpu, {
      label: 'pickBuffer',
      size: 16,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
  }

  override resize(width: number, height: number) {
    super.resize(width, height);
    //update picking
    const oldpickBuffer = this.pickBuffer;
    if (oldpickBuffer) {
      setTimeout(() => {
        oldpickBuffer.destroy();
      }, 1000);
    }
    this.#rowBytes =
      width *
      this.gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId
        .renderTarget.texture.bytes_per_fixel;
    this.#rowBytesDepth =
      width *
      this.gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId
        .renderTarget.texture.bytes_per_fixel;

    let rowBytes =
      width *
      this.gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId
        .renderTarget.texture.bytes_per_fixel;

    const offset = rowBytes % 256;
    if (offset !== 0) rowBytes = rowBytes - offset + 256;

    this.pickBuffer = this.gpu.device.createBuffer({
      label: 'pickBuffer',
      size: rowBytes * height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
  }

  doPick(mesh: boolean, mouse_x: number, mouse_y: number) {
    const encoder = this.gpu.device.createCommandEncoder({
      label: 'pickPosition_encoder',
    });
    let newOffset =
      mouse_y * this.#rowBytes +
      mouse_x *
        this.gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId
          .renderTarget.texture.bytes_per_fixel;
    let newOffsetDepth =
      mouse_y * this.#rowBytesDepth +
      mouse_x * this.depthRenderTarget.renderTarget.texture.bytes_per_fixel;

    //For MapAsync
    const missOffset = newOffset % 8;
    if (missOffset !== 0) {
      newOffset = newOffset - missOffset;
    }
    const missOffsetDepth = newOffsetDepth % 8;
    if (missOffsetDepth !== 0) {
      newOffsetDepth = newOffsetDepth - missOffsetDepth;
    }
    //The entire subresource must be copied when the format (TextureFormat::Depth32Float) is a depth/stencil format or the sample count (1) is > 1.
    encoder.copyTextureToBuffer(
      {
        aspect: 'depth-only',
        origin: {
          x: 0,
          y: 0,
          z: 0,
        },
        texture: this.depthRenderTarget.renderTarget.texture.texture,
      },
      {
        buffer: this.pickBuffer,
        bytesPerRow:
          this.size.width *
          this.depthRenderTarget.renderTarget.texture.bytes_per_fixel,
        offset: 0,
      },
      [this.size.width, this.size.height],
    );
    if (mesh) {
      encoder.copyTextureToBuffer(
        {
          origin: {
            x: mouse_x,
            y: mouse_y,
            z: 0,
          },
          texture:
            this.gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId
              .renderTarget.texture.texture,
        },
        {
          buffer: this.pickBuffer,
          bytesPerRow: 256,
          offset: newOffsetDepth + 8 + 32,
        },
        [1, 1, 1],
      );
    }
    const gpu = this.depthRenderTarget.renderTarget.texture.props.gpu;
    gpu.queue.submit([encoder.finish()]);
    if (!this.zAndIDPromise) {
      this.zAndIDPromise = this.pickBuffer
        .mapAsync(GPUMapMode.READ, newOffsetDepth, 8 + 32 + 16)
        .then(() => {
          const b = this.pickBuffer.getMappedRange(newOffsetDepth, 8 + 32 + 16);
          const z = new DataView(b).getFloat32(missOffsetDepth, true);
          let meshId = 0;
          if (mesh) {
            meshId = new DataView(b).getUint32(8 + 32, true);
          }
          this.zAndIDPromise = null;
          const generation = new DataView(b).getUint32(8 + 32 + 4, true);
          this.pickBuffer.unmap();
          return [z, meshId, generation];
        });
    }
    return this.zAndIDPromise;
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

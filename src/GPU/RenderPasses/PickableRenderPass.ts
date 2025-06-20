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
import { Externref } from 'externref.js';
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
  #rowBytes: number;
  #rowBytesDepth: number;

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
    let rowBytes =
      renderPassProps.size.width *
      gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId.renderTarget
        .texture.bytes_per_fixel;

    const offset = rowBytes % 256;
    if (offset !== 0) rowBytes = rowBytes - offset + 256;

    super(renderPassProps, depthRenderTarget, gpu, {
      label: 'pickBuffer',
      size: rowBytes * renderPassProps.size.height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    this.#rowBytes = rowBytes;
    this.#rowBytesDepth =
      this.size.width *
      this.gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId
        .renderTarget.texture.bytes_per_fixel;
  }
  createPickBuffer(gpu: GPU) {
    let rowBytes =
      this.size.width *
      gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId.renderTarget
        .texture.bytes_per_fixel;

    const offset = rowBytes % 256;
    if (offset !== 0) rowBytes = rowBytes - offset + 256;

    return gpu.device.createBuffer({
      label: 'pickBuffer',
      size: rowBytes * this.size.height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
  }
  override resize(
    width: number,
    height: number,
    computepass: rust_pointer<'computepass'>,
    cameragroups: rust_pointer<'cameragroups'>,
    cameras: rust_pointer<'cameras'>,
    device: Externref<false, GPUDevice>,
  ) {
    super.resize(width, height, computepass, cameragroups, cameras, device);
    //update picking
    const oldpickBuffer = this.pickBuffer;
    if (oldpickBuffer) {
      setTimeout(() => {
        oldpickBuffer.destroy();
      }, 1000);
    }
    this.#rowBytes =
      this.size.width *
      this.gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId
        .renderTarget.texture.bytes_per_fixel;
    this.#rowBytesDepth =
      this.size.width *
      this.gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId
        .renderTarget.texture.bytes_per_fixel;

    this.pickBuffer = this.createPickBuffer(this.gpu);
  }

  doPick(encoder: GPUCommandEncoder, mesh: boolean) {
    let newOffset =
      this.gpu.mousePosition[1] * this.#rowBytes +
      this.gpu.mousePosition[0] *
        this.gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId
          .renderTarget.texture.bytes_per_fixel;
    let newOffsetDepth =
      this.gpu.mousePosition[1] * this.#rowBytesDepth +
      this.gpu.mousePosition[0] *
        this.depthRenderTarget.renderTarget.texture.bytes_per_fixel;

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
            x: engine.gpu!.mousePosition[0],
            y: this.gpu.mousePosition[1],
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
            this.pickPromiseMesh = null;
            meshId = new DataView(b).getUint32(8 + 32, true);
          } else this.pickPromise = null;
          this.zAndIDPromise = null;
          const generation = new DataView(b).getUint32(8 + 32 + 4, true);
          this.pickBuffer.unmap();
          console.log(meshId, generation);
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

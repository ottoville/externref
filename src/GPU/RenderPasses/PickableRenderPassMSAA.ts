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

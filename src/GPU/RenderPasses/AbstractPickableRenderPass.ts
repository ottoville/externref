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
import { MutableTerraVector3, TerraMatrix } from '../../Math.js';
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
  abstract doPick(
    encoder: GPUCommandEncoder,
    mesh: boolean,
  ): Promise<[z: number, id: number, generation: number]>;
  pickPromise: Promise<{
    position: readonly [number, number, number];
  } | null> | null = null;
  pickPromiseMesh: Promise<{
    position: readonly [number, number, number];
    meshId: number;
  } | null> | null = null;
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

    this.pickBuffer = gpu.device.createBuffer(pickBufferDesc);
  }
  pickPosition(): Promise<{
    position: readonly [number, number, number];
  } | null>;
  pickPosition(mesh: true): Promise<{
    position: readonly [number, number, number];
    meshId: number;
    generation: number;
  } | null>;
  pickPosition(
    mesh = false,
  ): Promise<
    | { position: readonly [number, number, number] }
    | { position: readonly [number, number, number]; meshId: number }
    | null
  > {
    //HOX! remember to remove, debugging only
    mesh = true;
    if (mesh && this.pickPromiseMesh) {
      return this.pickPromiseMesh;
    } else if (!mesh && this.pickPromise) {
      return this.pickPromise;
    }
    const camera = this.perspectiveCameras[0];
    if (!camera) {
      throw new Error('There are no perspective cameras on this renderpass');
    }
    const gpu = this.depthRenderTarget.renderTarget.texture.props.gpu;
    const encoder = gpu.createCommandEncoder({
      label: 'pickPosition_encoder',
    });

    const promise = this.doPick(encoder, mesh).then((zAndID) => {
      if (zAndID[0] === 0) {
        // Z is 0 when did not hit anything, far plane value
        this.pickPromise = null;
        this.pickPromiseMesh = null;
        return null;
      }
      const result: [number, number, number] = [0, 0, 0];
      const x = (engine.gpu!.mousePosition[0] / this.size.width) * 2 - 1;
      const y = -((engine.gpu!.mousePosition[1] / this.size.height) * 2 - 1);
      const gpulock = engine.rust.get_gpu();
      const cameralock = engine.rust.get_camera_by_id_mut(gpulock, camera.id);
      const projectionViewInverted = new TerraMatrix(
        engine.rust.memory.buffer,
        engine.rust.get_camera_projection_inverted_ptr(cameralock),
      );
      new MutableTerraVector3([x, y, zAndID[0]]).multiply2Ref(
        projectionViewInverted,
        result,
      );
      engine.rust.drop_camera_lock(cameralock);
      engine.rust.drop_gpu_lock(gpulock);
      if (mesh) {
        this.pickPromiseMesh = null;
        return {
          generation: zAndID[2],
          meshId: zAndID[1],
          position: result,
        };
      } else this.pickPromise = null;
      return {
        position: result,
      };
    });
    //Calculate inverted matrix while buffer is mapping
    camera.update_camera_projection_view_inverted();
    if (mesh) {
      this.pickPromiseMesh = promise as Promise<{
        position: readonly [number, number, number];
        meshId: number;
      }>;
      return this.pickPromiseMesh;
    } else {
      this.pickPromise = promise;
      return this.pickPromise;
    }
  }
}

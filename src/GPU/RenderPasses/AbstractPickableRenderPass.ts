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
    mesh: boolean,
    x: number,
    y: number,
  ): Promise<[z: number, id: number, generation: number]> | null;
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
  } | null> | null;
  pickPosition(mesh: true): Promise<{
    position: readonly [number, number, number];
    meshId: number;
    generation: number;
  } | null> | null;
  pickPosition(
    mesh = false,
  ): Promise<
    | { position: readonly [number, number, number] }
    | { position: readonly [number, number, number]; meshId: number }
    | null
  > | null {
    if (mesh && this.pickPromiseMesh) {
      return this.pickPromiseMesh;
    } else if (!mesh && this.pickPromise) {
      return this.pickPromise;
    }
    const mouse_position = engine.rust.get_mouse_position(engine.gpu!.gpu);
    const mouse_x = mouse_position & 0xffff;
    const mouse_y = mouse_position >> 16;
    const pickPromise = this.doPick(mesh, mouse_x, mouse_y);
    if (pickPromise === null) {
      return null;
    }
    const promise = pickPromise.then((zAndID) => {
      if (zAndID[0] === 0) {
        // Z is 0 when did not hit anything, far plane value
        this.pickPromise = null;
        this.pickPromiseMesh = null;
        return null;
      }
      const ptr = engine.rust.pick_position(
        this.props.id,
        mouse_x,
        mouse_y,
        zAndID[0],
        engine.gpu!.gpu,
      );
      const position = [
        ...new Float32Array(engine.rust.memory.buffer, ptr, 3),
      ] as [number, number, number];
      if (mesh) {
        this.pickPromiseMesh = null;
        return {
          generation: zAndID[2],
          meshId: zAndID[1],
          position,
        };
      } else this.pickPromise = null;
      return {
        position,
      };
    });
    const camera = this.perspectiveCameras[0];
    if (!camera) {
      throw new Error('There are no perspective cameras on this renderpass');
    }
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

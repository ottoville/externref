import type {
  IRenderBundleEncoder,
  Renderpass,
  RenderPipelineLayout,
} from './webgpu-ts';
import { TerraCamera } from './TerraCamera.js';
import type { Engine } from './engine.js';
import type { GPU } from './GPU.js';

declare const engine: Engine;

export class CameraGroup {
  readonly #rootLayout: RenderPipelineLayout;
  readonly perspectiveCameras: TerraCamera[] = [];
  constructor(rootLayout: RenderPipelineLayout) {
    this.#rootLayout = rootLayout;
  }
  render(
    gpu: GPU,
    rust_renderbundle: rust_pointer<'renderbundleencoder'>,
    renderBundle2: IRenderBundleEncoder,
    renderpass: Renderpass,
  ) {
    let drawedMeshes = 0;
    this.perspectiveCameras.forEach((camera) => {
      engine.rust.renderbundle_set_bindgroup(
        rust_renderbundle,
        1,
        gpu.gpu_lock!,
        camera.id,
      );
      drawedMeshes += this.#rootLayout.render(renderBundle2, renderpass, 2);
    });
  }
}

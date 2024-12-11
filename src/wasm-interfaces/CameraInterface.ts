import type { TerraCamera, VIEW_UPDATED } from 'TerraCamera.js';
import { Rust_Iterator } from 'utils';

export const CameraInterface = {
  get_update_view_bindgroup(camera: TerraCamera) {
    return camera.updateViewBindGroup!;
  },
  update_view(
    camera: TerraCamera,
    commandEncoder: GPUCommandEncoder,
    child_iterator: Rust_Iterator<TerraCamera>,
    direction_ptr: rust_pointer<'direction'>,
    position_ptr: rust_pointer<'position'>,
    doUpdateView: VIEW_UPDATED,
  ) {
    return camera.updateView(
      commandEncoder,
      child_iterator,
      direction_ptr,
      position_ptr,
      doUpdateView,
    );
  },
};

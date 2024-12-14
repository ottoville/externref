import type { TerraCamera } from 'TerraCamera.js';

export const CameraInterface = {
  get_update_view_bindgroup(camera: TerraCamera) {
    return camera.updateViewBindGroup!;
  },
  on_update_position(camera: TerraCamera) {
    return camera.onUpdatePosition.forEach((cb) => cb());
  },
  update_view(
    camera: TerraCamera,
    commandEncoder: GPUCommandEncoder,
    view_ptr: rust_pointer<'matrix'>,
    projection_ptr: rust_pointer<'matrix'>,
  ) {
    return camera.updateView(commandEncoder, view_ptr, projection_ptr);
  },
};

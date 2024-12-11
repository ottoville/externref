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
    direction_ptr: rust_pointer<'direction'>,
    position_ptr: rust_pointer<'position'>,
  ) {
    return camera.updateView(commandEncoder, direction_ptr, position_ptr);
  },
};

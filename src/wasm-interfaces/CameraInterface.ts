import type { TerraCamera } from 'TerraCamera.js';

export const CameraInterface = {
  get_update_view_bindgroup(camera: TerraCamera) {
    return camera.updateViewBindGroup!;
  },
  update_view(camera: TerraCamera, commandEncoder: GPUCommandEncoder) {
    return camera.updateView(commandEncoder);
  },
};

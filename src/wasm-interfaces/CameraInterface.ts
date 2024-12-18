import type { TerraCamera } from 'TerraCamera.js';

export const CameraInterface = {
  get_update_view_bindgroup(camera: TerraCamera) {
    return camera.updateViewBindGroup!;
  },
  on_update_position(camera: TerraCamera) {
    return camera.onUpdatePosition.forEach((cb) => cb());
  },
};

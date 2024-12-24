import type { TerraCamera } from 'TerraCamera.js';

export const CameraInterface = {
  on_update_position(camera: TerraCamera, x: number, y: number, z: number) {
    return camera.onUpdatePosition.forEach((cb) => cb(x, y, z));
  },
};

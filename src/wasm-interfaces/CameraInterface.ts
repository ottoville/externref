import { TerraCamera } from '../TerraCamera.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export const CameraInterface = {
  create_camera(id: rust_pointer<'camera'>, maincamera: boolean): TerraCamera {
    const camera = new TerraCamera([], id);
    if (maincamera) {
      queueMicrotask(() => {
        engine.gpu!.mainCamera = camera;
      });
    }
    return camera;
  },
  on_update_position(camera: TerraCamera, x: number, y: number, z: number) {
    return camera.onUpdatePosition.forEach((cb) => cb(x, y, z));
  },
};

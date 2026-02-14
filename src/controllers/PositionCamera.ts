import type { Engine } from '../engine.js';
import type { TerraCamera } from '../TerraCamera.js';
import { CameraController } from './CameraController.js';

declare const engine: Engine;

/**
    This camera is used for camera that can be moved with keyboard
    without being attached to any mesh
*/
export class PositionCamera extends CameraController {
  name = 'PositionCamera';
  id: rust_pointer<'positioncamera'>;

  constructor(camera: TerraCamera, initial = false) {
    super();
    this.id = engine.rust.new_position_camera(initial, camera.id);
  }
  attachCameraController() {}
  deAttachCameraController() {}
  serialize = () => {
    engine.rust.serialize_positioncamera(this.id);
  };
}

import type { TerraCamera } from '../TerraCamera.js';
export const enum ARROW_KEYS {
  UP = 1,
  RIGHT = 2,
  DOWN = 4,
  LEFT = 8,
  UP_RIGHT = ARROW_KEYS.UP | ARROW_KEYS.RIGHT,
  UP_LEFT = ARROW_KEYS.UP | ARROW_KEYS.LEFT,
  DOWN_RIGHT = ARROW_KEYS.DOWN | ARROW_KEYS.RIGHT,
  DOWN_LEFT = ARROW_KEYS.DOWN | ARROW_KEYS.LEFT,
  LEFT_OR_RIGHT = ARROW_KEYS.RIGHT | ARROW_KEYS.LEFT,
  UP_OR_DOWN = ARROW_KEYS.UP | ARROW_KEYS.DOWN,
}
export abstract class CameraController {
  cameraControl?: TerraCamera;
  abstract readonly name: string;
  abstract serialize(): void;

  abstract attachCameraController(): void;
  abstract deAttachCameraController(): void;
  abstract checkInputs(force_recalculate?: boolean): void;
}

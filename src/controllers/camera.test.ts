//import  { PositionCamera } from './positionCamera'
import { ArcRotateCamera } from "./ArcRotateCamera.js";
import { PositionCamera } from "./positionCamera.js";
import type { Engine } from "../engine.js";
declare const engine: Engine;

type assertionType = typeof assert;
export const run = async (assert: assertionType) => {
  engine.mainCamera.position = [100, 100, 100]
  const originalPosition = new Float32Array(engine.mainCamera.position as [number, number, number])
  const originalDirection = new Float32Array(engine.mainCamera.direction as [number, number, number])
  const cameraControllers=[ArcRotateCamera, PositionCamera];

  for(let i=0;i<cameraControllers.length;i++) {
    const controller = new cameraControllers[i](engine.mainCamera);
    await controller.calculateCameraPositionAndTarget();
    const newPosition = new Float32Array(engine.mainCamera.position as [number, number, number])
    const newDirection = new Float32Array(engine.mainCamera.direction as [number, number, number])

    describe('Camera controller '+cameraControllers[i].name, function () {
      it('position should be same', async function () {
          assert.strictEqual(originalPosition[0], newPosition[0])
          assert.strictEqual(originalPosition[1], newPosition[1])
          assert.strictEqual(originalPosition[2], newPosition[2])
      });
      it('direction should be same', function () {
        assert.strictEqual(originalDirection[0], newDirection[0])
        assert.strictEqual(originalDirection[1], newDirection[1])
        assert.strictEqual(originalDirection[2], newDirection[2])
      })
    })
  }
}
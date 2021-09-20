//import  { PositionCamera } from './positionCamera'
import { ArcRotateCamera } from "./ArcRotateCamera.js";
import type { Engine } from "../engine.js";
declare const engine: Engine;

type assertionType = typeof assert;
export const run = async (assert: assertionType) => {
  describe('Camera', function () {
    it('position should be same', async function () {
      engine.mainCamera.position = [100, 100, 100]
      const originalPosition = new Float32Array(engine.mainCamera.position as [number, number, number])
      const originalDirection = new Float32Array(engine.mainCamera.direction as [number, number, number])
      const archCamera = new ArcRotateCamera(engine.mainCamera)
      await archCamera.calculateCameraPositionAndTarget();

      const newPosition = new Float32Array(engine.mainCamera.position as [number, number, number])
      const newDirection = new Float32Array(engine.mainCamera.direction as [number, number, number])
      assert.strictEqual(originalPosition[0], newPosition[0])
      assert.strictEqual(originalPosition[1], newPosition[1])
      assert.strictEqual(originalPosition[2], newPosition[2])

    });
  });
}
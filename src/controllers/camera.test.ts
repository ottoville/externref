//import  { PositionCamera } from './positionCamera'
import { ArcRotateCamera } from "./ArcRotateCamera.js";
import { PositionCamera } from "./positionCamera.js";
import type { Engine } from "../engine.js";
declare const engine: Engine;

type assertionType = typeof assert;
export const run = (assert: assertionType) => {
  engine.mainCamera.position = [100, 100, 100]
  const originalPosition = new Float32Array(engine.mainCamera.position as [number, number, number])
  const originalDirection = new Float32Array(engine.mainCamera.direction as [number, number, number])
  const cameraControllers=[ArcRotateCamera, PositionCamera];

  for(let i=0;i<cameraControllers.length;i++) {
    const controller = new cameraControllers[i](engine.mainCamera);
    controller.calculateCameraPositionAndTarget();
    const newPosition = new Float32Array(engine.mainCamera.position as [number, number, number])
    const newDirection = new Float32Array(engine.mainCamera.direction as [number, number, number])

    describe('Camera controller '+cameraControllers[i].name, function () {
      it('position should be same', function () {
          assert.strictEqual(originalPosition[0].toFixed(6), newPosition[0].toFixed(6))
          assert.strictEqual(originalPosition[1].toFixed(6), newPosition[1].toFixed(6))
          assert.strictEqual(originalPosition[2].toFixed(6), newPosition[2].toFixed(6))
      });
      it('direction should be same', function () {
        assert.strictEqual(originalDirection[0].toFixed(6), newDirection[0].toFixed(6))
        assert.strictEqual(originalDirection[1].toFixed(6), newDirection[1].toFixed(6))
        assert.strictEqual(originalDirection[2].toFixed(6), newDirection[2].toFixed(6))
      })
    })
  }
}
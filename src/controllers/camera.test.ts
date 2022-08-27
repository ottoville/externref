import { describe, beforeAll, it, expect } from '@jest/globals'
import { ArcRotateCamera } from "./ArcRotateCamera.js";
import { PositionCamera } from "./positionCamera.js";
import { Engine } from "../engine.js";
import fs from 'fs';

describe(
  'Camera controllers',
  () => {
    let engine: Engine | void;
    let originalPosition: Float32Array;
    let originalDirection: Float32Array;
    let cameraControllers: [typeof ArcRotateCamera, typeof PositionCamera];

    beforeAll(async () => {
      engine = await Engine.initEngine(undefined, (e) => {
        console.log('error', e.message);
      }, {
        rust: fs.readFileSync('../node/wasm32-unknown-unknown/debug/engine.wasm'),
        collider: fs.readFileSync('../wwwroot/collider/colliderSimdO.wasm')
      });
      //@ts-expect-error
      const control=engine!.mainCamera.attachControllerForCamera({
        attachCameraController:() => undefined,
        deAttachCameraController:() => undefined
              });
      control.updatePosition(position => position.set([100, 100, 100]));
      originalPosition = new Float32Array(engine!.mainCamera!.position as [number, number, number])
      originalDirection = new Float32Array(engine!.mainCamera!.direction as [number, number, number])
      cameraControllers = [ArcRotateCamera, PositionCamera];
    }, 10000);

    it('should load without error', () => {
      expect(engine).not.toBeFalsy();
    });
    it('position should be same', function () {
      for (let i = 0; i < cameraControllers!.length; i++) {
        const controller = new cameraControllers![i](engine!.mainCamera!);
        engine!.mainCamera!.attachControllerForCamera(controller);

        controller.calculateCameraPositionAndTarget();
        const newPosition = new Float32Array(engine!.mainCamera!.position as [number, number, number])
        const newDirection = new Float32Array(engine!.mainCamera!.direction as [number, number, number])
        expect(originalPosition[0].toFixed(6)).toBe(newPosition[0].toFixed(6));
        expect(originalPosition[1].toFixed(6)).toBe(newPosition[1].toFixed(6));
        expect(originalPosition[2].toFixed(6)).toBe(newPosition[2].toFixed(6));
        expect(originalDirection[0].toFixed(6)).toBe(newDirection[0].toFixed(6));
        expect(originalDirection[1].toFixed(6)).toBe(newDirection[1].toFixed(6));
        expect(originalDirection[2].toFixed(6)).toBe(newDirection[2].toFixed(6));
      }
    })
  });
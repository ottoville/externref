import { useEffect, useState } from 'react';
import type { TerraCamera } from '../../TerraCamera.js';
import type { Engine } from '../../engine.js';
import { PositionCamera } from '../../controllers/PositionCamera.js';
import type { CameraController } from '../../controllers/CameraController.js';
declare const engine: Engine;
function Camera(props: { camera: TerraCamera }) {
  const [cameraPosition, setCameraPosition] = useState<
    readonly [number, number, number]
  >([0, 0, 0]);
  useEffect(() => {
    const listener = (x: number, y: number, z: number) => {
      setCameraPosition([x, y, z] as const);
    };
    props.camera.onUpdatePosition.add(listener);
    const gpulock = engine.rust.get_gpu();
    const cameralock = engine.rust.get_camera(gpulock, props.camera.id);

    const position = new Float32Array(
      engine.rust.memory.buffer,
      engine.rust.get_camera_position_ptr(cameralock),
      3,
    ) as unknown as readonly [number, number, number];

    listener(...position);
    engine.rust.drop_camera_lock(cameralock);
    engine.rust.drop_gpu_lock(gpulock);

    return () => {
      props.camera.onUpdatePosition.delete(listener);
    };
  }, [props.camera]);
  return (
    <li>
      <>
        {props.camera.label}
        <br />
        X: {cameraPosition[0].toFixed(5)} Y: {cameraPosition[1].toFixed(5)} Z:{' '}
        {cameraPosition[2].toFixed(5)}
      </>
    </li>
  );
}
let oldController: CameraController | null = null;
export function Cameras() {
  const [debugCamera, setDebugCamera] = useState(false);
  const cameras = new Array(engine.rust.get_cameras_count())
    .fill(0)
    .map((_v, camera_id) => {
      const gpu_lock = engine.rust.get_gpu();
      const camera_index = engine.rust.get_camera_externref(
        gpu_lock,
        camera_id,
      );
      engine.rust.drop_gpu_lock(gpu_lock);
      const camera = engine.rust.externrefs.get(camera_index) as TerraCamera;

      return <Camera key={camera.label} camera={camera}></Camera>;
    });

  return (
    <fieldset>
      <legend>Cameras</legend>
      <ul>{cameras}</ul>
      {debugCamera ? (
        <>
          <button
            type="button"
            onClick={() => {
              if (oldController) {
                setDebugCamera(false);
                engine.gpu!.mainCamera.attachControllerForCamera(oldController);
              }
            }}
          >
            Remove debug camera
          </button>
          <br />
          Move: Arrow keys
          <br />
          Rotate: Ctrl + arrow keys
          <br />
          Elevate/Lower: PgUp/PgDown
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDebugCamera(true);
            oldController = engine.inputManager;
            const positionCamera = new PositionCamera(
              engine.gpu!.mainCamera,
              true,
            );
            engine.gpu!.mainCamera.attachControllerForCamera(positionCamera);
          }}
        >
          Switch to debug camera
        </button>
      )}
    </fieldset>
  );
}

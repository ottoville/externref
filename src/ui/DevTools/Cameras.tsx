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
    const listener = () => {
      setCameraPosition([...props.camera.position] as unknown as readonly [
        number,
        number,
        number,
      ]);
    };
    props.camera.onUpdatePosition.add(listener);
    listener();
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
  return (
    <fieldset>
      <legend>Cameras</legend>
      <ul>
        {new Array(engine.rust.get_cameras_count())
          .fill(0)
          .map((_v, camera_id) => {
            const camera = engine.rust.get_camera_externref(camera_id);
            return <Camera key={camera.label} camera={camera}></Camera>;
          })}
      </ul>
      {debugCamera ? (
        <>
          <button
            type="button"
            onClick={() => {
              if (oldController) {
                setDebugCamera(false);
                engine.mainCamera.attachControllerForCamera(oldController);
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
            const positionCamera = new PositionCamera(engine.mainCamera, true);
            engine.mainCamera.attachControllerForCamera(positionCamera);
          }}
        >
          Switch to debug camera
        </button>
      )}
    </fieldset>
  );
}

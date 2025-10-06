import { useEffect, useState } from 'react';
import type { TerraCamera } from '../../TerraCamera.js';
import type { Engine } from '../../engine.js';
import { PositionCamera } from '../../controllers/PositionCamera.js';
import { stringFromPtr } from '../../utils.js';
import { ArcRotateCamera } from '../../controllers/ArcRotateCamera.js';
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
    const cameralock = engine.rust.get_camera_by_id_mut(
      engine.gpu!.gpu,
      props.camera.id,
    );

    const position = new Float32Array(
      engine.rust.memory.buffer,
      engine.rust.get_camera_position_ptr(cameralock),
      3,
    ) as unknown as readonly [number, number, number];

    listener(...position);
    engine.rust.drop_camera_lock(cameralock);

    return () => {
      props.camera.onUpdatePosition.delete(listener);
    };
  }, [props.camera]);
  const label = stringFromPtr(
    engine.rust.memory,
    engine.rust.get_camera_label(props.camera.id, engine.gpu!.gpu),
  );
  return (
    <li>
      <>
        {label}
        <br />
        X: {cameraPosition[0].toFixed(5)} Y: {cameraPosition[1].toFixed(5)} Z:{' '}
        {cameraPosition[2].toFixed(5)}
      </>
    </li>
  );
}
export function Cameras() {
  const [debugCamera, setDebugCamera] = useState(false);
  const cameras = new Array(engine.rust.get_cameras_count())
    .fill(0)
    .map((_v, camera_id) => {
      const camera_index = engine.rust.get_camera_externref(
        camera_id,
        engine.gpu!.gpu,
      );
      const camera = engine.rust.externrefs.get(camera_index) as TerraCamera;

      return <Camera key={camera.id} camera={camera}></Camera>;
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
              setDebugCamera(false);
              engine.gpu!.mainCamera.attachControllerForCamera(
                new ArcRotateCamera(engine.gpu!.mainCamera, true),
                engine.gpu!.gpu,
              );
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
            engine.gpu!.mainCamera.attachControllerForCamera(
              new PositionCamera(engine.gpu!.mainCamera, true),
              engine.gpu!.gpu,
            );
          }}
        >
          Switch to debug camera
        </button>
      )}
    </fieldset>
  );
}

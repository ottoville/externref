import { useEffect, useState } from "react"
import type { TerraCamera } from "../../TerraCamera.js";
import type { Engine } from "../../engine.js";
declare const engine: Engine;
function Camera(props: { camera: TerraCamera }) {
    const [cameraPosition, setCameraPosition] = useState<readonly [number, number, number]>([0,0,0]);
    useEffect(() => {
        const listener = () => {
            setCameraPosition([...props.camera.position] as unknown as readonly [number, number, number])
        }
        props.camera.onUpdatePosition.add(listener);
        listener();
        return () => {
            props.camera.onUpdatePosition.delete(listener)
        }
    }, [props.camera]);
    return <li>
        <>
            {props.camera.label}
            <br />
            X: {cameraPosition[0].toFixed(5)} Y: {cameraPosition[1].toFixed(5)} Z: {cameraPosition[2].toFixed(5)}
        </>
    </li>
}
export function Cameras() {

    return <fieldset>
        <legend>Cameras</legend>
        <ul>
            {[...engine.cameras].map(camera => {
                return <Camera key={camera.label} camera={camera}></Camera>
            })}
        </ul>
    </fieldset>
}
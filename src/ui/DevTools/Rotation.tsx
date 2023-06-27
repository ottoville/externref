import { MainNode } from '../../MainNode.js';
import { ReadOnlyTerraVector3 } from '../../Math.js';
import { useEffect, useRef } from 'react';

export function Rotation({ node }: { node: MainNode }) {
    const rotationX = useRef<HTMLInputElement>(null)
    const rotationY = useRef<HTMLInputElement>(null)
    const rotationZ = useRef<HTMLInputElement>(null);
    /**
     * Rotation that is not set manually in devtools
     */
    const rotation = useRef(new ReadOnlyTerraVector3())
    const rotatedManually = useRef(false);

    const changeRotation = () => {
        if (rotationX.current && rotationY.current && rotationZ.current) {
            rotatedManually.current = true;
            node.euler_angles = [rotationX.current.valueAsNumber, rotationY.current.valueAsNumber, rotationZ.current.valueAsNumber];
        }
    }

    useEffect(() => {
        const listener = () => {
            if (!rotatedManually.current) {
                rotation.current = node.euler_angles
                if (rotationX.current)
                    rotationX.current.value = rotation.current[0].toString();
                if (rotationY.current)
                    rotationY.current.value = rotation.current[1].toString();
                if (rotationZ.current)
                    rotationZ.current.value = rotation.current[2].toString();
            } else {
                rotatedManually.current = false;
            }
        };
        node.onMeshChange.add(listener);
        listener();
        return () => {
            node.onMeshChange.delete(listener)
        }
    }, [node]);
    return <fieldset>
        <legend>Rotation</legend>
        <label> X:
            <input style={{ verticalAlign: 'middle' }}
                ref={rotationX}
                onChange={() => {
                    changeRotation();
                }} title="rotation X" type="range" min="-3.14" max="3.14" step="0.01" />
        </label> {rotationX.current && (180 / Math.PI * rotationX.current?.valueAsNumber).toFixed(2)}
        <br />
        <label>Y:
            <input style={{ verticalAlign: 'middle' }}
                ref={rotationY}
                onChange={() => {
                    changeRotation();
                }} title="rotation Y" type="range" min="-3.14" max="3.14" step="0.01" />
            {rotationY.current && (180 / Math.PI * rotationY.current.valueAsNumber).toFixed(2)}
        </label>
        <br />
        <label>Z:
            <input style={{ verticalAlign: 'middle' }}
                ref={rotationZ}
                onChange={() => {
                    changeRotation();
                }} title="rotation Z" type="range" min="-3.14" max="3.14" step="0.01" />
            {rotationZ.current && (180 / Math.PI * rotationZ.current.valueAsNumber).toFixed(2)}
        </label>
    </fieldset>
}
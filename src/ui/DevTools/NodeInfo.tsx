import { DrawableDirect } from "../../GPU/Drawables/DrawableDirect.js";
import type { Drawable } from "../../GPU/Drawables/Drawable.js";
import type { MutableTerraVector3, ReadOnlyTerraVector3 } from "../../Math.js";
import { useEffect, useState } from "react";
import { WireFrameMesh } from "../../GPU/Meshes/helpers/wireframe.js";
import { DataNode } from "../../nodes/DataNode.js";
import { NormalsMesh } from "../../GPU/Meshes/helpers/normals.js";
import { BoundingBoxMesh } from "../../GPU/Meshes/helpers/boundingbox.js";
import { DrawableIndexed } from "../../GPU/Drawables/DrawableIndexed.js";
import { NodeIndexed } from "../../nodes/NodeIndexed.js";
import type { MainNode } from "../../MainNode.js";

export function NodeInfo({ drawable }: { drawable: Drawable }) {
    const [translation, setTranslation] = useState<ReadOnlyTerraVector3>();
    const [rotation, setRotation] = useState<MutableTerraVector3>();
    useEffect(() => {
        setTranslation(drawable.node.translation);
        const listener = () => {
            setTranslation(drawable.node.translation);
            setRotation(drawable.node.rotation.toEulerAngles());
        };
        drawable.node.onMeshChange.add(listener);
        listener();
        return () => {
            drawable.node.onMeshChange.delete(listener)
        }
        return;
    }, [drawable])
    return <fieldset>
        <legend>{drawable.node.label}</legend>
        {drawable.renderPipeline.props.label}<br />
        {translation ? <fieldset>
            <legend>Translation</legend>
            <label>X:
                <input onChange={(evt) => {
                    drawable.node.translation = [evt.target.valueAsNumber, drawable.node.translation[1], drawable.node.translation[2]]
                }} title="translation X" type="number" step="1" value={translation[0]} />
            </label><br />
            <label>Y:
                <input onChange={(evt) => {
                    drawable.node.translation = [drawable.node.translation[0], evt.target.valueAsNumber, drawable.node.translation[2]]
                }} title="translation Y" type="number" step="1" value={translation[1]} />
            </label><br />
            <label>Z:
                <input onChange={(evt) => {
                    drawable.node.translation = [drawable.node.translation[0], drawable.node.translation[1], evt.target.valueAsNumber]
                }} title="translation Z" type="number" step="1" value={translation[2]} />
            </label>
        </fieldset> : null}
        {rotation ? <>
            <fieldset>
                <legend>Rotation</legend>
                <label>X: {(180 / Math.PI * rotation[0]).toFixed(2)}<br />
                    <input onChange={(evt) => {
                        drawable.node.update_euler_angles(evt.target.valueAsNumber / 180 * Math.PI, rotation[1], rotation[2])
                    }} title="rotation X" type="range" min="-180" max="180" value={180 / Math.PI * rotation[0]} />
                </label>
                <br />
                <label>Y: {(180 / Math.PI * rotation[1]).toFixed(2)}<br />
                    <input onChange={(evt) => {
                        drawable.node.update_euler_angles(rotation[0], evt.target.valueAsNumber / 180 * Math.PI, rotation[2])
                    }} title="rotation Y" type="range" min="-180" max="180" value={180 / Math.PI * rotation[1]} />
                </label>
                <br />
                <label>Z: {(180 / Math.PI * rotation[2]).toFixed(2)}<br />
                    <input onChange={(evt) => {
                        drawable.node.update_euler_angles(rotation[0], rotation[1], evt.target.valueAsNumber / 180 * Math.PI)
                    }} title="rotation Z" type="range" min="-180" max="180" value={180 / Math.PI * rotation[2]} />
                </label>
            </fieldset>
        </> : null}
        <br />
        {drawable instanceof DrawableDirect ? <>
            Vertices count: {drawable.node.vertices_count}
            <br />
            {drawable.node instanceof NodeIndexed ? `Indices count: ${drawable.node.indices_count}` : ''}
            <br />
            Rigid body: {(drawable.node as MainNode).have_rigid_body ? 'true' : 'false'}
            <br />
            {drawable.node instanceof DataNode ?
                <><button type="button" onClick={() => {
                    new NormalsMesh(drawable)
                }}>Normals</button>
                <button type="button" onClick={() => {
                    new WireFrameMesh(drawable)
                }}>Wireframe</button>
                {drawable instanceof DrawableIndexed ? <button type="button" onClick={() => {
                    new BoundingBoxMesh(drawable)
                }}>Bounding Box</button> : null}  
                </> : null
            }

        </> : ''}
    </fieldset>
}
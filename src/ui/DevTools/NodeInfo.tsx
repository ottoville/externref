import { DrawableDirect } from "../../GPU/Drawables/DrawableDirect.js";
import { MainNode } from "../../MainNode.js";
import type { Drawable } from "../../GPU/Drawables/Drawable.js";
import type { MutableTerraVector3, ReadOnlyTerraVector3 } from "../../Math.js";

import { useEffect, useState } from "react";
import { DataNode } from "../../nodes/DataNode.js";
import { BoundableNodeIndexed } from "../../nodes/BoundableNodeIndexed.js";

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
        {translation ? <>
            Translation: X: {translation[0].toFixed(5)} Y: {translation[1].toFixed(5)} Z: {translation[2].toFixed(5)}  <br />
        </> : null}
        {rotation ? <>
            <fieldset>
                <legend>Rotation</legend>
                <label>X: {(180 / Math.PI * rotation[0]).toFixed(2)}<br />
                    <input onChange={(evt) => {
                        if (drawable instanceof DrawableDirect && drawable.node instanceof MainNode) {
                            drawable.node.update_euler_angles(evt.target.valueAsNumber / 180 * Math.PI, rotation[1], rotation[2])
                        }
                    }} title="rotation X" type="range" min="-180" max="180" value={180 / Math.PI * rotation[0]} />
                </label>
                <br />
                <label>Y: {(180 / Math.PI * rotation[1]).toFixed(2)}<br />
                    <input onChange={(evt) => {
                        if (drawable instanceof DrawableDirect && drawable.node instanceof MainNode) {
                            drawable.node.update_euler_angles(rotation[0], evt.target.valueAsNumber / 180 * Math.PI, rotation[2])
                        }
                    }} title="rotation Y" type="range" min="-180" max="180" value={180 / Math.PI * rotation[1]} />
                </label>
                <br />
                <label>Z: {(180 / Math.PI * rotation[2]).toFixed(2)}<br />
                    <input onChange={(evt) => {
                        if (drawable instanceof DrawableDirect && drawable.node instanceof MainNode) {
                            drawable.node.update_euler_angles(rotation[0], rotation[1], evt.target.valueAsNumber / 180 * Math.PI)
                        }
                    }} title="rotation Z" type="range" min="-180" max="180" value={180 / Math.PI * rotation[2]} />
                </label>
            </fieldset>
        </> : null}
        <br />
        {drawable instanceof DrawableDirect && drawable.node instanceof DataNode ? <>
            Vertices count: {drawable.node.vertices_count}
            <br />
            {drawable.node instanceof BoundableNodeIndexed ? `Indices count: ${drawable.node.indices_count}` : ''}
        </> : ''}
    </fieldset>
}
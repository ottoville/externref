import { DrawableDirect } from "../../GPU/Drawables/DrawableDirect.js";
import { MainNode } from "../../MainNode.js";
import type { Drawable } from "../../GPU/Drawables/Drawable.js";
import { ReadOnlyTerraVector3 } from "../../Math.js";

import { useEffect, useState } from "react";

export function NodeInfo({ drawable }: { drawable: Drawable }) {
    const [translation, setTranslation] = useState<ReadOnlyTerraVector3>();
    useEffect(() => {
        if(drawable instanceof DrawableDirect && drawable.node instanceof MainNode) {
            const node = drawable.node;
            setTranslation(node.translation);
            const listener = () => {
                setTranslation(node.translation);
            };
            node.onMeshChange.add(listener)
            return () => {
                node.onMeshChange.delete(listener)
            }
        }
        return;
    }, [drawable])
    return <fieldset>
        <legend>{drawable.label}</legend>
        {drawable.renderPipeline.props.label}<br />
        {translation ? <>
            Translation: X: {translation[0].toFixed(5)} Y: {translation[1].toFixed(5)} Z: {translation[2].toFixed(5)}
        </> : null}
    </fieldset>
}
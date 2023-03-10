import type { GPU } from "../../GPU.js";

import type { RenderPipeline } from "../../GPU/RenderPipeline.js";
import type { RenderPipelineVariant } from "../../GPU/RenderPasses/RenderPass.js";
import type { Drawable } from "../../GPU/Drawables/Drawable.js";
import { MainNode } from "../../MainNode.js";
import { DrawableDirect } from "../../GPU/Drawables/DrawableDirect.js";

import { createRoot } from 'react-dom/client';
import { useEffect, useState } from "react";

const getPositionBindGroupForScreen = (gpu: GPU) => Array.from(gpu.renderPassScreen.renderPipelines)
    .filter((map): map is [RenderPipeline, RenderPipelineVariant] => (map[0].props.bindgroupdrawable === gpu.positionAndTimeBindGroup && !(map[1] instanceof Promise)))

function VariantList(props: {
    variant: RenderPipelineVariant,
    setSelectedDrawable: React.Dispatch<React.SetStateAction<Drawable | undefined>>

}) {
    const [rootDrawables, setRootDrawables] = useState<Drawable[]>([])
    useEffect(() => {
        setRootDrawables([...props.variant.rootDrawables]);
        props.variant.onRootDrawableChanges.add(() => {
            setRootDrawables([...props.variant.rootDrawables])
        })
    }, [props.variant.rootDrawables])

    return <ul>
        {rootDrawables.map(rd => {
            return <li key={rd.label}>
                <label>
                    <input onChange={() => props.setSelectedDrawable(rd)} type="radio" name="renderpipeline" />
                    {rd.label}
                </label>
            </li>
        })}
    </ul>
}
function NodeInfo({ selectedDrawable }: { selectedDrawable: Drawable }) {
    return <fieldset>
        <legend>{selectedDrawable.label}</legend>
        {selectedDrawable.renderPipeline.props.label}<br />
        {selectedDrawable instanceof DrawableDirect && selectedDrawable.node instanceof MainNode ? <>
            Translation: {selectedDrawable.node.translation.toString()}
        </> : null}
    </fieldset>
}
function Meshes(props: { gpu: GPU }) {
    const [renderPipelines, setRenderPipelines] = useState<ReturnType<typeof getPositionBindGroupForScreen>>([])
    useEffect(() => {
        props.gpu.renderPassScreen.onRenderPipelinesChange.add(() => {
            setRenderPipelines(getPositionBindGroupForScreen(props.gpu))
        })
        setRenderPipelines(getPositionBindGroupForScreen(props.gpu));
    }, [props.gpu]);
    const [selectedDrawable, setSelectedDrawable] = useState<Drawable>()
    console.log('selectedDrawable', selectedDrawable)
    return <fieldset>
        <legend>Rendered meshes</legend>
        <ul>
            {renderPipelines.map(([rp, variant]) => {
                return <li key={rp.props.label}>
                    Renderpipeline<br />
                    <small>{rp.props.label}</small>
                    <VariantList variant={variant} setSelectedDrawable={setSelectedDrawable}></VariantList>
                </li>

            })}
        </ul>
        {selectedDrawable ?
            <NodeInfo selectedDrawable = { selectedDrawable }></NodeInfo>
            : null}
    </fieldset>
}
export const DevToolsApp = (container: HTMLElement, gpu: GPU) => {
    const root = createRoot(container);
    container.style.display = 'block';
    root.render(
        <div id="DevToolsAppContainer">
            <button type="button" onClick={() => {
                root.unmount();
                container.style.display = 'none';
            }}>Close</button>

            <Meshes gpu={gpu}></Meshes>

        </div>)
}
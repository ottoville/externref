import type { GPU } from "../../GPU.js";

import type { RenderPipeline } from "../../GPU/RenderPipeline.js";
import type { RenderPipelineVariant } from "../../GPU/RenderPasses/RenderPass.js";
import type { Drawable } from "../../GPU/Drawables/Drawable.js";

import { useEffect, useState } from "react";
import { VariantList } from "./VariantList.js";
import { NodeInfo } from "./NodeInfo.js";

const getPositionBindGroupForScreen = (gpu: GPU) => Array.from(gpu.renderPassScreen.renderPipelines)
    .filter((map): map is [RenderPipeline, RenderPipelineVariant] => {
        const [renderPipeline, renderPipelineVariant] = map;
        return ((renderPipeline.props.bindgroupdrawable === gpu.positionAndTimeBindGroup || gpu.positionAndTimeBindGroup.subBindGroups.includes(renderPipeline.props.bindgroupdrawable)) && !(renderPipelineVariant instanceof Promise));
    })


export function Meshes(props: { gpu: GPU }) {
    const [renderPipelines, setRenderPipelines] = useState<ReturnType<typeof getPositionBindGroupForScreen>>([])
    useEffect(() => {
        const listener = () => {
            setRenderPipelines(getPositionBindGroupForScreen(props.gpu))
        };
        props.gpu.renderPassScreen.onRenderPipelinesChange.add(listener)
        listener();
        return () => {
            props.gpu.renderPassScreen.onRenderPipelinesChange.delete(listener);
        }
    }, [props.gpu]);
    const [selectedDrawable, setSelectedDrawable] = useState<Drawable>()
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
            <NodeInfo key={selectedDrawable.node.id} drawable = { selectedDrawable }></NodeInfo>
            : null}
    </fieldset>
}
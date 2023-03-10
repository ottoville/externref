import type { GPU } from "../../GPU.js";

import type { RenderPipeline } from "../../GPU/RenderPipeline.js";
import type { RenderPipelineVariant } from "../../GPU/RenderPasses/RenderPass.js";
import type { Drawable } from "../../GPU/Drawables/Drawable.js";
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from "react";

const getPositionBindGroupForScreen = (gpu: GPU) => Array.from(gpu.renderPassScreen.renderPipelines)
    .filter((map): map is [RenderPipeline, RenderPipelineVariant] => (map[0].props.bindgroupdrawable === gpu.positionAndTimeBindGroup && !(map[1] instanceof Promise)))

function VariantList(props: { variant: RenderPipelineVariant }) {
    const [rootDrawables, setRootDrawables] = useState<Drawable[]>([])
    useEffect(() => {
        setRootDrawables([...props.variant.rootDrawables]);
        props.variant.onRootDrawableChanges.add(() => {
            setRootDrawables([...props.variant.rootDrawables])
        })
    }, [props.variant.rootDrawables])

    return <ul>
        {rootDrawables.map(rd => {
            return <li key={rd.label}>{rd.label}</li>
        })}
    </ul>
}

function Meshes(props: { gpu: GPU }) {
    //const [drawables, setDrawables] = useState<(readonly [string, Drawable] | null)[]>([])
    const [renderPipelines, setRenderPipelines] = useState<ReturnType<typeof getPositionBindGroupForScreen>>([])
    useEffect(() => {
        props.gpu.renderPassScreen.onRenderPipelinesChange.add(() => {
            setRenderPipelines(getPositionBindGroupForScreen(props.gpu))
        })
        setRenderPipelines(getPositionBindGroupForScreen(props.gpu));
    }, [props.gpu])
    return <fieldset>
        <legend>Rendered meshes</legend>

        <ul>
            {renderPipelines.map(([rp, variant]) => {
                return <li key={rp.props.label}>{rp.props.label}
                    <VariantList variant={variant}></VariantList>
                </li>

            })}
        </ul>
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
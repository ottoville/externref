import type { GPU } from '../../GPU.js';

import type { RenderPipeline } from '../../GPU/RenderPipeline.js';
import type { RenderPipelineVariant } from '../../GPU/RenderPasses/RenderPass.js';
import type { Drawable } from '../../GPU/Drawables/Drawable.js';

import { useEffect, useState } from 'react';
import { VariantList } from './VariantList.js';
import { NodeInfo } from './NodeInfo.js';
import type { Engine } from '../../engine.js';
declare const engine: Engine;

const getPositionBindGroupForScreen = (gpu: GPU) =>
    Array.from(gpu.renderPassScreen.renderPipelines)
        .filter((map): map is [RenderPipeline, RenderPipelineVariant] => {
            const [
                renderPipeline,
                renderPipelineVariant
            ] = map;
            return ((renderPipeline.props.bindgroupdrawable === gpu.positionAndTimeBindGroup || gpu.positionAndTimeBindGroup.subBindGroups.includes(renderPipeline.props.bindgroupdrawable)) && !(renderPipelineVariant instanceof Promise));
        });

const getUIBindGroupForScreen = (gpu: GPU) =>
    Array.from(gpu.renderPassCanvas.renderPipelines)
        .filter((map): map is [RenderPipeline, RenderPipelineVariant] => {
            const [
                renderPipeline,
                renderPipelineVariant
            ] = map;
            return ((renderPipeline.props.bindgroupdrawable === gpu.canvasRootLayout || renderPipeline.props.bindgroupdrawable === gpu.canvasRootLayoutArray ||
                gpu.canvasRootLayout.subBindGroups.includes(renderPipeline.props.bindgroupdrawable) ||
                gpu.canvasRootLayoutArray.subBindGroups.includes(renderPipeline.props.bindgroupdrawable)
            ) && !(renderPipelineVariant instanceof Promise));
        });
export function Meshes() {
    const [
        renderPipelines,
        setRenderPipelines
    ] = useState<ReturnType<typeof getPositionBindGroupForScreen>>([]);

    const [
        UIrenderPipelines,
        setUIRenderPipelines
    ] = useState<ReturnType<typeof getUIBindGroupForScreen>>([]);

    useEffect(() => {
        let renderPassScreen: GPU['renderPassScreen'] | undefined = undefined;
        let listener: () => void;
        engine.getGPU(gpu => {
            listener = () => {
                setRenderPipelines(getPositionBindGroupForScreen(gpu));
                setUIRenderPipelines(getUIBindGroupForScreen(gpu));
            };
            gpu.renderPassScreen.onRenderPipelinesChange.add(listener);
            renderPassScreen = gpu.renderPassScreen;
            listener();

        });
        return () => {
            renderPassScreen?.onRenderPipelinesChange.delete(listener);
        };
    },
    [engine]);
    const [
        selectedDrawable,
        setSelectedDrawable
    ] = useState<Drawable>();
    return <>
        <fieldset id="meshes">
            <legend>Rendered meshes</legend>
            <ul>
                {renderPipelines.map(([
                    rp,
                    variant
                ]) => {
                    return <li key={rp.props.label}>
                        Renderpipeline<br />
                        <small>{rp.props.label}</small>
                        <VariantList variant={variant} setSelectedDrawable={setSelectedDrawable}></VariantList>
                    </li>;
                })}
            </ul>
        </fieldset>
        <fieldset id="uis">
            <legend>Rendered UI</legend>
            <ul>
                {UIrenderPipelines.map(([
                    rp,
                    variant
                ]) => {
                    return <li key={rp.props.label}>
                        Renderpipeline<br />
                        <small>{rp.props.label}</small>
                        <VariantList variant={variant} setSelectedDrawable={setSelectedDrawable}></VariantList>
                    </li>;
                })}
            </ul>
        </fieldset>
        {selectedDrawable ?
            <NodeInfo key={selectedDrawable.node.id} drawable={selectedDrawable}></NodeInfo>
            : null}
    </>;

}

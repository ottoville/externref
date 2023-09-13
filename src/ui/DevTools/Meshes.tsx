import type { GPU } from '../../GPU.js';

import type { Drawable } from '../../GPU/Drawables/Drawable.js';

import { useEffect, useState } from 'react';
import { VariantList } from './VariantList.js';
import { NodeInfo } from './NodeInfo.js';
import type { Engine } from '../../engine.js';
import { RenderPipeline, RenderPipelineBuilder } from 'webgpu-ts/index.js';
declare const engine: Engine;

const getPositionBindGroupForScreen = (gpu: GPU) =>
  Array.from(gpu.renderPassScreen.renderPipelines).filter(
    (map): map is [RenderPipelineBuilder, RenderPipeline] => {
      const [, renderPipelineVariant] = map;
      return !(renderPipelineVariant instanceof Promise);
    },
  );

const getUIBindGroupForScreen = (gpu: GPU) =>
  Array.from(gpu.renderPassCanvas.renderPipelines).filter(
    (map): map is [RenderPipelineBuilder, RenderPipeline] => {
      const [, renderPipelineVariant] = map;
      return !(renderPipelineVariant instanceof Promise);
    },
  );
export function Meshes() {
  const [renderPipelines, setRenderPipelines] = useState<
    ReturnType<typeof getPositionBindGroupForScreen>
  >([]);

  const [UIrenderPipelines, setUIRenderPipelines] = useState<
    ReturnType<typeof getUIBindGroupForScreen>
  >([]);

  useEffect(() => {
    let renderPassScreen: GPU['renderPassScreen'] | undefined = undefined;
    let listener: () => void;
    engine.getGPU((gpu) => {
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
  }, [engine]);
  const [selectedDrawable, setSelectedDrawable] = useState<Drawable>();
  return (
    <>
      <fieldset id="meshes">
        <legend>Rendered meshes</legend>
        <ul>
          {renderPipelines.map(([, variant]) => {
            return (
              <li key={variant.pipeline.label}>
                Renderpipeline
                <br />
                <small>{variant.pipeline.label}</small>
                <VariantList
                  variant={variant}
                  setSelectedDrawable={setSelectedDrawable}
                ></VariantList>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <fieldset id="uis">
        <legend>Rendered UI</legend>
        <ul>
          {UIrenderPipelines.map(([, variant]) => {
            return (
              <li key={variant.pipeline.label}>
                Renderpipeline
                <br />
                <small>{variant.pipeline.label}</small>
                <VariantList
                  variant={variant}
                  setSelectedDrawable={setSelectedDrawable}
                ></VariantList>
              </li>
            );
          })}
        </ul>
      </fieldset>
      {selectedDrawable ? (
        <NodeInfo
          key={selectedDrawable.node.id}
          drawable={selectedDrawable}
        ></NodeInfo>
      ) : null}
    </>
  );
}

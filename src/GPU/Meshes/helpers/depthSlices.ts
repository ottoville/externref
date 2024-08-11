import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import type { DataNode } from '../../../nodes/DataNode.js';
import type { Engine } from '../../../engine.js';
import type { VertexBufferProps } from 'GPU.js';
import { RenderPipelineProps } from '../../RenderPipeline.js';
import { DrawableIndexed } from '../../Drawables/DrawableIndexed.js';
import type { GPU } from '../../../GPU.js';
import { createDebugDepthSlicesFragShader } from '../../Shaders/devtools/debug_depthSlices.frag.js';

declare const engine: Engine;

const createDepthSlicesFragShader2 = Object.freeze([
  'DepthSlices.frag',
  createDebugDepthSlicesFragShader,
] as const);
export function creatDepthSlices(
  gpu: GPU,
  targetNode: DrawableDirect<DataNode>,
) {
  targetNode.remove();
  const createDepthSlicesVertShader2 = Object.freeze([
    `DepthSlices${targetNode.node.label}.vert`,
    (_gpu: GPU, _vertexBufferProps: VertexBufferProps) => {
      return targetNode.renderPipeline.builder.vertexShader;
    },
  ] as const);
  const depthSlicesPipeline = Object.freeze({
    connections: {
      [gpu.renderPassScreen.entryPoint]: 'debug_depth_slices',
    },
  } as RenderPipelineProps<
    typeof targetNode.renderPipeline.builder.vertexShader,
    ReturnType<typeof createDebugDepthSlicesFragShader>
  >);

  const renderPipeline = gpu.createRenderPipeline(
    depthSlicesPipeline,

    createDepthSlicesVertShader2,
    createDepthSlicesFragShader2,
    {
      stride: targetNode.node.vertices_stride,
    },
  );
  const vertexBuffer = targetNode.vertexBuffers[0]!.buffer;
  targetNode.node.drawable = new DrawableIndexed({
    bindGroups: targetNode.bindGroups.slice(1),
    node: targetNode.node,
    renderPasses: new Set([gpu.renderPassScreen]),
    renderPipeline,
    //@ts-expect-error
    vertexBuffers: [vertexBuffer],
  });
}

import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import type { DataNode } from '../../../nodes/DataNode.js';
import type { VertexBufferProps } from 'GPU.js';
import { DrawableIndexed } from '../../Drawables/DrawableIndexed.js';
import type { GPU } from '../../../GPU.js';
import { createDebugDepthSlicesFragShader } from '../../Shaders/devtools/debug_depthSlices.frag.js';
import { VertexShader, VertexShaderFunction } from 'webgpu-ts/index.js';

export function creatDepthSlices(
  gpu: GPU,
  targetNode: DrawableDirect<DataNode>,
) {
  targetNode.remove();
  const createDepthSlicesVertShader2 = (
    _gpu: GPU,
    _vertexBufferProps: VertexBufferProps,
  ) => {
    return targetNode.renderPipeline.builder.vertexShader as VertexShader<{
      main: VertexShaderFunction;
    }>;
  };
  const depthSlicesPipeline = Object.freeze({
    connections: {
      [gpu.renderPassScreen.entryPoint]: 'debug_depth_slices',
    },
  } as const);
  const renderPipeline = gpu.createRenderPipelineBuilder(
    depthSlicesPipeline,

    createDepthSlicesVertShader2,
    createDebugDepthSlicesFragShader,
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
    vertexBuffers: [vertexBuffer],
  });
}

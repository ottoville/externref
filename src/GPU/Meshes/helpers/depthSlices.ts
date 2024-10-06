import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import type { DataNode } from '../../../nodes/DataNode.js';
import type { VertexBufferProps } from 'GPU.js';
import { DrawableIndexed } from '../../Drawables/DrawableIndexed.js';
import type { GPU } from '../../../GPU.js';
import { createDebugDepthSlicesFragShader } from '../../Shaders/devtools/debug_depthSlices.frag.js';
import { VertexShader, VertexShaderFunction } from 'webgpu-ts/index.js';
import { DrawableSimple } from '../../Drawables/DrawableSimple.js';

export function creatDepthSlices(
  gpu: GPU,
  targetNode: DrawableDirect<DataNode>,
) {
  targetNode.remove();
  const createDepthSlicesVertShader2 = (
    _gpu: GPU,
    _vertexBufferProps: VertexBufferProps,
  ) => {
    return targetNode.renderPipeline.builder.vertexShader as VertexShader<
      {
        // Need to assume main function.
        main: VertexShaderFunction;
      },
      // Need to assume some same layout than createDebugDepthSlicesFragShader
      [typeof gpu.shaders.positionAndTimeBindGroup]
    >;
  };
  const renderPipeline = gpu.createRenderPipelineBuilder(
    {
      connections: {
        [gpu.renderPassScreen.entryPoint]: 'debug_depth_slices',
      },
    },
    createDepthSlicesVertShader2,
    createDebugDepthSlicesFragShader,
    {
      stride: targetNode.node.vertices_stride,
    },
  );
  const vertexBuffer = targetNode.vertexBuffers[0]!.buffer;
  if (targetNode instanceof DrawableIndexed) {
    targetNode.node.drawable = new DrawableIndexed({
      bindGroups: targetNode.bindGroups.slice(1),
      node: targetNode.node,
      renderPasses: new Set([gpu.renderPassScreen]),
      renderPipeline,
      vertexBuffers: [vertexBuffer],
    });
  } else {
    targetNode.node.drawable = new DrawableSimple({
      bindGroups: targetNode.bindGroups.slice(1),
      node: targetNode.node,
      renderPasses: new Set([gpu.renderPassScreen]),
      renderPipeline,
      vertexBuffers: [vertexBuffer],
    });
  }
}

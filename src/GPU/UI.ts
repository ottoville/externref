import { createRenderPipelineBuilder } from '../webgpu-ts/index.js';
import type { GPU } from '../GPU.js';
import { RenderPipelineProps } from './RenderPipeline.js';
import { createUIVertShader, UIVertShader } from './Shaders/UI.vert.js';
import { createUIFragmentShader, UIFragShader } from './Shaders/UI.frag.js';

export function createUI(gpu: GPU) {
  const vertexShader = createUIVertShader(gpu.pipelineLayouts.canvasRootLayout);
  const UIfragmentShader = createUIFragmentShader(gpu);

  return {
    builder: createRenderPipelineBuilder(vertexShader, UIfragmentShader),
    connections: {
      main: 'main',
    },
    label: 'UIRenderPipeline',
    primitive: {
      frontFace: 'ccw',
      topology: 'triangle-list',
    },
  } as RenderPipelineProps<UIVertShader, UIFragShader>;
}

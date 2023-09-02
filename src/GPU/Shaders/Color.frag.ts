// Non pickable single color shader where color is set from vertice
// See Simple.frag.ts for pickable counterpart
// See SingleColor.frag.ts for pickable shared single color for all vertices

import type { BGLayout } from '../../webgpu-ts/BindgroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';
import { FragmentShaderFunction } from './ShaderFunction.js';
import { colorPositionOutput, diffuseOutput } from './structs/Structs.js';

export function createColorFragmentShader<B extends readonly BGLayout[]>(
  pipelineLayout: PipelineLayout<B>,
) {
  return new FragmentShader({
    entryPoints: {
      main: new FragmentShaderFunction(
        diffuseOutput,
        pipelineLayout,
        colorPositionOutput,
        () => /* wgsl */ `
        var output:Output;
        output.Diffuse = vec4<f32>(color,1.0);
        return output;`,
      ),
    },
    gpu: pipelineLayout.gpu,
    label: 'color.frag',
    pipelineLayouts: [pipelineLayout],
  });
}

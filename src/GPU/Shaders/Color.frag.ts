// Non pickable single color shader where color is set from vertice
// See Simple.frag.ts for pickable counterpart
// See SingleColor.frag.ts for pickable shared single color for all vertices

import { BGLayout } from '../BindGroupLayout.js';
import { PipelineLayout } from '../PipelineLayout.js';
import { FragmentShader } from './FragmentShader.js';

export class ColorFragShader<B extends readonly BGLayout[]> extends FragmentShader<
    { main: PipelineLayout }, B> {
    constructor(pipelineLayout: PipelineLayout<B>) {
        super({
            bindGroupLayouts: pipelineLayout.bindGroupLayouts,
            entryPoints: {
                main: pipelineLayout
            }, label: 'Color.frag'
        });
        this.createWGSL(() => {
            return  /* wgsl */ `
      struct Output {
        @location(0) Diffuse : vec4<f32>
      };
      
      @fragment
      fn main(@location(0) color:vec3<f32>) -> Output {
        var output:Output;
        //outColor = vec4<f32>(color,1.0);
      
        output.Diffuse = vec4<f32>(color,1.0);
      
        return output;
      }
        `;
        })
    }
}
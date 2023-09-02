import type { RenderPipelineLayout } from '../PipelineLayout.js';
import { VertexBufferLayout2, VertexShader } from './VertexShader.js';
import { GPU } from '../../GPU.js';
import { MeshUniforms, colorPositionOutput } from './structs/Structs.js';
import { VertexShaderFunction } from './ShaderFunction.js';
import type { BGLayout, BufLayout } from '../../webgpu-ts/BindgroupLayout.js';
import type { ShaderStage } from '../../webgpu-ts/Shader.js';

type BindLayouts = [
  GPU['sizeBindGroupLayout'],
  GPU['uniformBindGroupLayoutWithTime'],
  BGLayout<{
    world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>;
  }>,
];
// eslint-disable-next-line import/no-unused-modules
export class Plane extends VertexShader {
  constructor(
    pipelineLayout: RenderPipelineLayout<BindLayouts>,
    buffers: VertexBufferLayout2,
  ) {
    super({
      entryPoints: {
        main: new VertexShaderFunction(
          colorPositionOutput,
          pipelineLayout,
          [buffers],
          ([
            ,
            /*{uniforms,}*/ {
              scene /*time, clusters_array, meshes, projection*/,
            },
            { world },
          ]) => /* wgsl */ `
                var output:Output;
                var worldPos:vec4<f32> = ${world.prop(
                  'transformation',
                )} * vec4<f32>(position.xyz, 1.0);
                output.Position = ${scene.prop(
                  'modelViewProjection',
                )} * worldPos;
                output.color = vec3<f32>(1.0,1.0,1.0);
                return output;
                `,
        ),
      },
      gpu: pipelineLayout.gpu,
      label: 'plane.vert',
    });
  }
}

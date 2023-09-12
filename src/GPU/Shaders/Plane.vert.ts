import {
  type VertexBufferLayout2,
  VertexShader,
  VertexShaderFunction,
  type ShaderStage,
  type BufLayout,
  type RenderPipelineLayout,
} from '../../webgpu-ts/index.js';
import { GPU } from '../../GPU.js';
import { MeshUniforms, Scene, colorPositionOutput } from './structs/Structs.js';

type BindLayouts = [
  GPU['sizeBindGroupLayout'],
  GPU['uniformBindGroupLayoutWithTime'],
  GPU['BindGroupLayoutPosition'],
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
          [buffers],
          ([
            ,
            /*{uniforms,}*/ {
              scene /*time, clusters_array, meshes, projection*/,
            },
            ,
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
        ) satisfies VertexShaderFunction<
          [
            // eslint-disable-next-line @typescript-eslint/ban-types
            {},
            {
              scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
            },
            // eslint-disable-next-line @typescript-eslint/ban-types
            {},
            {
              world: BufLayout<
                ShaderStage.VERTEX_AND_FRAGMENT,
                typeof MeshUniforms
              >;
            },
          ]
        >,
      },
      label: 'plane.vert',
      pipelineLayouts: [pipelineLayout],
    });
  }
}

import {
  type VertexBufferLayout,
  VertexShader,
  VertexShaderFunction,
  type ShaderStage,
  type BufLayout,
  type RenderPipelineLayout,
  WGSLcode,
} from '../../webgpu-ts/index.js';
import { GPU } from '../../GPU.js';
import { type Scene, colorPositionOutput } from './structs/Structs.js';

type BindLayouts = [
  GPU['shaders']['sizeBindGroupLayout'],
  GPU['shaders']['uniformBindGroupLayoutWithTime'],
  GPU['shaders']['BindGroupLayoutPosition'],
];
export class Plane extends VertexShader {
  constructor(
    pipelineLayout: RenderPipelineLayout<BindLayouts>,
    buffers: VertexBufferLayout,
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
          ]) => WGSLcode/* wgsl */ `
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
            // eslint-disable-next-line @typescript-eslint/no-empty-object-type
            {},
            {
              scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-object-type
            {},
            {
              world: BufLayout<
                ShaderStage.VERTEX_AND_FRAGMENT,
                GPU['meshUniforms']
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

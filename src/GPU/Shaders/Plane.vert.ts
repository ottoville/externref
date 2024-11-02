import {
  VertexShader,
  VertexShaderFunction,
  type ShaderStage,
  type BufLayout,
  type RenderPipelineLayout,
  WGSLcode,
  VertexBufferLayouts,
} from '../../webgpu-ts/index.js';
import { GPU } from '../../GPU.js';
import {
  PositionVertice,
  type Scene,
  colorPositionOutput,
} from './structs/Structs.js';

type BindLayouts = [
  GPU['pipelineLayouts']['sizeBindGroupLayout'],
  GPU['pipelineLayouts']['uniformBindGroupLayoutWithTime'],
  GPU['pipelineLayouts']['BindGroupLayoutPosition'],
];
const buffers = new VertexBufferLayouts([
  {
    stepMode: 'vertex',
    struct: PositionVertice,
  },
]);

export class Plane extends VertexShader {
  constructor(pipelineLayout: RenderPipelineLayout<BindLayouts>) {
    super({
      entryPoints: {
        main: new VertexShaderFunction(
          colorPositionOutput,
          buffers,
          (
            [
              ,
              /*{uniforms,}*/ {
                scene /*time, clusters_array, meshes, projection*/,
              },
              ,
              { world },
            ],
            [{ position }],
          ) => WGSLcode/* wgsl */ `
                var output:Output;
                var worldPos:vec4<f32> = ${world.prop(
                  'transformation',
                )} * ${position};
                output.fragCoord = ${scene.prop(
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

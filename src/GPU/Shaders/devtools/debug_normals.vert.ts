import type { RenderPipelineLayout } from '../../PipelineLayout.js';
import {
  VertexShader,
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
} from '../../../webgpu-ts/index.js';
import { GPU } from '../../../GPU.js';
import {
  MeshUniforms,
  Scene,
  colorPositionOutput,
} from '../structs/Structs.js';
import { simpleAttributes } from '../structs/Attributes.js';

type BindLayouts = GPU['positionAndTimeBindGroup']['bindGroupLayouts'];

export function createDebugNormalsVertShader(
  pipelineLayout: RenderPipelineLayout<BindLayouts>,
  arrayStride: number,
) {
  return new VertexShader({
    entryPoints: {
      main: new VertexShaderFunction(
        colorPositionOutput,
        [
          {
            arrayStride: arrayStride * 4,
            attributes2: simpleAttributes,
            stepMode: 'vertex',
          },
        ],
        (
          [
            ,
            /*{ uniforms, }*/ {
              scene /*time, clusters_array, meshes, projection*/,
            },
            { world },
          ],
          [{ position, normal }],
        ) => /* wgsl */ `
            var output : Output;
            var vertexPosition:vec4<f32> = ${world.prop(
              'transformation',
            )} * vec4<f32>(${position}.xyz, 1.0);
            if(gl_VertexIndex % 2u == 1u) {
                /*
                    Drop translation part from matrix
                */
                var matt: mat3x3<f32> = mat3x3<f32>(
                    ${world.prop('transformation')}[0].xyz,
                    ${world.prop('transformation')}[1].xyz,
                    ${world.prop('transformation')}[2].xyz
                );
                var transformed_normal = normalize(matt * ${normal});
                vertexPosition = vertexPosition + vec4<f32>(transformed_normal*10.0, 0.0);
            }
            output.position = ${scene.prop(
              'modelViewProjection',
            )} * vertexPosition;
            output.color=vec3<f32>(0.0,1.0,0.0);
            return output;
            `,
        '@builtin(vertex_index) gl_VertexIndex : u32,',
      ) satisfies VertexShaderFunction<
        [
          // eslint-disable-next-line @typescript-eslint/ban-types
          {},
          {
            scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
          },
          {
            world: BufLayout<
              ShaderStage.VERTEX_AND_FRAGMENT,
              typeof MeshUniforms
            >;
          },
        ]
      >,
    },
    gpu: pipelineLayout.gpu,
    label: 'debug_normals.vert',
    pipelineLayouts: [pipelineLayout],
  });
}

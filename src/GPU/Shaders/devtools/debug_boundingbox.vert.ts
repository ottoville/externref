import type { RenderPipelineLayout } from '../../PipelineLayout.js';
import {
  type BufLayout,
  type ShaderStage,
  VertexShader,
  VertexShaderFunction,
} from '../../../webgpu-ts/index.js';
import { GPU } from '../../../GPU.js';
import {
  MeshUniforms,
  Scene,
  colorPositionOutput,
} from '../structs/Structs.js';
import { positionAttr } from '../structs/Attributes.js';

type BindLayouts = GPU['positionAndTimeBindGroup']['bindGroupLayouts'];

export function createDebugBoundingBoxVertShader(
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
            attributes2: positionAttr,
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
          [{ position }],
        ) => /* wgsl */ ` var output : Output;
                var vertexPosition:vec4<f32> = ${world.prop(
                  'transformation',
                )} * ${position};
                output.position = ${scene.prop(
                  'modelViewProjection',
                )} * vertexPosition;
                output.color = vec3<f32>(0.0,1.0,0.0);
                return output;
            `,
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
    label: 'debug_boundingBox.vert',
    pipelineLayouts: [pipelineLayout],
  });
}
export type DebugBoundingBoxVertShader = ReturnType<
  typeof createDebugBoundingBoxVertShader
>;

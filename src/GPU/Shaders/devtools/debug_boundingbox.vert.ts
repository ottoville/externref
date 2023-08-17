import { PipelineLayout } from '../../PipelineLayout.js';
import { VertexShader } from '../VertexShader.js';
import { GPU } from '../../../GPU.js';
import { VertexShaderFunction } from '../ShaderFunction.js';
import { colorPositionOutput } from '../structs/Structs.js';
import { positionAttr } from '../structs/Attributes.js';

type BindLayouts = GPU['positionAndTimeBindGroup']['bindGroupLayouts'];

export function createDebugBoundingBoxVertShader(
  pipelineLayout: PipelineLayout<BindLayouts>,
  arrayStride: number,
) {
  return new VertexShader({
    entryPoints: {
      main: new VertexShaderFunction(
        colorPositionOutput,
        pipelineLayout,
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
      ),
    },
    gpu: pipelineLayout.gpu,
    label: 'debug_boundingBox.vert',
  });
}
export type DebugBoundingBoxVertShader = ReturnType<
  typeof createDebugBoundingBoxVertShader
>;

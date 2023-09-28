import {
  type BufLayout,
  type ShaderStage,
  VertexShader,
  VertexShaderFunction,
  WGSLcode,
} from '../../../webgpu-ts/index.js';
import { GPU } from '../../../GPU.js';
import {
  MeshUniforms,
  Scene,
  colorPositionOutput,
} from '../structs/Structs.js';
import { positionAttr } from '../structs/Attributes.js';

export function createDebugBoundingBoxVertShader(
  pipelineLayout: GPU['shaders']['positionAndTimeBindGroup'],
  arrayStride: number,
) {
  return new VertexShader({
    entryPoints: {
      main: new VertexShaderFunction(
        colorPositionOutput,
        [
          {
            arrayStride,
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
        ) => WGSLcode/* wgsl */ `
                var output : Output;
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
    label: 'debug_boundingBox.vert',
    pipelineLayouts: [pipelineLayout],
  });
}
export type DebugBoundingBoxVertShader = ReturnType<
  typeof createDebugBoundingBoxVertShader
>;

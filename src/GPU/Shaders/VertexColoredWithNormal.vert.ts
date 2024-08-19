import {
  type BufLayout,
  type ShaderStage,
  VertexShaderBuilder,
  VertexShaderFunction,
  WGSLcode,
} from '../../webgpu-ts/index.js';
import { GPU, VertexBufferProps } from '../../GPU.js';
import { type Scene, typicalOutput } from './structs/Structs.js';
import { createPickOutput } from './SingleColoredWithNormal.vert.js';
import { simpleAttributesWithColor } from './structs/Attributes.js';

/**
  Shader where each vertex carries a color property
*/
export function createVertexColorShader(
  gpu: GPU,
  vertexBufferProps: VertexBufferProps,
) {
  const pipelineLayout = gpu.shaders.positionAndTimeBindGroup;
  const arrayStride = vertexBufferProps.stride * 4;
  const buffers = Object.freeze([
    {
      arrayStride,
      attributes: simpleAttributesWithColor,
      stepMode: 'vertex',
    },
  ] as const);
  return new VertexShaderBuilder([pipelineLayout] as const, 'VertexColor.vert')
    .addFunction(
      'main',
      new VertexShaderFunction(
        typicalOutput,
        buffers,
        (
          [
            ,
            /*{ uniforms, }*/ {
              scene /*time, clusters_array, meshes, projection*/,
            },
            { world },
          ],
          [{ color, position, normal }],
        ) => WGSLcode/* wgsl */ `
        var output:Output;
        //output.normal=normal;
        var worldPos=${world.prop('transformation')} * ${position};

        output.normal = normalize((${world.prop(
          'transformation_normals',
        )} * ${normal}));
        output.fragCoord = ${scene.prop('modelViewProjection')} * worldPos;
        output.id=${world.prop('id')};
        output.position=vec3<f32>(worldPos.xyz);
        output.scenes=${world.prop('scenes')};
        output.color = ${color};

        //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
        //ambient=lights.ambient;
        return output;`,
      ) satisfies VertexShaderFunction<
        [
          // eslint-disable-next-line @typescript-eslint/no-empty-object-type
          {},
          {
            scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
          },
          {
            world: BufLayout<
              ShaderStage.VERTEX_AND_FRAGMENT,
              GPU['meshUniforms']
            >;
          },
        ]
      >,
    )
    .addFunction('pick', createPickOutput(buffers));
}

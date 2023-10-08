import {
  type VertexBufferLayout2,
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  WGSLcode,
  ShaderBuilder,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import {
  MeshUniforms,
  Scene,
  pickOutput,
  typicalOutput,
} from './structs/Structs.js';
import { simpleAttributes } from './structs/Attributes.js';

export function createPickOutput(
  buffers: readonly [VertexBufferLayout2<typeof simpleAttributes>],
) {
  return new VertexShaderFunction(
    pickOutput,
    buffers,
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
        var output: PickOutput;
        var worldPos=${world.prop('transformation')} * ${position};
        output.Position = ${scene.prop('modelViewProjection')} * worldPos;
        output.id=${world.prop('id')};
        //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
        //ambient=lights.ambient;
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
        world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>;
      },
    ]
  >;
}

/**
  Shader where mesh is single colored
*/
export function createSimpleVertShader(
  pipelineLayout: GPU['shaders']['positionAndTimeBindGroup'],
  arrayStride: number,
) {
  const buffers = Object.freeze([
    {
      arrayStride,
      attributes2: simpleAttributes,
      stepMode: 'vertex',
    },
  ] as const);
  return new ShaderBuilder([pipelineLayout])
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
          [{ position, normal }],
        ) => WGSLcode/* wgsl */ `
        var output:Output;
        var curPos : mat4x4<f32> = ${world.prop('transformation')};
        var worldPos=curPos * ${position};

        output.normal = normalize((curPos * vec4<f32>(${normal}, 0.0)).xyz);
        output.fragCoord = ${scene.prop('modelViewProjection')} * worldPos;
        output.id=${world.prop('id')};
        output.position=vec3<f32>(worldPos.xyz);
        output.scenes=${world.prop('scenes')};
        output.color = ${world.prop('color')};

        //shading = dot(vec3<f32>(0.0,1.0,0.0), lights.sunDirection)*lights.shadow;
        //ambient=lights.ambient;
        return output;`,
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
    )
    .addFunction('pick', createPickOutput(buffers))
    .build('Simple.vert');
}
export type SimpleVertShader = ReturnType<typeof createSimpleVertShader>;

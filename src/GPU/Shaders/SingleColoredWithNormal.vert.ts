import {
  type VertexBufferLayout,
  VertexShaderFunction,
  type BufLayout,
  type ShaderStage,
  WGSLcode,
  VertexShaderBuilder,
  VertexShader,
  VertexBufferLayouts,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import {
  PositionNormalVertice,
  type Scene,
  pickOutput,
  typicalOutput,
} from './structs/Structs.js';

export function createPickOutput(
  buffers: VertexBufferLayouts<
    readonly [VertexBufferLayout<typeof PositionNormalVertice>]
  >,
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
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      {},
      {
        scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
      },
      {
        world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, GPU['meshUniforms']>;
      },
    ]
  >;
}

/**
  Shader where mesh is single colored
*/
const buffers = new VertexBufferLayouts([
  {
    stepMode: 'vertex',
    struct: PositionNormalVertice,
  },
]);
export function createSimpleVertShader(gpu: GPU) {
  const pipelineLayout = gpu.shaders.positionAndTimeBindGroup;

  return new VertexShaderBuilder([pipelineLayout] as const, 'Simple.vert')
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
        var worldPos=${world.prop('transformation')} * ${position};

        output.normal = normalize((${world.prop(
          'transformation_normals',
        )} * ${normal}));
        output.fragCoord = ${scene.prop('modelViewProjection')} * worldPos;
        output.id=${world.prop('id')};
        output.position=worldPos.xyz;
        output.scenes=${world.prop('scenes')};
        output.color = ${world.prop('color')};

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

export type SimpleVertShader = VertexShader<
  ReturnType<typeof createSimpleVertShader>['entryPoints'],
  ReturnType<typeof createSimpleVertShader>['pipelineLayouts']
>;

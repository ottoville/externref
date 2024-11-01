import {
  VertexShaderFunction,
  type BufLayout,
  ShaderStage,
  WGSLcode,
  VertexShaderBuilder,
  VertexShader,
  VertexBufferLayouts,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import {
  GroundInput,
  PositionNormalUvVertice,
  type Scene,
  pickOutput,
} from './structs/Structs.js';

type GroundFunction = VertexShaderFunction<
  readonly [
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {},
    {
      scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
    },
    {
      world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, GPU['meshUniforms']>;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {},
  ]
>;
const buffers = new VertexBufferLayouts([
  {
    stepMode: 'vertex',
    struct: PositionNormalUvVertice,
  },
]);
export function createGroundVertShader(gpu: GPU) {
  const pipelineLayout = gpu.pipelineLayouts.lightsTextureBindGroup;

  return new VertexShaderBuilder([pipelineLayout], 'Ground.vert')
    .addFunction(
      'main',
      new VertexShaderFunction(
        GroundInput,
        buffers,
        (
          [
            ,
            /*{uniforms}*/ {
              scene /*time, clusters_array, meshes, projection*/,
            },
            { world },
          ],
          [{ position, uv, normal }],
        ) => WGSLcode/* wgsl */ `
        var output : Output;
        output.fragCoord = ${scene.prop('modelViewProjection')} * ${position};
        //shading = dot(normal, lights.sunDirection)*lights.shadow;
        //ambient=lights.ambient;
      
        output.v_uv=${uv}; 
        output.normal=${normal};
        output.position=${position}.xyz;
      
        //let localPosition:vec4<f32> = uniforms.modelViewProjectionMatrix * vec4<f32>(position.xyz, 1.0);
        //output.position=localPosition.xyz;//position;
        output.id=${world.prop('id')};
        output.scenes=${world.prop('scenes')};
        return output;
        `,
      ) satisfies GroundFunction,
    )
    .addFunction(
      'pick',
      new VertexShaderFunction(
        pickOutput,
        buffers,
        (
          [
            ,
            /*{uniforms}*/ {
              scene /*time, clusters_array, meshes, projection*/,
            },
            { world },
          ],
          [{ position }],
        ) => WGSLcode/* wgsl */ `
            var output : PickOutput;
            output.Position = ${scene.prop(
              'modelViewProjection',
            )} * vec4<f32>(${position}.xyz, 1.0);
            output.id=${world.prop('id')};
            return output;
        `,
      ) satisfies GroundFunction,
    );
}

export type GroundVertShader = VertexShader<
  ReturnType<typeof createGroundVertShader>['entryPoints'],
  ReturnType<typeof createGroundVertShader>['pipelineLayouts']
>;

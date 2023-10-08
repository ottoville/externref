import {
  type VertexBufferLayout2,
  VertexShaderFunction,
  type BufLayout,
  ShaderStage,
  ShaderBuilder,
  WGSLcode,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';
import {
  GroundInput,
  MeshUniforms,
  Scene,
  pickOutput,
} from './structs/Structs.js';

type GroundFunction = VertexShaderFunction<
  readonly [
    // eslint-disable-next-line @typescript-eslint/ban-types
    {},
    {
      scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
    },
    {
      world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>;
    },
    // eslint-disable-next-line @typescript-eslint/ban-types
    {},
  ]
>;

export function createGroundVertShader(
  pipelineLayout: GPU['lightsTextureBindGroup'],
  buffers: VertexBufferLayout2,
) {
  return new ShaderBuilder([pipelineLayout])
    .addFunction(
      'main',
      new VertexShaderFunction(
        GroundInput,
        [buffers],
        ([
          ,
          /*{uniforms}*/ { scene /*time, clusters_array, meshes, projection*/ },
          { world },
        ]) => WGSLcode/* wgsl */ `
        var output : Output;
        output.fragCoord = ${scene.prop(
          'modelViewProjection',
        )} * vec4<f32>(position.xyz, 1.0);
        //shading = dot(normal, lights.sunDirection)*lights.shadow;
        //ambient=lights.ambient;
      
        output.v_uv=uv; 
        output.normal=normal;
        output.position=position;
      
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
        [buffers],
        ([
          ,
          /*{uniforms}*/ { scene /*time, clusters_array, meshes, projection*/ },
          { world },
        ]) => WGSLcode/* wgsl */ `
            var output : PickOutput;
            output.Position = ${scene.prop(
              'modelViewProjection',
            )} * vec4<f32>(position.xyz, 1.0);
            output.id=${world.prop('id')};
            return output;
        `,
      ) satisfies GroundFunction,
    )
    .build('Ground.vert');
}

export type GroundVertShader = ReturnType<typeof createGroundVertShader>;

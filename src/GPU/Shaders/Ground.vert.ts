import {
  type VertexBufferLayout2,
  VertexShaderFunction,
  type BufLayout,
  ShaderStage,
  WGSLcode,
  VertexShaderBuilder,
  VertexShader,
} from '../../webgpu-ts/index.js';
import type { GPU, VertexBufferProps } from '../../GPU.js';
import { GroundInput, type Scene, pickOutput } from './structs/Structs.js';

type GroundFunction = VertexShaderFunction<
  readonly [
    // eslint-disable-next-line @typescript-eslint/ban-types
    {},
    {
      scene: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>;
    },
    {
      world: BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, GPU['meshUniforms']>;
    },
    // eslint-disable-next-line @typescript-eslint/ban-types
    {},
  ]
>;
const attributes = Object.freeze({
  normal: {
    format: 'float32x3',
    offset: 16,
    shaderFormat: 'vec3<f32>',
    shaderLocation: 1,
  },
  position: {
    format: 'float32x3',
    offset: 0,
    shaderFormat: 'vec3<f32>',

    shaderLocation: 0,
  },
  uv: {
    format: 'float32x2',
    offset: 32,
    shaderFormat: 'vec2<f32>',
    shaderLocation: 2,
  },
} as const);
export function createGroundVertShader(
  gpu: GPU,
  vertexBufferProps: VertexBufferProps,
) {
  const pipelineLayout = gpu.lightsTextureBindGroup;
  const buffers: VertexBufferLayout2 = {
    arrayStride: vertexBufferProps.stride * 4,
    attributes: attributes,
    stepMode: 'vertex',
  };
  return new VertexShaderBuilder([pipelineLayout], 'Ground.vert')
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
    );
}

export type GroundVertShader = VertexShader<
  ReturnType<typeof createGroundVertShader>['entryPoints'],
  ReturnType<typeof createGroundVertShader>['pipelineLayouts']
>;

import { PipelineLayout } from '../PipelineLayout.js';
import { VertexBufferLayout2, VertexShader } from './VertexShader.js';
import type { GPU } from '../../GPU.js';
import { VertexShaderFunction } from './ShaderFunction.js';
import { Struct, pickOutput } from './structs/Structs.js';
type BindLayouts = GPU['lightsTextureBindGroup']['bindGroupLayouts']

export function createGroundVertShader(pipelineLayout: PipelineLayout<BindLayouts>, buffers: VertexBufferLayout2) {
    return new VertexShader({
        bindGroupLayouts: pipelineLayout.bindGroupLayouts,
        entryPoints: {
            main: new VertexShaderFunction(
                new Struct('Output',
                    {
                        Position: ['@builtin(position)', 'vec4<f32>'],
                        v_uv: ['@location(0)', 'vec2<f32>'],
                        // eslint-disable-next-line sort-keys
                        normal: ['@location(1)', 'vec3<f32>'],
                        position: ['@location(2)', 'vec3<f32>'],
                        // eslint-disable-next-line sort-keys
                        id: ['@location(3) @interpolate(flat)', 'u32'],
                        scenes: ['@location(4) @interpolate(flat)', 'u32'],
                    }),
                pipelineLayout,
                [buffers],
                ([
                    /*{uniforms}*/,
                    { scene, /*time, clusters_array, meshes, projection*/ },
                    { world, }
                ]) => /* wgsl */
                    `
            var output : Output;
            output.Position = ${scene.prop('modelViewProjection')} * vec4<f32>(position.xyz, 1.0);
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
            `
            ),
            pick: new VertexShaderFunction(pickOutput,
                pipelineLayout,
                [buffers],
                ([
                    /*{uniforms}*/,
                    { scene, /*time, clusters_array, meshes, projection*/ },
                    { world, }
                ]) =>
                /* wgsl */ `
                var output : PickOutput;
                output.Position = ${scene.prop('modelViewProjection') } * vec4<f32>(position.xyz, 1.0);
                output.id=${world.prop('id') };
                return output;
            `),
        },
        gpu: pipelineLayout.gpu,
        label: 'Ground.vert',
    });
}

export type GroundVertShader = ReturnType<typeof createGroundVertShader>;

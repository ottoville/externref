import { PipelineLayout } from '../PipelineLayout.js';
import { VertexShader } from './VertexShader.js';
import type { Terrain } from '../../world/Terrain.js';
import { getHeightAtCoordinates } from './getHeightAtCoordinates.js';
import { VertexShaderFunction } from './ShaderFunction.js';
import { colorPositionOutput } from './structs/Structs.js';
type BindGroupLayouts = Terrain['TerrainHeightsbindGroupTree']['bindGroupLayouts'];

export function createHelperVertShader(settings: typeof Terrain.settings,
    pipelineLayout: PipelineLayout<BindGroupLayouts>) {
    return new VertexShader({
        entryPoints: {
            main: new VertexShaderFunction(
                colorPositionOutput,
                pipelineLayout,
                [],
                ([
                    /*{ uniforms, }*/,
                    { scene, time, /*clusters_array, meshes, projection*/ },
                    { world, }
                    /*{ slopes, facet12, }*/
                ]) => /* wgsl */
                    /* wgsl */`var output:Output;
 
     var angle:f32 = (f32(${time.prop('time')}) * 0.001) + f32(instanceIdx) * angleStep;
     var c:f32 = cos(angle);
     var s:f32 = sin(angle);
     var position:vec3<f32> =vec3<f32>(vertices[VertexIndex].x,1.5,vertices[VertexIndex].y);
     var rotated:vec2<f32> =vec2<f32>(position.x * c - position.z * s, position.x * s + position.z * c);
     var offset:vec2<f32> = rotated + vec2<f32>(10.0 * c, 10.0 * s);
 

     var worldPos:vec4<f32> = ${world.prop('transformation')} * vec4<f32>(offset.x, position.y, offset.y, 1.0);
     worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz) + 3.0;
     output.position = ${scene.prop('modelViewProjection')} * worldPos;
     output.color = vec3<f32>(1.0,1.0,1.0);
     return output;
                `,
                `@builtin(instance_index) instanceIdx : u32,
                @builtin(vertex_index) VertexIndex : u32,`),
        },
        gpu: pipelineLayout.gpu,
        label: 'helper.vert',
    },
    ([
        /*{ uniforms, }*/,
        /*{ scene,time, clusters_array, meshes, projection }*/,
        /*{ world, }*/,
        { slopes, facet12, }
    ]) =>
        /* wgsl */ `const angleStep:f32 = 0.7853981633974483; //(PI * 2.0) / 8.0;
        ${getHeightAtCoordinates(settings,
        slopes,
        facet12)}

        const vertices : array<vec2<f32>, 4> = array<vec2<f32>, 4>(
          vec2<f32>( -0.5,  2.0),
          vec2<f32>( -0.5, -2.0),
          vec2<f32>( 0.5,  3.0),
          vec2<f32>( 0.5, -3.0)
        );`);
}

export type HelperVertShader = ReturnType<typeof createHelperVertShader>

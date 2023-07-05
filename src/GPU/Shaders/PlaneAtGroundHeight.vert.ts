import { PipelineLayout } from '../PipelineLayout.js';
import { VertexBufferLayout2, VertexShader } from './VertexShader.js';
import type { Terrain } from '../../world/Terrain.js';
import { getHeightAtCoordinates } from './getHeightAtCoordinates.js';
import { VertexShaderFunction } from './ShaderFunction.js';
import { colorPositionOutput } from './structs/Structs.js';

type BindGroupLayouts = Terrain['TerrainHeightsbindGroupTree']['bindGroupLayouts'];

export function createPlaneAtGroundHeightVertShader(
    pipelineLayout: PipelineLayout<BindGroupLayouts>,
    buffers: VertexBufferLayout2,
    settings: typeof Terrain.settings
) {
    return new VertexShader({
        bindGroupLayouts: pipelineLayout.bindGroupLayouts,
        entryPoints: {
            main: new VertexShaderFunction(
                colorPositionOutput,
                pipelineLayout,
                [buffers],
                ([
                    /*{uniforms,}*/,
                    { scene, /*time, clusters_array, meshes, projection*/ },
                    { world, }
                    /*{ _slopes, _facet12, }*/
                ]) => /* wgsl */
                    `
                var output:Output;
                var worldPos:vec4<f32> = ${world.prop('transformation')} * position;
                worldPos.y = worldPos.y + getHeightAtCoordinates(worldPos.xz) + 1.0;
                output.position = ${scene.prop('modelViewProjection')} * worldPos;
                output.color = vec3<f32>(1.0,1.0,1.0);
                return output;
            `
            ),
        },
        gpu: pipelineLayout.gpu,
        label: 'PlaneAtGroundHeight.vert',
    },
    ([
        /*{ uniforms, }*/,
        /*{ scene,time, clusters_array, meshes, projection}*/,
        /*{ world, }*/,
        { slopes, facet12, }
    ]) =>
        `
        ${getHeightAtCoordinates(settings,
        slopes,
        facet12)}
    `);
}
export type PlaneAtGroundHeightVertShader = ReturnType<typeof createPlaneAtGroundHeightVertShader>

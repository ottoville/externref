import { DrawableSimple } from '../../Drawables/DrawableSimple.js';
import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import { DataNode } from '../../../nodes/DataNode.js';
import type { Engine } from '../../../engine.js';
declare const engine: Engine;
import type { RenderPipelineProps } from 'GPU/RenderPipeline.js';
import { createDebugNormalsVertShader } from '../../Shaders/devtools/debug_normals.vert.js';
import { create_rust_label } from '../../../MainNode.js';
import {
  BGLayout,
  BindGroup,
  Buffer,
  BufferUsageEnums,
  BufLayout,
  FragmentShaderBuilder,
  ShaderStage,
  Struct,
  StructProperty,
  VertexBufferLayouts,
} from '../../../webgpu-ts/index.js';
import {
  colorFragmentFunction,
  gpu_memory_index_size,
} from '../../Shaders/ShaderBuilders.js';

export class NormalsMesh extends DataNode {
  override drawable: DrawableSimple<RenderPipelineProps>;
  constructor(targetNode: DrawableDirect<DataNode>) {
    const mesh = engine.rust.create_debug_mesh_normals(
      targetNode.node.id,
      ...create_rust_label('normals_' + targetNode.node.label),
    );
    const geometry = engine.rust.get_geometry(mesh);

    super(
      {
        character_can_collide_to: false,
        vertices: geometry,
      },
      mesh,
    );
    const gpuVertexBuffer = targetNode.vertexBuffers[0]?.buffer;
    if (!gpuVertexBuffer) {
      throw new Error('mesh does not have vertexbuffer');
    }
    const layout = targetNode.renderPipeline.builder.vertexShader.entryPoints[
      'main'
    ]!.vertexBufferLayouts as VertexBufferLayouts<
      readonly [
        {
          readonly stepMode: 'vertex';
          readonly struct: Struct<{
            readonly position: StructProperty<'vec3<f32>'>;
            readonly normal: StructProperty<'vec3<f32>'>;
          }>;
        },
      ]
    >;
    const arr_struct = new Struct(
      'vertex_arr',
      {
        vertices: new StructProperty(
          '',
          `array<${layout.vertexBufferLayout[0].struct.name}>`,
        ),
      },
      [layout.vertexBufferLayout[0].struct],
    );
    const vertex_normals_layout = new BGLayout(
      engine.gpu!.device,
      'vertex_normals_layout',
      {
        vertices: new BufLayout(
          {
            buffer: {
              hasDynamicOffset: false,
              minBindingSize: gpu_memory_index_size,
              type: 'read-only-storage',
            },
            visibility: ShaderStage.VERTEX,
          },
          arr_struct,
        ),
      },
    );

    const bindGroup = new BindGroup(
      vertex_normals_layout,
      'vertices_storage_buffer_binding',
      (b) => {
        return {
          vertices: (
            gpuVertexBuffer as Buffer<
              (typeof BufferUsageEnums)['VERTEX|STORAGE']
            >
          ).getStorageBinding(b),
        };
      },
    );
    const vertex_normals_bgroup =
      engine.gpu!.shaders.positionAndTimeBindGroup.appendBinds(
        'vertex_normals_bgroup',
        [vertex_normals_layout],
      );
    const ColorShader = new FragmentShaderBuilder(
      [vertex_normals_bgroup],
      'color.frag',
    ).addFunction('main', colorFragmentFunction);
    const renderPipeline = engine.gpu!.createRenderPipelineBuilder(
      {
        connections: {
          main: 'main',
        },
        primitive: {
          topology: 'line-list',
        },
      },
      createDebugNormalsVertShader(vertex_normals_bgroup),
      () => ColorShader,
    );

    this.drawable = new DrawableSimple({
      bindGroups: [
        {
          bindGroup,
        },
      ],
      node: this,
      renderPipeline,
      vertexBuffers: [],
    });
  }
}

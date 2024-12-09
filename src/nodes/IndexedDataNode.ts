import {
  allocate_vec,
  allocate_vec_positions_and_normals_and_uv,
  DataNode,
} from './DataNode.js';
import { DrawableIndexed } from '../GPU/Drawables/DrawableIndexed.js';
import { RenderPipelineProps } from 'GPU/RenderPipeline.js';
import type { Engine } from '../engine.js';
import { create_rust_vec_ptr } from '../utils.js';
declare const engine: Engine;

export class IndexedDataNode extends DataNode {
  declare drawable?:
    | DrawableIndexed<RenderPipelineProps, IndexedDataNode>
    | undefined;
  onIndicesChange: (() => void)[] = [];
  set_indices_and_vertices_PositionAndNormalAndUV(
    indices: Uint32Array,
    vertices: Float32Array,
  ) {
    const [ptr_ind, len_ind, cap_ind] = allocate_vec(indices);
    const [ptr_vertices, len_vertices, cap_vertices] =
      allocate_vec_positions_and_normals_and_uv(vertices.length / 12);
    new Float32Array(
      engine.rust.memory.buffer,
      ptr_vertices,
      len_vertices * 12,
    ).set(vertices);

    engine.rust.set_indices_and_vertices_PositionAndNormalAndUV(
      this.id,
      ptr_ind,
      len_ind,
      cap_ind,
      ptr_vertices,
      len_vertices,
      cap_vertices,
    );
    this.drawable?.setIndexBuffer(
      engine.rust.indices_pointer_from_geometry(this.geometry),
    );

    this.onIndicesChange.forEach((cb) => cb());
  }
  get indices() {
    const [indices_ptr, indices_len] = create_rust_vec_ptr(
      engine.rust.indices_field_pointer(this.geometry),
    );
    return new Uint32Array(engine.rust.memory.buffer, indices_ptr, indices_len);
  }
  get indices_count() {
    return create_rust_vec_ptr(
      engine.rust.indices_field_pointer(this.geometry),
    )[1];
  }
}

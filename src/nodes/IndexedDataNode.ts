import { MainNodeProps } from 'MainNode.js';
import {
  allocate_vec,
  allocate_vec_positions_and_normals_and_uv,
  DataNode,
  DataNodeProps,
} from './DataNode.js';
import { DrawableIndexed } from '../GPU/Drawables/DrawableIndexed.js';
import { RenderPipelineProps } from 'GPU/RenderPipeline.js';
import type { Engine } from '../engine.js';
import { create_rust_vec_ptr } from '../Math.js';
declare const engine: Engine;

export class IndexedDataNode extends DataNode {
  declare drawable?:
    | DrawableIndexed<RenderPipelineProps, IndexedDataNode>
    | undefined;
  onIndicesChange: (() => void)[] = [];
  set_indices(vec: rust_vec_ptr<'usize'>) {
    engine.rust.set_indices(this.geometry, ...vec);
    if (this.drawable && !(this.drawable instanceof DrawableIndexed)) {
      throw new Error('Node is not indexed');
    }
    this.drawable?.setIndexBuffer(
      new Uint32Array(engine.rust.memory.buffer, vec[0], vec[1]),
    );
    this.onIndicesChange.forEach((cb) => cb());
  }
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
    if (this.drawable && !(this.drawable instanceof DrawableIndexed)) {
      throw new Error('Node is not indexed');
    }
    this.drawable?.setIndexBuffer(indices);
    this.onIndicesChange.forEach((cb) => cb());
  }
  get indices() {
    const [indices_ptr, indices_len] = new Uint32Array(
      engine.rust.memory.buffer,
      engine.rust.indices_field_pointer(this.geometry),
      2,
    );
    return new Uint32Array(engine.rust.memory.buffer, indices_ptr, indices_len);
  }
  get indices_count() {
    return create_rust_vec_ptr(
      engine.rust.indices_field_pointer(this.geometry),
    )[1];
  }
  constructor(
    props: DataNodeProps,
    mainNodeProps: MainNodeProps | number,
    indicesView?: rust_vec_ptr<'usize'>,
    strip = false,
  ) {
    super(props, mainNodeProps, strip);
    if (typeof props.vertices !== 'number' && indicesView) {
      this.set_indices(indicesView);
    }
  }
}

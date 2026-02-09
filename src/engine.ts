import { Physics } from './physics.js';
import { GPU } from './GPU.js';
import type { Scene } from './Scene.js';
//@ts-expect-error todo
import { ArcRotateCamera } from './controllers/ArcRotateCamera.js';
//@ts-expect-error todo
import { MeshCamera } from './controllers/MeshCamera.js';
import { DataNode } from './nodes/DataNode.js';
import type { CameraController } from './controllers/CameraController.js';
import type { UIRectangleNodeHover } from './ui/UIRectangleNodeHover.js';
import { MainNode, type RigidBody } from './MainNode.js';
import {
  BufferExports,
  type BufferInterface,
} from './wasm-interfaces/WebGPU/BufferInterface.js';
import { Rust_Iterator } from './utils.js';
import { CommandEncoderInterface } from './wasm-interfaces/WebGPU/CommandEncoderInterface.js';
import { Externref } from './externref.js';
import { ComputePassEncoderInterface } from './wasm-interfaces/WebGPU/ComputePassEncoder.js';
import { CameraInterface } from './wasm-interfaces/CameraInterface.js';
import { QueueInterface } from './wasm-interfaces/WebGPU/QueueInterface.js';
import { DeviceExports } from './wasm-interfaces/WebGPU/DeviceInterface.js';
import { DevToolsInterface } from './wasm-interfaces/DevToolsInterface.js';
import { RenderbundleEncoderInterface } from './wasm-interfaces/WebGPU/RenderBundleEncoderInterface.js';
import { BindCommandsInterface } from './wasm-interfaces/WebGPU/BindCommandsInterface.js';
import { RenderPass } from 'GPU/RenderPasses/RenderPass.js';
import { RenderPassEncoderInterface } from './wasm-interfaces/WebGPU/RenderPassEncoder.js';
import { RenderCommandsInterface } from './wasm-interfaces/WebGPU/RenderCommandsInterface.js';
import { TextureInterface } from './wasm-interfaces/WebGPU/TextureInterface.js';
import { CanvasInterface } from './wasm-interfaces/CanvasInterface.js';
import { GPUInterface } from './wasm-interfaces/WebGPU/GPUInterface.js';
import { CanvasContextInterface } from './wasm-interfaces/WebGPU/CanvasContextInterface.js';
import { BindGroupExports } from './wasm-interfaces/WebGPU/BindGroupInterface.js';
import { IDBFactoryInterface } from './wasm-interfaces/IDB/IDBFactory.js';
import {
  IDBRequestImports,
  IDBRequestInterface,
} from './wasm-interfaces/IDB/IDBRequest.js';
import { IDBOpenDBRequestInterface } from './wasm-interfaces/IDB/IDBOpenDBRequest.js';
import { IDBDatabaseInterface } from './wasm-interfaces/IDB/IDBDatabase.js';
import { IDBTransactionInterface } from './wasm-interfaces/IDB/IDBTransaction.js';
import { CharArrayInterface } from './wasm-interfaces/CharArray.js';
import { IDBObjectStoreInterface } from './wasm-interfaces/IDB/IDBObjectStore.js';
import { StringArrayInterface } from './wasm-interfaces/StringArray.js';
import {
  type NavigatorStorageBuckets,
  StorageBucketsInterface,
} from './wasm-interfaces/StorageBuckets.js';
import { StringInterface } from './wasm-interfaces/String.js';
import {
  FileSystemDirectoryHandleImports,
  FileSystemDirectoryHandleInterface,
} from './wasm-interfaces/FileSystem/FileSystemDirectoryHandle.js';
import {
  FileSystemFileHandleImports,
  FileSystemFileHandleInterface,
} from './wasm-interfaces/FileSystem/FileSystemFileHandle.js';
import {
  FileSystemWritableFileStreamImports,
  FileSystemWritableFileStreamInterface,
} from './wasm-interfaces/FileSystem/FileSystemWritableFileStream.js';
import { consoleInterface } from './wasm-interfaces/console/console.js';
import { WritableStreamInterface } from './wasm-interfaces/WritableStream.js';

const textDecoder = new TextDecoder();

function createError(e: unknown) {
  if (!(e instanceof Error)) {
    return new Error('Unknown error ' + e);
  }
  return e;
}

declare const engine: Engine;

/*
globalThis.addEventListener && globalThis.addEventListener('unhandledrejection', (e) => {
    console.log(e)
    console.error('unhandledrejection');
    debugger;
})
*/

export type ListenerObj<K extends Events = Events> = {
  type: K;
  cb: (e: HTMLElementEventMap[K]) => void | boolean;
  options?: ListenerOptions;
  object: object;
};
type ListenerOptions = {
  /**
     Is this a event for UI elements.
     */
  ui?: boolean;
  /**
     Does this event trigger before other events.
     */
  priority?: boolean;
  /**
     Is this a event deleted after frist trigger.
     */
  once?: boolean;
  /**
     Make this event non preventable by other events. Events can be prevented by returning "true" in callback
     */
  force?: boolean;
};
export type rustWasm = {
  externrefs: WebAssembly.Table;
  add_drawble(mesh_id: rust_pointer<'mesh_id'>): void;
  set_drawble_direct(
    mesh_id: rust_pointer<'mesh_id'>,
    instance_count: number,
    first_instance: number,
  ): void;
  get_instance_count(mesh_id: rust_pointer<'mesh_id'>): number;
  get_first_instance(mesh_id: rust_pointer<'mesh_id'>): number;
  set_instance_count(
    mesh_id: rust_pointer<'mesh_id'>,
    instance_count: number,
  ): void;
  set_first_instance(
    mesh_id: rust_pointer<'mesh_id'>,
    first_instance: number,
  ): void;

  create_tiled_mesh_geometry(
    width: number,
    height: number,
    camera_can_collide_to: boolean,
    i: number,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'mesh_id'>;
  create_plane_mesh(gpu: rust_pointer<'GPU'>): rust_pointer<'mesh_id'>;
  create_plants_mesh(): rust_pointer<'mesh_id'>;
  create_terraintool_mesh(): rust_pointer<'mesh_id'>;
  create_zones_light_mesh(scene: number): rust_pointer<'mesh_id'>;
  create_sun_mesh(scene: number): rust_pointer<'mesh_id'>;
  create_water_mesh(scene: number): rust_pointer<'mesh_id'>;
  create_octasphere(
    point_light: number,
    directional_light: number,
    scenes: number,
    rigid_body: RigidBody,
    camera_can_collide_to: boolean,
    num_subdivisions: number,
    half_width: number,
    half_height: number,
    half_depth: number,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'mesh_id'>;
  create_icosphere_mesh(
    point_light: number,
    directional_light: number,
    scenes: number,
    rigid_body: RigidBody,
    camera_can_collide_to: boolean,
    order: number,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'mesh_id'>;
  create_box_mesh(
    point_light: number,
    directional_light: number,
    scenes: number,
    rigid_body: RigidBody,
    camera_can_collide_to: boolean,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'mesh_id'>;
  process_gpu_queue(
    time: number,
    updateViewPipeline: GPUComputePipeline,
    GPU: rust_pointer<'GPU'>,
  ): void;
  destroy_mesh(mesh_id: rust_pointer<'mesh_id'>): void;
  create_debug_mesh_wireframe(
    target_mesh_id: rust_pointer<'mesh_id'>,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'mesh_id'>;
  create_debug_mesh_normals(
    target_mesh_id: rust_pointer<'mesh_id'>,
  ): rust_pointer<'mesh_id'>;
  have_rigid_body(mesh_id: rust_pointer<'mesh_id'>): boolean;
  create_legacy_terrain_geometry(
    scenes: number,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'mesh_id'>;
  create_ui_mesh(positions_count: number): rust_pointer<'mesh_id'>;
  get_geometry(mesh_id: rust_pointer<'mesh_id'>): rust_pointer<'geometry'>;
  create_rtp_mesh(
    point_light: number,
    directional_light: number,
    scenes: number,
    rigid_body: RigidBody,
    camera_can_collide_to: boolean,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'mesh_id'>;
  create_cone_mesh(
    point_light: number,
    directional_light: number,
    scenes: number,
    rigid_body: RigidBody,
    camera_can_collide_to: boolean,
    faces: number,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'mesh_id'>;
  add_collider(
    mesh_id: rust_pointer<'mesh_id'>,
    collider: rust_pointer<'collider'>,
  ): void;
  memory: WebAssembly.Memory;
  vertices_pointer(
    geometry: rust_pointer<'geometry'>,
    make_dirty: boolean,
  ): rust_pointer<'f32'>;
  set_indices_and_vertices_PositionAndNormalAndUV(
    mesh_id: rust_pointer<'mesh_id'>,
    indices: rust_pointer<'GPUBuffer'>,
    vertices: rust_pointer<'GPUBuffer'>,
    gpu: rust_pointer<'GPU'>,
    serialize: boolean,
    facet12ArrGPUBuffer: rust_pointer<'GPUBuffer'>,
  ): void;
  indices_field_pointer(
    geometry: rust_pointer<'geometry'>,
  ): rust_pointer<'indices'>;
  indices_lenght(geometry: rust_pointer<'geometry'>): number;
  vertices_count(geometry: rust_pointer<'geometry'>): number;
  have_vertices(mesh_id: rust_pointer<'mesh_id'>): boolean;
  faces_count(mesh_id: rust_pointer<'mesh_id'>): number;
  alloc_vector_f32(size: Word<'dword'>): rust_pointer<rust_vec_ptr<'f32'>>;
  alloc_vector_u8(size: number): rust_pointer<rust_vec_ptr<'u8'>>;
  alloc_vector_usize(size: number): rust_pointer<rust_vec_ptr<'usize'>>;
  alloc_vector_positions(size: number): rust_pointer<rust_vec_ptr<'position'>>;
  alloc_vector_positions_and_normal(
    size: number,
  ): rust_pointer<rust_vec_ptr<'position_and_normal'>>;
  alloc_vector_position_and_normal_and_UV(
    size: number,
  ): rust_pointer<rust_vec_ptr<'position_and_normal_and_uv'>>;
  alloc_vector_positions2d_and_uv(
    size: number,
  ): rust_pointer<rust_vec_ptr<'position2d_and_uv'>>;
  update_scale(mesh_id: number, x: number, y: number, z: number): void;
  update_euler_angles(
    mesh_id: rust_pointer<'mesh_id'>,
    x: number,
    y: number,
    z: number,
  ): void;
  update_euler_angles_from_mutex(
    mesh: rust_pointer<'mesh'>,
    x: number,
    y: number,
    z: number,
  ): void;
  update_translation(
    mesh_id: rust_pointer<'mesh_id'>,
    x: number,
    y: number,
    z: number,
  ): void;
  update_dynamic_buffer(mesh: rust_pointer<'mesh'>): void;
  update_dynamic_buffer_from_id(mesh_id: rust_pointer<'mesh_id'>): void;

  gpu_alignment(mesh_id: rust_pointer<'mesh_id'>): number;
  positions_count(mesh_id: rust_pointer<'mesh_id'>): number;
  set_positions_count(
    mesh_id: rust_pointer<'mesh_id'>,
    positions_count: number,
  ): number;
  strip(mesh_id: rust_pointer<'mesh_id'>): number;
  mesh_label(mesh_id: rust_pointer<'mesh_id'>): string;
  translation_pointer(mesh: rust_pointer<'mesh'>): rust_pointer<'translation'>;
  translation_pointer_from_id(
    mesh_id: rust_pointer<'mesh_id'>,
  ): rust_pointer<'translation'>;
  rotation_pointer_euler(mesh_id: rust_pointer<'mesh_id'>): rust_pointer<'f32'>;
  velocity_pointer(mesh: rust_pointer<'mesh'>): rust_pointer<'velocity'>;
  velocity_pointer_from_id(
    mesh_id: rust_pointer<'mesh_id'>,
  ): rust_pointer<'velocity'>;

  scale_x(mesh_id: rust_pointer<'mesh_id'>): number;
  scale_y(mesh_id: rust_pointer<'mesh_id'>): number;
  scale_z(mesh_id: rust_pointer<'mesh_id'>): number;
  vertices_stride(geometry: rust_pointer<'geometry'>): Word<'dword'>;
  set_color(
    mesh: rust_pointer<'mesh'>,
    d0: number,
    d1: number,
    d2: number,
    d3: number,
  ): void;
  set_color_from_id(
    mesh_id: rust_pointer<'mesh_id'>,
    d0: number,
    d1: number,
    d2: number,
    d3: number,
  ): void;
  set_ambient(
    mesh: rust_pointer<'mesh'>,
    r: number,
    g: number,
    b: number,
  ): void;
  set_ambient_from_id(
    mesh_id: rust_pointer<'mesh_id'>,
    r: number,
    g: number,
    b: number,
  ): void;
  set_shadow(mesh: rust_pointer<'mesh'>, shadow: number): void;
  set_shadow_from_id(mesh_id: rust_pointer<'mesh_id'>, shadow: number): void;
  set_scenes(mesh_id: rust_pointer<'mesh_id'>, scenes: number): void;
  calculate_normals(mesh_id: rust_pointer<'mesh_id'>): void;
  update_scale_and_rotation(
    mesh_id: rust_pointer<'mesh_id'>,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    rw: number,
  ): void;
  faces_pointer(mesh_id: rust_pointer<'mesh_id'>): number;
  create_bounding_box_mesh(
    target_mesh_id: rust_pointer<'mesh_id'>,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'mesh_id'>;

  create_elevator(mesh_id: rust_pointer<'mesh_id'>): rust_pointer<'elevator'>;
  destroy_elevator(elevator_ptr: rust_pointer<'elevator'>): void;
  mouse_position_pointer(elevator_ptr: rust_pointer<'elevator'>): number;
  elevate(
    elevator_ptr: rust_pointer<'elevator'>,
    mesh_id: rust_pointer<'mesh_id'>,
    radius: number,
    height: number,
  ): void;
  get_length(elevator_ptr: rust_pointer<'elevator'>): number;
  get_offset(elevator_ptr: rust_pointer<'elevator'>): number;

  init_engine2(): number;
  physic_tick(delta: number): void;
  set_mouse_position(x: number, y: number): void;
  create_ball_collider(radius: number): rust_pointer<'collider'>;
  create_capsule_collider(
    half_height: number,
    radius: number,
    orientation: 0 | 1 | 2,
    collision_events: boolean,
  ): rust_pointer<'collider'>;
  create_trimesh_collider(mesh_id: number): rust_pointer<'collider'>;
  create_convex_collider(
    mesh_id: rust_pointer<'mesh_id'>,
    collision_events: boolean,
  ): rust_pointer<'collider'>;
  create_cuboid_collider(
    hx: number,
    hy: number,
    hz: number,
    border_radius: number,
    collision_events: boolean,
  ): rust_pointer<'collider'>;
  create_cone_collider(
    half_height: number,
    radius: number,
  ): rust_pointer<'collider'>;
  dedup_positions(geometry: rust_pointer<'geometry'>): void;
  push_to_temp_gpu_buffers(buffer: rust_pointer<'GPUBuffer'>): void;
  devtools_pointer(): rust_pointer<'devtools'>;
  add_onchange_callback(mesh_id: rust_pointer<'mesh_id'>): number;
  remove_onchange_callback(mesh_id: rust_pointer<'mesh_id'>, cb: number): void;
  get_engine(): rust_mutex<'locked', 'enginelock'>;
  drop_engine_lock(engine: rust_mutex<'locked', 'enginelock'>): void;

  init_gpu(
    device: GPUDevice,
    renderPassScreen: RenderPass,
    renderPassWater: RenderPass,
    renderPassCanvas: RenderPass,
    pickRenderPass: RenderPass,
    canvas: HTMLCanvasElement,
  ): rust_pointer<'GPU'>;
  push_to_pending_command_buffers(
    buffer: GPUCommandBuffer,
    gpu: rust_pointer<'GPU'>,
  ): void;
  drain_command_buffers(
    iterator_ptr: Rust_Iterator<GPUCommandBuffer>,
  ): GPUCommandBuffer | null;
  get_camera_label(
    camera: rust_pointer<'camera'>,
  ): rust_pointer<'camera_label'>;
  get_camera_externref(camera_id: number, gpu: rust_pointer<'GPU'>): number;
  get_cameras_count(): number;
  get_camera_direction_ptr(
    camera: rust_pointer<'camera'>,
  ): rust_pointer<'direction'>;
  get_camera_position_ptr(
    camera: rust_pointer<'camera'>,
  ): rust_pointer<'position'>;
  update_camera_position(
    camera: rust_pointer<'camera'>,
    x: number,
    y: number,
    z: number,
  ): void;
  update_camera_direction(
    camera: rust_pointer<'camera'>,
    x: number,
    y: number,
    z: number,
  ): void;
  on_resize(
    width: number,
    height: number,
    pipeline: GPUComputePipeline,
    device_pixel_ratio: number,
    GPU: rust_pointer<'GPU'>,
  ): void;
  get_raw_computepassencoder(
    computepass: rust_pointer<'computepass'>,
  ): GPUComputePassEncoder;
  iterate_binding_layouts(iterator: Rust_Iterator<number>): number;
  move_character(
    character_mesh_id: rust_pointer<'mesh_id'>,
    dt: number,
    x: number,
    y: number,
    z: number,
  ): boolean;
  new_character_mesh(
    scenes: number,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'mesh_id'>;
  set_mesh_externref(
    mesh_id: rust_pointer<'mesh_id'>,
    externref: Externref<false, MainNode>,
  ): void;
  get_impulse_from_id(
    mesh_id: rust_pointer<'mesh_id'>,
  ): rust_pointer<'impulse'>;
  link_renderpass(
    id: number,
    cb: (
      renderBundleEncoder: GPURenderBundleEncoder,
      gpu_buffer: number,
      bind_group_position: rust_pointer<'bind_group_position'>,
      bindgroup_start_index: number,
    ) => void,
    depth_read_only: boolean,
    stencil_read_only: boolean,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'renderbundleencoder'>;
  renderbundle_set_bindgroup(
    renderbundle: rust_pointer<'renderbundleencoder'>,
    index: number,
    bindgroup: rust_pointer<'bind_group_position'>,
    device: GPUDevice,
  ): void;
  render_indexed(
    renderbundle: rust_pointer<'renderbundleencoder'>,
    geometry: rust_pointer<'geometry'>,
    instance_count: number,
    first_index: number,
    base_vertex: number,
    first_instance: number,
    gpu: rust_pointer<'GPU'>,
  ): void;
  renderbundle_set_bindgroup_1(
    renderbundle: rust_pointer<'renderbundleencoder'>,
    index: number,
    bindgroup: rust_pointer<'bind_group_position'>,
    device: GPUDevice,
    dynamic_offset: number,
  ): void;
  renderbundle_set_bindgroup2_1(
    renderbundle: rust_pointer<'renderbundleencoder'>,
    index: number,
    bindgroup: rust_pointer<'bindgroup'>,
    device: GPUDevice,
  ): void;
  renderbundle_set_bindgroup_2(
    renderbundle: rust_pointer<'renderbundleencoder'>,
    index: number,
    bindgroup: rust_pointer<'bind_group_position'>,
    device: GPUDevice,
    dynamic_offset1: number,
    dynamic_offset2: number,
  ): void;
  renderbundle_make_dirty(
    renderbundle: rust_pointer<'renderbundleencoder'>,
  ): void;
  create_collider_sphere(
    collision_radius: number,
  ): rust_pointer<'collider_sphere'>;
  new_arc_rotate_camera(
    initial: boolean,
    camera: rust_pointer<'camera'>,
  ): rust_pointer<'ArcRotateCamera'>;
  restore_arc_rotate_camera(
    controller: rust_pointer<'ArcRotateCamera'>,
    alpha: number,
    beta: number,
    radius: number,
    target_x: number,
    target_y: number,
    target_z: number,
    position_x: number,
    position_y: number,
    position_z: number,
    camera: rust_pointer<'camera'>,
  ): void;
  camera_wheel(
    controller: rust_pointer<'ArcRotateCamera'>,
    delta_y: number,
    ctrl_key: boolean,
  ): void;
  serialize_arcrotatecamera(controller: rust_pointer<'ArcRotateCamera'>): void;
  camera_move(
    controller: rust_pointer<'ArcRotateCamera'>,
    pointer_down_button: number,
    movement_x: number,
    movement_y: number,
  ): void;
  set_movement(
    controller: rust_pointer<'ArcRotateCamera'>,
    kinematic: boolean,
    target_moving_to_x: number,
    target_moving_to_y: number,
    target_moving_to_z: number,
  ): void;
  new_mesh_camera(mesh_id: rust_pointer<'mesh_id'>): rust_pointer<'meshcamera'>;
  new_position_camera(): rust_pointer<'positioncamera'>;
  do_pick(
    id: number,
    pickpipeline: GPUComputePipeline,
    gpu: rust_pointer<'GPU'>,
    cb: (
      x: number,
      y: number,
      z: number,
      mesh_id: number,
      generation: number,
    ) => void,
  ): void;
  get_renderpass_size(
    id: number,
    gpu: rust_pointer<'GPU'>,
  ): rust_pointer<'array'>;
  attach_archrotate_camera_controller(
    camera: rust_pointer<'camera'>,
    controller: rust_pointer<'ArcRotateCamera'>,
  ): void;
  attach_positioncamera_camera_controller(
    camera: rust_pointer<'camera'>,
    controller: rust_pointer<'positioncamera'>,
  ): void;
  attach_meshcamera_camera_controller(
    camera: rust_pointer<'camera'>,
    controller: rust_pointer<'meshcamera'>,
  ): void;
  keyfunction(
    controller: rust_pointer<'positioncamera'>,
    up: boolean,
    ctrl_key: boolean,
    key_ptr: number,
    key_len: number,
    key_cap: number,
  ): void;
  keyfunctionmeshcamera(
    controller: rust_pointer<'meshcamera'>,
    up: boolean,
    key_ptr: number,
    key_len: number,
    key_cap: number,
  ): void;
  get_arrow_keys_down(controller: rust_pointer<'meshcamera'>): number;
  pointer_move_function(
    controller: rust_pointer<'meshcamera'>,
    movement_x: number,
    movement_y: number,
  ): void;
  compare_mesh_id(
    mesh_id: rust_pointer<'mesh_id'>,
    id: number,
    generation: number,
  ): boolean;
  create_ui_texture(
    device: GPUDevice,
    width: number,
    height: number,
  ): rust_pointer<'texture'>;
  get_resolve_target(gpu: rust_pointer<'GPU'>): rust_pointer<'texture'>;
  create_buffer_uniform_copydst(
    device: GPUDevice,
    size: number,
    x: number,
    y: number,
  ): rust_pointer<'buffer'>;
  write_gpu_buffer_uniform_copydst(
    gpu: rust_pointer<'GPU'>,
    buffer: rust_pointer<'buffer'>,
    a: number,
    b: number,
  ): void;
  create_ui_bindgroup(
    device: GPUDevice,
    uniform_buffer: rust_pointer<'buffer'>,
    texture: rust_pointer<'texture'>,
  ): rust_pointer<'bindgroup'>;
  create_water_bindgroup(gpu: rust_pointer<'GPU'>): rust_pointer<'bindgroup'>;
  idb_upgrade_needed(
    cb: rust_pointer<'IDBVersionChangeEvent'>,
    database: IDBDatabase,
    oldVersion: number,
    newVersion: number | null,
  ): void;
  idb_on_blocked(
    cb: rust_pointer<'IDBVersionChangeEvent'>,
    oldVersion: number,
    newVersion: number | null,
  ): void;
  idb_transaction_on_error(
    cb: rust_pointer<'IDBErrorEvent'>,
    error_ptr: number,
    error_len: number,
    error_cap: number,
    event: Event,
  ): void;
  idb_transaction_on_abort(
    cb: rust_pointer<'IDBAbortEvent'>,
    error_ptr: number,
    error_len: number,
    error_cap: number,
    event: Event,
  ): void;
  idb_transaction_on_complete(
    cb: rust_pointer<'IDBCompleteEvent'>,
    event: Event,
  ): void;
  idb_database_transaction_onerror_or_abort(
    cb: rust_pointer<'IDBErrorEvent'>,
    error: string,
  ): void;
  idb_database_version_change(
    cb: rust_pointer<'IDBVersionChangeEvent'>,
    e: Event,
  ): void;
  idb_database_onclose(cb: rust_pointer<'IDBDBCloseEvent'>): void;
  storage_bucket_open(
    cb: rust_pointer<'storagebucketopencb'>,
    storageBucket: NavigatorStorageBuckets,
  ): void;
  serialize_terrain(mesh_id: rust_pointer<'mesh_id'>): void;
} & BufferInterface &
  DevToolsInterface &
  IDBRequestImports &
  FileSystemDirectoryHandleImports &
  FileSystemFileHandleImports &
  FileSystemWritableFileStreamImports;
let deviceId = 0;
type Events =
  | 'pointerdown'
  | 'pointerup'
  | 'pointermove'
  | 'pointerenter'
  | 'pointerleave'
  | 'wheel'
  | 'keydown'
  | 'keyup';

export class Engine {
  /**
   * @deprecated
   */
  public DB: IDBDatabase | undefined = undefined;

  /*
        This is the distance that collision response will set the object after collide.
        It is the constraint that keeps objects together. So when force is applied, the collision occurs.
        For gravity (at 60fps) it must be lower than   9.80665*0.016*0.016 = 0,0027240694444442
        TODO: make other constraints for other forces than gravity
    */

  // registry = new FinalizationRegistry((arr: { byteOffset: number, byteLength: number }) => this.freeMemory(arr));

  readonly physics: Physics;
  readonly scenes: Map<string, Scene> = new Map();

  inputManager: CameraController | null = null;

  GPUReady: Promise<GPU>;
  canvas?: HTMLCanvasElement;
  GPUSubscribions: Set<(gpu: GPU) => void> = new Set();
  TabIndexSubscribions: Set<(element?: UIRectangleNodeHover) => void> =
    new Set();
  GPUSubscribionsOnce: Set<(gpu: GPU) => void> = new Set();
  getGPU(cb: (gpu: GPU) => void, once = false) {
    if (once) this.GPUSubscribionsOnce.add(cb);
    else this.GPUSubscribions.add(cb);
    if (this.gpu) cb(this.gpu);
  }
  tabElement: UIRectangleNodeHover | undefined = undefined;
  getTabIndex(cb: (element?: UIRectangleNodeHover) => void) {
    this.TabIndexSubscribions.add(cb);
    cb(this.tabElement);
  }
  setTabIndex(element?: UIRectangleNodeHover) {
    this.tabElement = element;
    this.TabIndexSubscribions.forEach((cb) => cb(element));
  }
  static async initEngine(
    nodes:
      | {
          canvas: HTMLCanvasElement;
        }
      | undefined,
    showError: (e: Error) => void,
    wasmBinaries: {
      rust: Response | PromiseLike<Response> | BufferSource;
    },
  ): Promise<Engine | void> {
    let rust: WebAssembly.WebAssemblyInstantiatedSource;
    const exportObj: WebAssembly.Imports = {
      FSDirectoryHandle: FileSystemDirectoryHandleInterface,
      FSFileHandle: FileSystemFileHandleInterface,
      FSWritableStream: FileSystemWritableFileStreamInterface,
      WritableStream: WritableStreamInterface,
      bindcommands: BindCommandsInterface,
      bindgroup: BindGroupExports,
      buffer: BufferExports,
      camera: CameraInterface,
      canvas: CanvasInterface,
      chararray: CharArrayInterface,
      commandencoder: CommandEncoderInterface,
      computepassencoder: ComputePassEncoderInterface,
      console: consoleInterface,
      console_legacy: {
        debug_str(ptr: number, length: number) {
          console.debug(
            textDecoder.decode(
              new Uint8Array(
                (rust.instance.exports.memory as WebAssembly.Memory).buffer,
                ptr,
                length,
              ),
            ),
          );
        },
        error_str(ptr: number, length: number) {
          console.error(
            textDecoder.decode(
              new Uint8Array(
                (rust.instance.exports.memory as WebAssembly.Memory).buffer,
                ptr,
                length,
              ),
            ),
          );
        },
        log_str(ptr: number, length: number) {
          console.log(
            textDecoder.decode(
              new Uint8Array(
                (rust.instance.exports.memory as WebAssembly.Memory).buffer,
                ptr,
                length,
              ),
            ),
          );
        },
        warn_str(ptr: number, length: number) {
          console.warn(
            textDecoder.decode(
              new Uint8Array(
                (rust.instance.exports.memory as WebAssembly.Memory).buffer,
                ptr,
                length,
              ),
            ),
          );
        },
      },
      device: DeviceExports,
      env: {
        drop_ref(ref: unknown) {
          /**
           * wasm externref module does not separate dropping references or ownership from externref table,
           * so we need to track if dropped externref was owned by rust or was it a reference
           */
          if (ref instanceof Externref && !ref.ownedByJS) {
            ref.externref.destroy();
          }
        },
        mesh_on_change(mesh: Externref<false, MainNode>) {
          mesh.externref.onMeshChange.forEach((cb) => cb());
        },
        mesh_on_physic_tick(
          mesh: rust_pointer<'mesh'>,
          delta: number,
          externref: Externref<false, MainNode>,
        ) {
          const cb = externref.externref.onPhysicTick;
          if (cb) {
            cb(delta, mesh);
          }
        },
        now() {
          return performance.now();
        },
        pick_cb(
          cb: (
            x: number,
            y: number,
            z: number,
            mesh_id: number,
            generation: number,
          ) => void,
          x: number,
          y: number,
          z: number,
          mesh_id: number,
          generation: number,
        ) {
          cb(x, y, z, mesh_id, generation);
        },
        renderpass_on_resize(
          renderpass: RenderPass,
          width: number,
          height: number,
        ) {
          renderpass.onResize.forEach((cb) => cb(width, height));
        },
        vertices_change({ externref: mesh }: Externref<false, DataNode>) {
          mesh.onVerticesChange();
        },
      },
      gpu: GPUInterface,
      idb_database: IDBDatabaseInterface,
      idb_factory: IDBFactoryInterface,
      idb_objectStore: IDBObjectStoreInterface,
      idb_openDBRequest: IDBOpenDBRequestInterface,
      idb_request: IDBRequestInterface,
      idb_transaction: IDBTransactionInterface,
      queue: QueueInterface,
      renderbundleencoder: RenderbundleEncoderInterface,
      rendercommands: RenderCommandsInterface,
      renderpassencoder: RenderPassEncoderInterface,
      storage_buckets: StorageBucketsInterface,
      string: StringInterface,
      stringarray: StringArrayInterface,
      texture: TextureInterface,
      webgpucontext: CanvasContextInterface,
    };
    try {
      if (
        wasmBinaries.rust instanceof ArrayBuffer ||
        ArrayBuffer.isView(wasmBinaries.rust)
      ) {
        rust = await WebAssembly.instantiate(
          wasmBinaries.rust,
          exportObj,
          //@ts-expect-error TODO in TS
          {
            builtins: ['js-string'],
          },
        );
      } else {
        rust = await WebAssembly.instantiateStreaming(
          wasmBinaries.rust,
          exportObj,
          //@ts-expect-error TODO in TS
          { builtins: ['js-string'] },
        );
      }
      if (!rust.instance.exports.memory) {
        return showError(new Error('No memory exported'));
      }
      var rustWasm = rust.instance.exports as rustWasm;
      if (nodes?.canvas && !window.navigator.gpu) {
        throw new Error('no webgpu support');
      }

      //Init rust wasm
    } catch (e) {
      return showError(createError(e));
    }
    return new Engine(nodes, rustWasm, showError);
  }

  showError(e: unknown) {
    if (e instanceof Error && e.name === 'OperationError') {
      if (
        (e.message.includes('Device') && e.message.includes('is lost')) ||
        (e.cause instanceof Error &&
          e.cause.message.includes('Device') &&
          e.cause.message.includes('is lost')) ||
        e.message === 'Device destroyed before callback' ||
        (e.cause instanceof Error &&
          e.cause.message === 'Device destroyed before callback')
      ) {
        //When device is lost new device will be set in GPU.ts
        console.log(
          'Omit error on lost device, current GPU:',
          engine.gpu?.device.label,
          'destroyed:',
          engine.gpu?.destroyed,
          e,
        );
        return;
      }
      this.showErrorError(e);
      return;
    }
    const error = createError(e);
    this.showErrorError(error);
  }
  gpu: GPU | undefined;
  async createGPU(
    GPUDataSize: number,
    cb: (gpu: GPU) => void,
    adapter: GPUAdapter | null,
  ) {
    const searchParams = new URL(location.href).searchParams;
    let device: GPUDevice | undefined;
    let forceFallbackAdapter =
      searchParams.get('forceFallbackAdapter') === 'true';
    let forceLowPower = searchParams.get('forceLowPower') === 'true';
    do {
      console.log(
        'Getting adapter, low-power:',
        forceLowPower,
        'fallback:',
        forceFallbackAdapter,
      );
      adapter = await window.navigator.gpu.requestAdapter({
        forceFallbackAdapter,
        powerPreference: forceLowPower ? 'low-power' : 'high-performance',
      });
      if (!adapter) {
        if (forceFallbackAdapter && forceLowPower) {
          throw new Error('Could not get adapter');
        }
        console.log('Failed to get adapter');
        // Try with fallback adapter
        if (!forceLowPower && !forceFallbackAdapter) {
          forceFallbackAdapter = true;
        }
        // Did not succeed with fallback adapter, try with low power
        else if (!forceLowPower && forceFallbackAdapter) {
          forceFallbackAdapter = false;
          forceLowPower = true;
        }
        // Did not owrk with low power, try low power with fallback adapter
        else if (forceLowPower && !forceFallbackAdapter) {
          forceFallbackAdapter = true;
        }
        continue;
      }
      try {
        console.log('Getting device');
        device = await adapter.requestDevice({
          label: 'device' + deviceId++,
        });
      } catch (e) {
        console.error(e);
        console.log('Failed to get device');
        if (forceFallbackAdapter) {
          throw new Error('Could not get device');
        }
        forceFallbackAdapter = true;
        continue;
      }
    } while (typeof device === 'undefined');

    device.lost
      .then((reason) => {
        console.error('GPU device lost', reason);
        const newGPU = this.createGPU(GPUDataSize, cb, adapter);
        this.gpu!.onDeviceLost();
        this.gpu = undefined;
        this.GPUReady = newGPU;
      })
      .catch((ee) => {
        if (ee instanceof Error) throw ee;
        else throw new Error(ee);
      });

    const gpu = new GPU(this.canvas!, device, GPUDataSize);
    this.gpu = gpu;

    console.log('new GPU initialized ', device.label);
    cb(gpu);
    return gpu;
  }
  #inputMaps = {
    keydown: new Set<ListenerObj<'keydown'>>(),
    keyup: new Set<ListenerObj<'keyup'>>(),
    pointerdown: new Set<ListenerObj<'pointerdown'>>(),
    pointerenter: new Set<ListenerObj<'pointerenter'>>(),
    pointerleave: new Set<ListenerObj<'pointerleave'>>(),
    pointermove: new Set<ListenerObj<'pointermove'>>(),
    pointerup: new Set<ListenerObj<'pointerup'>>(),
    wheel: new Set<ListenerObj<'wheel'>>(),
  };

  /**
   * Add listener to canvas element.
   * @param obj  The object which adds the listener, this is used to remove listener when object is destroyed
   */
  addInputListener<K extends Events>(obj: ListenerObj<K>) {
    // To ensure that events added while processing events does not trigger in same loop
    queueMicrotask(() => {
      const set = this.#inputMaps[obj.type] as unknown as Set<ListenerObj<K>>;
      if (obj.options?.priority && this.#inputMaps[obj.type].size > 0) {
        (this.#inputMaps[obj.type] as unknown as Set<ListenerObj<K>>) = new Set(
          [obj, ...set],
        );
      } else {
        set.add(obj);
      }
    });
  }
  removeInputListener<
    K extends Events & keyof HTMLElementEventMap = Events &
      keyof HTMLElementEventMap,
  >(listenerObj: ListenerObj<K>) {
    //@ts-expect-error todo
    const removed = this.#inputMaps[listenerObj.type].delete(listenerObj);
    if (!removed) {
      console.warn(
        'Removed',
        listenerObj.type,
        'listener on',
        listenerObj.object,
        'that did not exists',
      );
    }
  }
  clearInputListeners(object: object) {
    Object.values(this.#inputMaps).forEach((set) => {
      [...set].forEach((eventObj) => {
        if (eventObj.object === object) {
          //@ts-expect-error todo
          if (!set.delete(eventObj)) {
            throw new Error('Event didnt exist in set');
          }
        }
      });
    });
  }
  constructor(
    nodes:
      | {
          canvas: HTMLCanvasElement;
        }
      | undefined,
    public rust: rustWasm,
    public showErrorError: (e: Error) => void,
  ) {
    console.log('environment:', globals.env);
    //@ts-expect-error todo
    globalThis.engine = this;

    const GPUDataSize = rust.init_engine2();

    if (nodes) {
      this.canvas = nodes.canvas;
      //@ts-expect-error Way to manually open devtools if UI is not working
      window.openDevTools = function () {
        document
          .querySelector('game-container')!
          .setAttribute('devtools', 'true');
      };
    }

    if (nodes?.canvas) {
      (
        [
          'pointerup',
          'pointerdown',
          'pointermove',
          'wheel',
          'pointerleave',
          'keydown',
          'keyup',
        ] as const
      ).forEach((eventType) => {
        nodes.canvas.addEventListener('pointermove', (e) => {
          engine.rust.set_mouse_position(e.clientX, e.clientY);
        });
        nodes.canvas.addEventListener(
          eventType,
          (e) => {
            /**
             * Iterate UI events first, then other events.
             */
            for (let i = 0, cancelled = false; i < 2; i++) {
              for (const eventObj of this.#inputMaps[eventType]) {
                if (
                  (eventObj.options?.ui ?? false === !i) &&
                  (!cancelled || eventObj.options?.force)
                ) {
                  if (eventObj.options?.once) {
                    //@ts-expect-error todo
                    this.#inputMaps[eventType].delete(eventObj);
                  }
                  //@ts-expect-error todo
                  cancelled = (eventObj.cb(e) ?? false) || cancelled;
                }
              }
            }
          },
          {
            passive: false,
          },
        );
      });
      this.GPUReady = this.createGPU(
        GPUDataSize,
        (gpu) => {
          this.GPUSubscribions.forEach((cb) => {
            cb(gpu);
          });
          this.GPUSubscribionsOnce.forEach((cb) => {
            cb(gpu);
          });
          this.GPUSubscribionsOnce.clear();
          //@ts-expect-error todo
          window.printRenderTarget = () => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            gpu.pickRenderPass.props.colorRenderTargets.gRenderTargetId.renderTarget.texture.print_bitmap();
          };
          //@ts-expect-error todo
          window.printRenderTarget2 = () => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            gpu.renderPassScreen.depthRenderTarget.renderTarget.texture.print_bitmap();
          };
          //@ts-expect-error todo
          window.printRenderTarget3 = () => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            gpu.renderPassScreen.props.colorRenderTargets.gRenderTargetDiffuse.resolveTexture.renderTarget.texture.print_bitmap();
          };
        },
        null,
      );
      const saveControllerState = () => {
        this.inputManager?.serialize();
      };
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) saveControllerState();
      });
      window.addEventListener('beforeunload', saveControllerState);
    } else {
      this.GPUReady = new Promise(() => {
        return;
      });
    }
    this.physics = new Physics(this);
  }
}

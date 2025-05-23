import { Physics } from './physics.js';
import { GPU } from './GPU.js';
import type { Scene } from './Scene.js';
import { TerraCamera } from './TerraCamera.js';
//@ts-expect-error todo
import { ArcRotateCamera } from './controllers/ArcRotateCamera.js';
//@ts-expect-error todo
import { MeshCamera } from './controllers/MeshCamera.js';
import { DataNode } from './nodes/DataNode.js';
import type { CameraController } from './controllers/CameraController.js';
import type { UIRectangleNodeHover } from './ui/UIRectangleNodeHover.js';
import { MainNode, type RigidBody } from './MainNode.js';
import { Buffer, INDEX_BUFFER } from './webgpu-ts/index.js';
import {
  BufferExports,
  type BufferInterface,
} from './wasm-interfaces/BufferInterface.js';
import { Rust_Iterator } from './utils.js';
import { CommandEncoderInterface } from './wasm-interfaces/CommandEncoderInterface.js';
import { Externref } from './externref.js';
import { ComputePassEncoderInterface } from './wasm-interfaces/ComputePassEncoder.js';
import { CameraInterface } from './wasm-interfaces/CameraInterface.js';
import { QueueInterface } from './wasm-interfaces/QueueInterface.js';
import { DeviceExports } from './wasm-interfaces/DeviceInterface.js';
import { DevToolsInterface } from './wasm-interfaces/DevToolsInterface.js';
import { RenderbundleEncoderInterface } from './wasm-interfaces/RenderBundleEncoderInterface.js';
import { BindCommandsInterface } from './wasm-interfaces/BindCommandsInterface.js';

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
  ): rust_pointer<'geometry'>;

  create_octasphere(
    num_subdivisions: number,
    half_width: number,
    half_height: number,
    half_depth: number,
  ): rust_pointer<'geometry'>;
  create_icosphere_geometry(order: number): rust_pointer<'geometry'>;
  process_gpu_queue(
    time: number,
    updateViewPipeline: GPUComputePipeline,
  ): boolean;

  new_mesh_from_js(
    point_light: number,
    directional_light: number,
    scenes: number,
    rigid_body: RigidBody,
    label_ptr: number,
    label_len: number,
    label_cap: number,
    externref: Externref<false, MainNode>,
    camera_can_collide_to: boolean,
  ): rust_pointer<'mesh_id'>;
  create_debug_mesh_wireframe(
    target_mesh_id: rust_pointer<'mesh_id'>,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): rust_pointer<'mesh_id'>;
  create_debug_mesh_normals(
    target_mesh_id: rust_pointer<'mesh_id'>,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): rust_pointer<'mesh_id'>;
  have_rigid_body(mesh_id: rust_pointer<'mesh_id'>): boolean;
  create_legacy_terrain_geometry(
    camera_can_collide_to: boolean,
    static_faces: boolean,
    strip: boolean,
  ): rust_pointer<'geometry'>;
  create_ui_geometry(positions_count: number): rust_pointer<'geometry'>;
  create_water_geometry(): rust_pointer<'geometry'>;
  set_geometry(
    mesh_id: rust_pointer<'mesh_id'>,
    geometry: rust_pointer<'geometry'>,
  ): rust_pointer<'geometry'>;
  get_geometry(mesh_id: rust_pointer<'mesh_id'>): rust_pointer<'geometry'>;
  create_box_geometry(): rust_pointer<'geometry'>;
  create_rtp_geometry(): rust_pointer<'geometry'>;
  create_cone_geometry(faces: number): rust_pointer<'geometry'>;
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
    indices: rust_pointer<'usize'>,
    indices_length: number,
    indices_cap: number,
    vertices: rust_pointer<'position_and_normal_and_uv'>,
    vertices_length: number,
    vertices_cap: number,
  ): void;
  indices_pointer_from_geometry(
    geometry: rust_pointer<'geometry'>,
  ): rust_pointer<'indices'>;
  set_indices_gpu_buffer(
    indices: rust_pointer<'indices'>,
    buffer: Externref<false, Buffer<INDEX_BUFFER>>,
  ): void;
  get_indices_gpu_buffer(
    indices: rust_pointer<'indices'>,
  ): Externref<false, Buffer<INDEX_BUFFER>> | null;
  indices_field_pointer(
    geometry: rust_pointer<'geometry'>,
  ): rust_pointer<rust_vec_ptr<'usize'>>;
  get_indices_pointer(
    indices: rust_pointer<'indices'>,
  ): rust_pointer<rust_vec_ptr<'usize'>>;
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
  update_rotation(
    mesh_id: rust_pointer<'mesh_id'>,
    x: number,
    y: number,
    z: number,
    w: number,
  ): void;
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
  gpu_pointer(mesh_id: rust_pointer<'mesh_id'>): number;
  label_field_pointer(
    mesh_id: rust_pointer<'mesh_id'>,
  ): rust_pointer<'label_field'>;
  translation_pointer(mesh: rust_pointer<'mesh'>): rust_pointer<'translation'>;
  translation_pointer_from_id(
    mesh_id: rust_pointer<'mesh_id'>,
  ): rust_pointer<'translation'>;
  rotation_pointer(mesh_id: rust_pointer<'mesh_id'>): rust_pointer<'rotation'>;
  rotation_pointer_euler(mesh_id: rust_pointer<'mesh_id'>): rust_pointer<'f32'>;
  scale_pointer(mesh_id: rust_pointer<'mesh_id'>): rust_pointer<'scale'>;
  velocity_pointer(mesh: rust_pointer<'mesh'>): rust_pointer<'velocity'>;
  velocity_pointer_from_id(
    mesh_id: rust_pointer<'mesh_id'>,
  ): rust_pointer<'velocity'>;

  scale_x(mesh_id: rust_pointer<'mesh_id'>): number;
  scale_y(mesh_id: rust_pointer<'mesh_id'>): number;
  scale_z(mesh_id: rust_pointer<'mesh_id'>): number;
  vertices_stride(geometry: rust_pointer<'geometry'>): Word<'dword'>;
  set_faces(
    mesh_id: rust_pointer<'mesh_id'>,
    ptr: number,
    length: number,
    cap: number,
  ): void;
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
  create_bounding_box_geometry(
    mesh_id: rust_pointer<'mesh_id'>,
  ): rust_pointer<'geometry'>;

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
  get_gpu(): rust_mutex<'locked', 'gpulock'>;
  get_camera_by_id_mut(
    gpu: rust_mutex<'locked', 'gpulock'>,
    camera_id: number,
  ): rust_mutex<'locked', 'camera'>;
  drop_engine_lock(engine: rust_mutex<'locked', 'enginelock'>): void;
  drop_gpu_lock(gpu: rust_mutex<'locked', 'gpulock'>): void;
  drop_camera_lock(camera: rust_mutex<'locked', 'camera'>): void;
  get_gpu_mesh_buffer(engine: rust_pointer<'gpu'>): number;

  init_gpu(
    device: Externref<true, GPUDevice>,
    queue: GPUQueue,
    layout: GPU['pipelineLayouts']['updateViewLayout'],
    force: boolean,
  ): void;
  push_to_pending_command_buffers(buffer: GPUCommandBuffer): void;
  drain_command_buffers(
    iterator_ptr: Rust_Iterator<GPUCommandBuffer>,
  ): GPUCommandBuffer | null;
  check_mapped_buffers(): boolean;
  add_camera(
    device: Externref<true, GPUDevice>,
    layout: GPU['pipelineLayouts']['updateClustersLayout'],
    layout2: GPU['pipelineLayouts']['uniformBindGroupLayoutWithTime'],
    camera: TerraCamera,
    label_ptr: number,
    label_len: number,
    label_cap: number,
    cluster_layout: GPU['pipelineLayouts']['clustersLayout'],
  ): number;
  add_child_to_camera(
    camera_id: number,
    device: Externref<true, GPUDevice>,
    layout: GPU['pipelineLayouts']['updateClustersLayout'],
    layout2: GPU['pipelineLayouts']['uniformBindGroupLayoutWithTime'],
    camera: TerraCamera,
    label_ptr: number,
    label_len: number,
    label_cap: number,
    cluster_layout: GPU['pipelineLayouts']['clustersLayout'],
  ): number;
  add_child_to_camera_water(
    camera_id: number,
    device: Externref<true, GPUDevice>,
    layout: GPU['pipelineLayouts']['updateClustersLayout'],
    layout2: GPU['pipelineLayouts']['uniformBindGroupLayoutWithTime'],
    camera: TerraCamera,
    label_ptr: number,
    label_len: number,
    label_cap: number,
    cluster_layout: GPU['pipelineLayouts']['clustersLayout'],
  ): number;
  get_camera_label(camera_id: number): rust_pointer<'camera_label'>;
  get_camera_externref(camera_id: number): number;
  get_cameras_count(): number;
  get_camera_direction_ptr(
    camera: rust_mutex<'locked', 'camera'>,
  ): rust_pointer<'direction'>;
  get_camera_position_ptr(
    camera: rust_mutex<'locked', 'camera'>,
  ): rust_pointer<'position'>;
  get_camera_view_ptr(
    camera: rust_mutex<'locked', 'camera'>,
  ): rust_pointer<'camera_view'>;
  get_camera_projection_inverted_ptr(
    camera: rust_mutex<'locked', 'camera'>,
  ): rust_pointer<'camera_projection_inverted'>;

  update_camera_projection_view_inverted(camera_id: number): void;
  update_camera_position(
    camera: rust_mutex<'locked', 'camera'>,
    x: number,
    y: number,
    z: number,
  ): void;
  update_camera_direction(
    camera: rust_mutex<'locked', 'camera'>,
    x: number,
    y: number,
    z: number,
  ): void;
  on_resize(aspect_ratio: number): rust_pointer<'computepass'>;
  get_raw_computepassencoder(
    computepass: rust_pointer<'computepass'>,
  ): GPUComputePassEncoder;
  iterate_bindings(iterator: Rust_Iterator<number>): number;
  move_character(
    character_mesh_id: rust_pointer<'mesh_id'>,
    dt: number,
    x: number,
    y: number,
    z: number,
  ): boolean;
  new_character_mesh(
    scenes: number,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): rust_pointer<'mesh_id'>;
  set_mesh_externref(
    mesh_id: rust_pointer<'mesh_id'>,
    externref: Externref<false, MainNode>,
  ): void;
  rebuild_triangle_planes(geometry: rust_pointer<'geometry'>): void;
  get_impulse_from_id(
    mesh_id: rust_pointer<'mesh_id'>,
  ): rust_pointer<'impulse'>;

  new_renderbundle(
    descriptor: GPURenderBundleEncoderDescriptor,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): rust_pointer<'renderbundleencoder'>;
  renderbundle_set_bindgroup(
    renderbundle: rust_pointer<'renderbundleencoder'>,
    index: number,
    gpu_lock: rust_pointer<'gpu'>,
    camera_id: number,
  ): void;
  renderbundle_make_dirty(
    renderbundle: rust_pointer<'renderbundleencoder'>,
  ): void;
  record_renderbundle(
    renderbundle: rust_pointer<'renderbundleencoder'>,
    gpu: rust_pointer<'gpu'>,
    cb: (renderBundleEncoder: GPURenderBundleEncoder) => void,
  ): number;
  create_collider_sphere(
    collision_radius: number,
  ): rust_pointer<'collider_sphere'>;
  set_bindgroup_computepassencoder(
    gpu: rust_mutex<'locked', 'gpulock'>,
    camera_id: number,
    device: Externref<true, GPUDevice>,
    index: number,
    computepass: rust_pointer<'computepass'>,
  ): void;
  end_and_submit(computepass: rust_pointer<'computepass'>): void;
  new_arc_rotate_camera(
    initial: boolean,
    camera_id: number,
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
    camera_id: number,
  ): void;
  camera_wheel(
    controller: rust_pointer<'ArcRotateCamera'>,
    delta_y: number,
    ctrl_key: boolean,
  ): void;
  camera_move(
    controller: rust_pointer<'ArcRotateCamera'>,
    pointer_down_button: number,
    movement_x: number,
    movement_y: number,
  ): void;
  get_alpha(controller: rust_pointer<'ArcRotateCamera'>): number;
  get_beta(controller: rust_pointer<'ArcRotateCamera'>): number;
  get_radius(controller: rust_pointer<'ArcRotateCamera'>): number;
  set_movement(
    controller: rust_pointer<'ArcRotateCamera'>,
    kinematic: boolean,
    target_moving_to_x: number,
    target_moving_to_y: number,
    target_moving_to_z: number,
  ): void;
  get_target_ptr(
    controller: rust_pointer<'ArcRotateCamera'>,
  ): rust_pointer<'target'>;
  new_mesh_camera(
    canvas_width: number,
    mesh_id: rust_pointer<'mesh_id'>,
  ): rust_pointer<'meshcamera'>;
  update_canvas_width(
    mesh_camera: rust_pointer<'meshcamera'>,
    canvas_width: number,
  ): void;
  new_position_camera(): rust_pointer<'positioncamera'>;
  attach_archrotate_camera_controller(
    camera: rust_mutex<'locked', 'camera'>,
    controller: rust_pointer<'ArcRotateCamera'>,
  ): void;
  attach_positioncamera_camera_controller(
    camera: rust_mutex<'locked', 'camera'>,
    controller: rust_pointer<'positioncamera'>,
  ): void;
  attach_meshcamera_camera_controller(
    camera: rust_mutex<'locked', 'camera'>,
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
} & BufferInterface &
  DevToolsInterface;
const ObjectStores = {
  maps: <ObjStoreDetails>{
    parameters: {
      autoIncrement: true,
      keyPath: 'id',
    },
    version: 4,
  },
  plantae: <ObjStoreDetails>{
    indices: [
      {
        keyPath: 'family',
        name: 'family',
        options: {
          unique: false,
        },
        version: 3,
      },
      {
        keyPath: 'x',
        name: 'x',
        options: {
          unique: false,
        },
        version: 6,
      },
      {
        keyPath: 'grid',
        name: 'grid',
        options: {
          unique: false,
        },
        version: 6,
      },
      {
        keyPath: ['gridx', 'gridz'],
        name: 'gridxz',
        options: {
          unique: false,
        },
        version: 6,
      },
    ],
    parameters: {
      autoIncrement: true,
      keyPath: 'id',
    },
    version: 2,
  },
  save: <ObjStoreDetails>{
    parameters: {
      autoIncrement: false,
      keyPath: ['type', 'name'],
    },
    version: 3,
  },
  zones: <ObjStoreDetails>{
    parameters: {
      autoIncrement: true,
      keyPath: 'id',
    },
    version: 1,
  },
};

type ObjectStore = keyof typeof ObjectStores;
interface EarthTransaction extends IDBTransaction {
  objectStore(name: ObjectStore): IDBObjectStore;
}

interface EarthDatabase extends IDBDatabase {
  transaction<T extends ObjectStore>(
    storeNames: T,
    mode?: IDBTransactionMode,
  ): EarthTransaction;
  transaction<T extends ObjectStore[]>(
    storeNames: T,
    mode?: IDBTransactionMode,
  ): EarthTransaction;
  createObjectStore(
    name: ObjectStore,
    optionalParameters?: IDBObjectStoreParameters,
  ): IDBObjectStore;
}
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
    let DB: Promise<EarthDatabase> | undefined = undefined;
    if (typeof indexedDB === 'object') {
      DB = new Promise<EarthDatabase>(function (res) {
        const IDB = indexedDB.open('TerraSim', 6);
        IDB.onerror = function (e) {
          showError(createError(e));
        };
        IDB.onupgradeneeded = function (e) {
          console.log('IDBVersionChangeEvent', e);
          // Save the IDBDatabase interface
          const db: EarthDatabase = this.result;

          (<(keyof typeof ObjectStores)[]>Object.keys(ObjectStores)).forEach(
            (objstore) => {
              let createdStore: IDBObjectStore;
              if (ObjectStores[objstore].version > e.oldVersion) {
                createdStore = db.createObjectStore(
                  objstore,
                  ObjectStores[objstore].parameters,
                );
              } else {
                if (!this.transaction) throw new Error('No transaction');
                createdStore = this.transaction.objectStore(objstore);
              }
              let indices: ObjStoreIndex[] | undefined;
              if ((indices = ObjectStores[objstore].indices)) {
                indices.forEach((index) => {
                  if (e.oldVersion < index.version) {
                    createdStore.createIndex(
                      index.name,
                      index.keyPath,
                      index.options,
                    );
                  }
                });
              }
            },
          );
        };
        IDB.onsuccess = function () {
          this.result.onerror = function (e) {
            console.log(e, (<IDBRequest>e.target).error!.message);
          };
          res(this.result);
        };
      });
    }

    let rust: WebAssembly.WebAssemblyInstantiatedSource;
    const exportObj: WebAssembly.Imports = {
      bindcommands: BindCommandsInterface,
      buffer: BufferExports,
      camera: CameraInterface,
      commandencoder: CommandEncoderInterface,
      computepassencoder: ComputePassEncoderInterface,
      console: {
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
        render_renderpasses(
          renderloop_commandEncoder: GPUCommandEncoder,
          rust_gpu: rust_pointer<'gpu'>,
        ) {
          engine.gpu!.renderRenderPasses(renderloop_commandEncoder, rust_gpu);
        },
        vertices_change({ externref: mesh }: Externref<false, DataNode>) {
          mesh.onVerticesChange();
        },
      },
      queue: QueueInterface,
      renderbundleencoder: RenderbundleEncoderInterface,
    };
    try {
      if (
        wasmBinaries.rust instanceof ArrayBuffer ||
        ArrayBuffer.isView(wasmBinaries.rust)
      ) {
        rust = await WebAssembly.instantiate(wasmBinaries.rust, exportObj);
      } else {
        rust = await WebAssembly.instantiateStreaming(
          wasmBinaries.rust,
          exportObj,
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
    return new Engine(DB ? await DB : undefined, nodes, rustWasm, showError);
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
    public DB: EarthDatabase | undefined,
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
      document.addEventListener('visibilitychange', saveControllerState);
      window.addEventListener('beforeunload', saveControllerState);
    } else {
      this.GPUReady = new Promise(() => {
        return;
      });
    }
    this.physics = new Physics(this);
  }
}

import { Physics } from './physics.js';
import { GPU } from './GPU.js';
import { ColliderJS } from './Collider.js';
import type { Scene } from './Scene.js';
import type { TerraVector3 } from './Math.js';
import { TerraCamera } from './TerraCamera.js';
//@ts-expect-error todo
import { ArcRotateCamera } from './controllers/ArcRotateCamera.js';
//@ts-expect-error todo
import { MeshCamera } from './controllers/MeshCamera.js';
import { closeDistanceSquared, DataNode, Ellipsoid } from './nodes/DataNode.js';
import type { CameraController } from './controllers/CameraController.js';
import type { UIRectangleNodeHover } from './ui/UIRectangleNodeHover.js';
import { MainNode, type RigidBody } from './MainNode.js';
import { Buffer, BufferUsageEnums, INDEX_BUFFER } from './webgpu-ts/index.js';
import {
  BufferExports,
  type BufferInterface,
} from './wasm-interfaces/BufferInterface.js';
import { Rust_Iterator, stringFromPtr } from './utils.js';
import { CommandEncoderInterface } from './wasm-interfaces/CommandEncoderInterface.js';
import { Externref } from './externref.js';
import { ComputePassEncoderInterface } from './wasm-interfaces/ComputePassEncoder.js';
import { CameraInterface } from './wasm-interfaces/CameraInterface.js';
import { QueueInterface } from './wasm-interfaces/QueueInterface.js';
import { DeviceExports } from './wasm-interfaces/DeviceInterface.js';
import { DevToolsInterface } from 'wasm-interfaces/DevToolsInterface.js';

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
  add_drawble(mesh_id: number): void;
  set_drawble_direct(
    mesh_id: number,
    instance_count: number,
    first_instance: number,
  ): void;
  get_instance_count(mesh_id: number): number;
  get_first_instance(mesh_id: number): number;
  set_instance_count(mesh_id: number, instance_count: number): void;
  set_first_instance(mesh_id: number, first_instance: number): void;

  create_tiled_mesh_geometry(
    width: number,
    height: number,
  ): rust_pointer<'geometry'>;

  create_octasphere(
    num_subdivisions: number,
    half_width: number,
    half_height: number,
    half_depth: number,
  ): rust_pointer<'geometry'>;
  create_icosphere_geometry(order: number): rust_pointer<'geometry'>;
  collider(): rust_pointer<'legacy_collider'>;
  intersection_point_pointer(
    collider_ptr: rust_pointer<'legacy_collider'>,
  ): number;
  lowest_root_pointer(
    collider_ptr: rust_pointer<'legacy_collider'>,
  ): rust_pointer<'lowestroot'>;
  collision_point_pointer(
    collider_ptr: rust_pointer<'legacy_collider'>,
  ): rust_pointer<'collissionpoint'>;

  collision_resolved_pointer(
    collider_ptr: rust_pointer<'legacy_collider'>,
  ): number;
  nearest_distance_squared_pointer(
    collider_ptr: rust_pointer<'legacy_collider'>,
  ): number;
  set_nearest_distance_squared(
    collider_ptr: rust_pointer<'legacy_collider'>,
    distance: number,
  ): void;
  get_nearest_distance_squared(
    collider_ptr: rust_pointer<'legacy_collider'>,
  ): number;
  scaled_position_pointer(
    collider_ptr: rust_pointer<'legacy_collider'>,
  ): number;
  scaled_velocity_pointer(
    collider_ptr: rust_pointer<'legacy_collider'>,
  ): number;
  collided_mesh_pointer(collider_ptr: rust_pointer<'legacy_collider'>): number;
  collided_point_in_triangle_pointer(
    collider_ptr: rust_pointer<'legacy_collider'>,
  ): rust_pointer<'Plane'>;
  //set_collided_point_in_triangle_pointer(collider_ptr: rust_pointer<"legacy_collider">, plane: rust_pointer<'Plane'>): void
  collision_found(
    collider_ptr: rust_pointer<'legacy_collider'>,
    t: number,
    velocitySquaredLength: number,
    collided_point_in_triangle: boolean,
    collided_plane: number,
  ): void;
  set_speed(collider_ptr: rust_pointer<'legacy_collider'>, speed: number): void;
  basepoint_world_pointer(
    collider_ptr: rust_pointer<'legacy_collider'>,
  ): number;
  process_gpu_queue(updateViewPipeline: GPUComputePipeline): boolean;

  new_mesh_from_js(
    point_light: number,
    directional_light: number,
    scenes: number,
    rigid_body: RigidBody,
    label_ptr: number,
    label_len: number,
    label_cap: number,
    externref: Externref<false, MainNode>,
  ): number;
  create_debug_mesh_wireframe(
    target_mesh_id: number,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): number;
  create_debug_mesh_normals(
    target_mesh_id: number,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): number;
  have_rigid_body(mesh_id: number): boolean;
  create_geometry(
    has_bounding: boolean,
    character_can_collide_to: boolean,
    static_faces: boolean,
    strip: boolean,
  ): rust_pointer<'geometry'>;
  create_legacy_terrain_geometry(
    has_bounding: boolean,
    character_can_collide_to: boolean,
    static_faces: boolean,
    strip: boolean,
  ): rust_pointer<'geometry'>;
  create_ui_geometry(positions_count: number): rust_pointer<'geometry'>;
  create_water_geometry(): rust_pointer<'geometry'>;
  set_geometry(
    mesh_id: number,
    geometry: rust_pointer<'geometry'>,
  ): rust_pointer<'geometry'>;
  get_geometry(mesh_id: number): rust_pointer<'geometry'>;
  create_box_geometry(): rust_pointer<'geometry'>;
  create_rtp_geometry(): rust_pointer<'geometry'>;
  create_cone_geometry(faces: number): rust_pointer<'geometry'>;
  add_collider(mesh_id: number, collider: rust_pointer<'collider'>): void;
  memory: WebAssembly.Memory;
  set_vertices(
    geometry: rust_pointer<'geometry'>,
    ptr: rust_pointer<'f32'>,
    length: number,
    cap: number,
    vertices_stride: Word<'dword'>,
  ): void;
  set_position_vertices(
    geometry: rust_pointer<'geometry'>,
    ptr: rust_pointer<'position'>,
    length: number,
    cap: number,
  ): void;
  set_position_and_normal_vertices(
    geometry: rust_pointer<'geometry'>,
    ptr: rust_pointer<'position_and_normal'>,
    length: number,
    cap: number,
  ): void;
  vertices_pointer(geometry: rust_pointer<'geometry'>): rust_pointer<'f32'>;
  set_indices_and_vertices_PositionAndNormalAndUV(
    mesh_id: number,
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

  last_collider_world_vertices_pointer(
    geometry: rust_pointer<'geometry'>,
  ): number;
  vertices_count(geometry: rust_pointer<'geometry'>): number;
  have_vertices(mesh_id: number): boolean;
  faces_count(mesh_id: number): number;
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
    mesh_id: number,
    x: number,
    y: number,
    z: number,
    w: number,
  ): void;
  update_euler_angles(mesh_id: number, x: number, y: number, z: number): void;
  update_translation(mesh_id: number, x: number, y: number, z: number): void;
  apply_impulse(mesh_id: number, x: number, y: number, z: number): void;
  update_dynamic_buffer(mesh: rust_pointer<'mesh'>): void;
  update_dynamic_buffer_from_id(mesh_id: number): void;

  gpu_alignment(mesh_id: number): number;
  positions_count(mesh_id: number): number;
  set_positions_count(mesh_id: number, positions_count: number): number;
  strip(mesh_id: number): number;
  collider_planes_parallel_pointer(
    mesh_id: number,
  ): rust_pointer<'collider_planes_parallel_pointer'>;
  gpu_pointer(mesh_id: number): number;
  label_field_pointer(mesh_id: number): rust_pointer<'label_field'>;
  translation_pointer(mesh: rust_pointer<'mesh'>): rust_pointer<'translation'>;
  translation_pointer_from_id(mesh_id: number): rust_pointer<'translation'>;
  rotation_pointer(mesh_id: number): rust_pointer<'rotation'>;
  rotation_pointer_euler(mesh_id: number): rust_pointer<'f32'>;
  scale_pointer(mesh_id: number): rust_pointer<'scale'>;
  velocity_pointer(mesh: rust_pointer<'mesh'>): rust_pointer<'velocity'>;
  velocity_pointer_from_id(mesh_id: number): rust_pointer<'velocity'>;

  intersect_box_aa_sphere(
    mesh_id: number,
    collider_ptr: number,
    radius: number,
  ): boolean;
  scale_x(mesh_id: number): number;
  scale_y(mesh_id: number): number;
  scale_z(mesh_id: number): number;
  vertices_stride(geometry: rust_pointer<'geometry'>): Word<'dword'>;
  set_faces(mesh_id: number, ptr: number, length: number, cap: number): void;
  set_color(
    mesh: rust_pointer<'mesh'>,
    d0: number,
    d1: number,
    d2: number,
    d3: number,
  ): void;
  set_color_from_id(
    mesh_id: number,
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
  set_ambient_from_id(mesh_id: number, r: number, g: number, b: number): void;
  set_shadow(mesh: rust_pointer<'mesh'>, shadow: number): void;
  set_shadow_from_id(mesh_id: number, shadow: number): void;
  collider_faces_pointer(mesh_id: number): rust_pointer<'collider_faces'>;
  set_scenes(mesh_id: number, scenes: number): void;
  calculate_normals(mesh_id: number): void;
  update_scale_and_rotation(
    mesh_id: number,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    rw: number,
  ): void;
  faces_pointer(mesh_id: number): number;
  create_bounding_box_geometry(mesh_id: number): rust_pointer<'geometry'>;

  create_elevator(mesh_id: number): rust_pointer<'elevator'>;
  destroy_elevator(elevator_ptr: rust_pointer<'elevator'>): void;
  mouse_position_pointer(elevator_ptr: rust_pointer<'elevator'>): number;
  elevate(
    elevator_ptr: rust_pointer<'elevator'>,
    mesh_id: number,
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
    mesh_id: number,
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
  add_onchange_callback(mesh_id: number): number;
  remove_onchange_callback(mesh_id: number, cb: number): void;
  get_engine(): rust_mutex<'locked', 'enginelock'>;
  get_gpu(): rust_mutex<'locked', 'gpulock'>;
  drop_engine_lock(engine: rust_mutex<'locked', 'enginelock'>): void;
  drop_gpu_lock(engine: rust_mutex<'locked', 'gpulock'>): void;
  get_gpu_mesh_buffer(engine: rust_pointer<'gpu'>): number;
  get_gpu_projection_buffer_from_mutex(
    engine: rust_mutex<'locked', 'gpulock'>,
  ): Externref<false, Buffer<(typeof BufferUsageEnums)['UNIFORM']>>;
  get_gpu_projection_buffer(
    engine: rust_pointer<'gpu'>,
  ): Externref<false, Buffer<(typeof BufferUsageEnums)['UNIFORM']>>;

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
    camera: TerraCamera,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): number;
  add_child_to_camera(
    camera_id: number,
    device: Externref<true, GPUDevice>,
    layout: GPU['pipelineLayouts']['updateClustersLayout'],
    camera: TerraCamera,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): number;
  add_child_to_camera_water(
    camera_id: number,
    device: Externref<true, GPUDevice>,
    layout: GPU['pipelineLayouts']['updateClustersLayout'],
    camera: TerraCamera,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): number;
  get_camera_label(camera_id: number): rust_pointer<'camera_label'>;
  get_camera_externref(
    cameras: rust_mutex<'locked', 'gpulock'>,
    camera_id: number,
  ): TerraCamera;
  get_cameras_count(): number;
  get_camera_direction_ptr(camera_id: number): rust_pointer<'direction'>;
  get_camera_position_ptr(camera_id: number): rust_pointer<'position'>;
  get_camera_view_ptr(camera_id: number): rust_pointer<'camera_view'>;
  get_camera_projection_inverted_ptr(
    camera_id: number,
  ): rust_pointer<'camera_projection_inverted'>;
  get_camera_buffer(cameras: rust_pointer<'gpu'>, camera_id: number): number;
  get_camera_cluster_buffer_from_mutex(
    cameras: rust_mutex<'locked', 'gpulock'>,
    camera_id: number,
  ): number;
  get_camera_cluster_buffer(
    cameras: rust_pointer<'gpu'>,
    camera_id: number,
  ): number;

  update_camera_projection_view_inverted(camera_id: number): void;
  update_camera_position(
    camera_id: number,
    x: number,
    y: number,
    z: number,
  ): void;
  update_camera_direction(
    camera_id: number,
    x: number,
    y: number,
    z: number,
  ): void;
  on_resize(aspect_ratio: number): void;
  iterate_bindings(iterator: Rust_Iterator<number>): number;
  collisions_transform_matrix_ptr(
    geometry: rust_pointer<'geometry'>,
  ): rust_pointer<'matrix'>;
  check_collision(geometry: rust_pointer<'geometry'>): void;
  update_collider_planes(geometry: rust_pointer<'geometry'>): void;
  move_character(dt: number, x: number, y: number, z: number): void;
  new_character_mesh(
    scenes: number,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): number;
  set_mesh_externref(
    mesh_id: number,
    externref: Externref<false, MainNode>,
  ): void;
  rebuild_triangle_planes(geometry: rust_pointer<'geometry'>): void;
} & BufferInterface &
  DevToolsInterface;

function Dot(
  left: readonly [number, number, number] | Float32Array | TerraVector3,
  right: readonly [number, number, number] | Float32Array | TerraVector3,
): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}
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
interface ColliderWasm {
  construct(
    collisionFound: number,
    nearestDistanceSquaredPointer: number,
    collidedMeshPointer: number,
    velocity: number,
    basePoint: number,
    collidedPointInTrianglePointer: number,
    rust_collider_ptr: rust_pointer<'legacy_collider'>,
    lowest_root_ptr: rust_pointer<'lowestroot'>,
  ): void;
  memory: WebAssembly.Memory;
  testTriangles: (
    position: rust_pointer<'collider_faces'>,
    positionParallel: rust_pointer<'collider_planes_parallel_pointer'>,
    length: number,
    meshID: number,
  ) => void;
  _initialize: () => void;
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
  // readonly collisionNotFound:DataView
  //@ts-expect-error todo
  readonly #collidedMesh: DataView;
  readonly collider: ColliderJS;

  readonly #destinationPoint: [number, number, number] = [0, 0, 0];
  readonly #displacementVector: [number, number, number] = [0, 0, 0];

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
      collider: Response | PromiseLike<Response> | BufferSource;
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
    let colliderWasm: WebAssembly.WebAssemblyInstantiatedSource;
    const exportObj: WebAssembly.Imports = {
      buffer: BufferExports,
      camera: CameraInterface,
      commandencoder: CommandEncoderInterface,
      computepassencoder: ComputePassEncoderInterface,
      console: {
        error(ptr: number) {
          console.error(stringFromPtr(rust.instance.exports.memory, ptr));
        },
        log(ptr: number) {
          console.log(stringFromPtr(rust.instance.exports.memory, ptr));
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
        log_u32(n: number) {
          console.log(n);
        },
        log_usize(n: number) {
          console.log(n);
        },
        warn(ptr: number) {
          console.warn(stringFromPtr(rust.instance.exports.memory, ptr));
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
        jspanic(ptr: number) {
          if (!(rust.instance.exports.memory instanceof WebAssembly.Memory)) {
            throw new Error('Webassembly module does not have memory');
          }
          console.error(
            textDecoder
              .decode(
                new Uint8Array(rust.instance.exports.memory.buffer, ptr, 512),
              )
              .trimEnd(),
          );
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
        verticesChange(mesh_id: number) {
          const mesh = DataNode.Meshes.get(mesh_id);
          if (mesh) {
            mesh.onVerticesChange();
          }
        },
      },
      queue: QueueInterface,
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

      const colliderExportObj = {
        console: {
          error: function (line: number) {
            console.error('Some error in webassembly on line', line);
            throw new Error('Some error in webassembly on line ' + line);
          },
          log: function (arg: string) {
            console.log(arg);
          },
        },
        env: {
          memory: rust.instance.exports.memory,
        },
        rust: rust.instance.exports,
      };
      if (
        wasmBinaries.collider instanceof ArrayBuffer ||
        ArrayBuffer.isView(wasmBinaries.collider)
      ) {
        colliderWasm = await WebAssembly.instantiate(
          wasmBinaries.collider,
          colliderExportObj,
        );
      } else {
        colliderWasm = await WebAssembly.instantiateStreaming(
          wasmBinaries.collider,
          colliderExportObj,
        );
      }

      //Init rust wasm
    } catch (e) {
      return showError(createError(e));
    }
    const wasm = colliderWasm.instance.exports as unknown as ColliderWasm;
    return new Engine(
      DB ? await DB : undefined,
      nodes,
      wasm,
      rustWasm,
      showError,
    );
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
    public wasm: ColliderWasm,
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

          gpu.pickRenderPass.perspectiveCameras.push(gpu.mainCamera);
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

    this.collider = new ColliderJS(rust);

    //TODO: this does not work after memory grow
    this.#collidedMesh = new DataView(
      this.rust.memory.buffer,
      engine.rust.collided_mesh_pointer(this.collider.collider_ptr),
      4,
    );
    wasm.construct(
      engine.rust.collision_resolved_pointer(this.collider.collider_ptr),
      engine.rust.nearest_distance_squared_pointer(this.collider.collider_ptr),
      engine.rust.collided_mesh_pointer(this.collider.collider_ptr),
      engine.rust.scaled_velocity_pointer(this.collider.collider_ptr),
      engine.rust.scaled_position_pointer(this.collider.collider_ptr),
      engine.rust.collided_point_in_triangle_pointer(
        this.collider.collider_ptr,
      ),
      this.collider.collider_ptr,
      engine.rust.lowest_root_pointer(this.collider.collider_ptr),
    );
  }
  #getFinalPosition(
    sphere: Ellipsoid,
    scaledPosition: TerraVector3,
    scaledVelocity: TerraVector3,
  ): [number, number, number] | TerraVector3 {
    this.collider.didCollide = false;
    for (let i = 0; i < 3; i++) {
      //TODO: really, here inside the loop?
      //TODO: Remove this JS initialize
      /*this.collider._initialize(
        scaledPosition,
        scaledVelocity,
        closeDistance,
        sphere,
      );*/

      //TODO: Velocity and position might change during async operation, so do not give a pointer but copy
      this.wasm._initialize();
      // this.wasmSIMD._initialize(velocity.byteOffset, position.byteOffset)

      // const normalizedVelocity = new TerraVector3([velocity[0], velocity[1], velocity[2]]).normalize();
      if (sphere instanceof DataNode) {
        DataNode.CharacterCanCollideMeshes.forEach((mesh) => {
          if (sphere !== mesh) mesh.checkCollision(this.collider, sphere);
        });
      } else {
        DataNode.CharacterCanCollideMeshes.forEach((mesh) => {
          mesh.checkCollision(this.collider, sphere);
        });
      }
      this.#destinationPoint[0] = scaledPosition[0] + scaledVelocity[0];
      this.#destinationPoint[1] = scaledPosition[1] + scaledVelocity[1];
      this.#destinationPoint[2] = scaledPosition[2] + scaledVelocity[2];

      if (this.collider.collision_resolved) {
        //this.collider.finalPosition.set(scaledPosition);
        return this.#destinationPoint;
      }
      this.collider.didCollide = true;
      if (sphere instanceof DataNode) sphere.colliding_character = true;
      const intersectionPoint = this.collider.intersectionPointWasm;
      //console.log('collision found')
      if (
        scaledVelocity[0] !== 0 ||
        scaledVelocity[1] !== 0 ||
        scaledVelocity[2] !== 0
      ) {
        //this.collider._getResponse(position, velocity);
        // https://arxiv.org/ftp/arxiv/papers/1211/1211.0059.pdf
        // vel.scaleInPlace((this._nearestDistance / vel.length()));
        let scale = Math.sqrt(
          this.collider.nearest_distance_squared /
            (scaledVelocity[0] * scaledVelocity[0] +
              scaledVelocity[1] * scaledVelocity[1] +
              scaledVelocity[2] * scaledVelocity[2]),
        );
        // let scale = this.#nearestDistanceSquared / (vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
        scaledVelocity[0] *= scale;
        scaledVelocity[1] *= scale;
        scaledVelocity[2] *= scale;

        scaledPosition[0] += scaledVelocity[0];
        scaledPosition[1] += scaledVelocity[1];
        scaledPosition[2] += scaledVelocity[2];

        //pos.subtractToRef(this.intersectionPoint, this._slidePlaneNormal);

        if (this.collider.collided_point_in_triangle) {
          //TODO: this does not work on ellipsoid space.
          this.collider._slidePlaneNormal[0] =
            this.collider.collided_point_in_triangle[0];
          this.collider._slidePlaneNormal[1] =
            this.collider.collided_point_in_triangle[1];
          this.collider._slidePlaneNormal[2] =
            this.collider.collided_point_in_triangle[2];
        } else {
          this.collider._slidePlaneNormal[0] =
            scaledPosition[0] - intersectionPoint[0];
          this.collider._slidePlaneNormal[1] =
            scaledPosition[1] - intersectionPoint[1];
          this.collider._slidePlaneNormal[2] =
            scaledPosition[2] - intersectionPoint[2];

          // this._slidePlaneNormal.normalize();
          // const length = Math.sqrt(this.collider._slidePlaneNormal[0] * this.collider._slidePlaneNormal[0] + this.collider._slidePlaneNormal[1] * this.collider._slidePlaneNormal[1] + this.collider._slidePlaneNormal[2] * this.collider._slidePlaneNormal[2]);
          const length = Math.hypot(
            this.collider._slidePlaneNormal[0],
            this.collider._slidePlaneNormal[1],
            this.collider._slidePlaneNormal[2],
          );

          if (!(length === 0 || length === 1.0)) {
            const norm = 1 / length;
            this.collider._slidePlaneNormal[0] *= norm;
            this.collider._slidePlaneNormal[1] *= norm;
            this.collider._slidePlaneNormal[2] *= norm;
          }
        }

        this.#displacementVector[0] =
          this.collider._slidePlaneNormal[0] * sphere.closeDistanceVector[0];
        this.#displacementVector[1] =
          this.collider._slidePlaneNormal[1] * sphere.closeDistanceVector[1];
        this.#displacementVector[2] =
          this.collider._slidePlaneNormal[2] * sphere.closeDistanceVector[2];
        // pos.addInPlace(this._displacementVector);
        /*
                    displacementVector is a constraint added to position, so eg. objects that are colliding
                    ground because of gravity, will "flow" of amount of displacementVector.
                    It must be small enought so same force applied from displacement position would cause collide.
                    Otherwise object would constantry jumping on ground.
                */
        scaledPosition[0] += this.#displacementVector[0];
        scaledPosition[1] += this.#displacementVector[1];
        scaledPosition[2] += this.#displacementVector[2];
        //this.intersectionPoint.addInPlace(this._displacementVector);
        intersectionPoint[0] += this.#displacementVector[0];
        intersectionPoint[1] += this.#displacementVector[1];
        intersectionPoint[2] += this.#displacementVector[2];

        const d = -(
          this.collider._slidePlaneNormal[0] * intersectionPoint[0] +
          this.collider._slidePlaneNormal[1] * intersectionPoint[1] +
          this.collider._slidePlaneNormal[2] * intersectionPoint[2]
        );
        scale =
          Dot(this.#destinationPoint, this.collider._slidePlaneNormal) + d;

        this.#destinationPoint[0] -= this.collider._slidePlaneNormal[0] * scale;
        this.#destinationPoint[1] -= this.collider._slidePlaneNormal[1] * scale;
        this.#destinationPoint[2] -= this.collider._slidePlaneNormal[2] * scale;

        //this._destinationPoint.subtractToRef(this.intersectionPoint, vel);
        scaledVelocity[0] = this.#destinationPoint[0] - intersectionPoint[0];
        scaledVelocity[1] = this.#destinationPoint[1] - intersectionPoint[1];
        scaledVelocity[2] = this.#destinationPoint[2] - intersectionPoint[2];
      }

      const unScaledVelocity = [
        scaledVelocity[0] * sphere.radius[0],
        scaledVelocity[1] * sphere.radius[1],
        scaledVelocity[2] * sphere.radius[2],
      ] as const;
      // if (Math.hypot(velocity[0], velocity[1], velocity[2]) <= closeDistance) {
      if (
        unScaledVelocity[0] * unScaledVelocity[0] +
          unScaledVelocity[1] * unScaledVelocity[1] +
          unScaledVelocity[2] * unScaledVelocity[2] <=
        closeDistanceSquared
      ) {
        //finalPosition.copyFrom(position);
        return scaledPosition;
      }
    }
    return scaledPosition;
  }
  collideWithWorld(
    sphere: Ellipsoid,
    scaledPosition: TerraVector3,
    scaledVelocity: TerraVector3,
  ): void {
    if (sphere instanceof DataNode) sphere.colliding_character = false;
    //TODO: Call only when camera position change
    this.collider.finalPosition.set(
      this.#getFinalPosition(sphere, scaledPosition, scaledVelocity),
    );
    this.collider.finalPosition[0] *= sphere.radius[0];
    this.collider.finalPosition[1] *= sphere.radius[1];
    this.collider.finalPosition[2] *= sphere.radius[2];
  }
}

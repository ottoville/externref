import { MainNode, MainNodeProps } from '../MainNode.js';
import {
  MutableTerraVector3,
  ReadOnlyFloat32Array,
  TerraMatrix,
  TerraVector3,
  Triangle,
} from '../Math.js';
import type { ColliderJS } from '../Collider.js';
import type { Engine } from '../engine.js';
import { Drawable } from '../GPU/Drawables/Drawable.js';
import { create_rust_vec_ptr } from '../utils.js';
declare const engine: Engine;

export interface canCollideCharacter {
  rebuildTrianglePlanes(): void;
}

class pickInfo {
  buffer = new SharedArrayBuffer(6 * 4);
  point = new MutableTerraVector3(this.buffer);
  #distance = new DataView(this.buffer, 3 * 4, 4);
  getDistance() {
    return this.#distance.getFloat32(0, true);
  }
}

export interface Ellipsoid {
  collisionsScalingMatrix: TerraMatrix;
  radius: {
    0: number;
    1: number;
    2: number;
  };
  readonly closeDistanceVector: [number, number, number];
}

export type DataNodeProps = {
  vertices: rust_pointer<'geometry'>;
  /**
   * Setting true will create collider in rapier
   */
  can_collide?: boolean;
  frontFace?: GPUFrontFace;
  character_can_collide_to?: boolean;
};
/*
    TODO: Calculate closeDistance on every collision to take account angle between upVector and collided slope,
    so it is always small enought for gravity to hit on next tick.
*/

export function allocate_vec_f32(length: Word<'dword'>) {
  return create_rust_vec_ptr(engine.rust.alloc_vector_f32(length));
}
export function allocate_vec_positions(length: number) {
  return create_rust_vec_ptr(engine.rust.alloc_vector_positions(length));
}
export function allocate_vec_positions_and_normals(length: number) {
  return create_rust_vec_ptr(
    engine.rust.alloc_vector_positions_and_normal(length),
  );
}
export function allocate_vec_positions_and_normals_and_uv(length: number) {
  return create_rust_vec_ptr(
    engine.rust.alloc_vector_position_and_normal_and_UV(length),
  );
}
export function allocate_vec_positions2d_and_uv(length: number) {
  return create_rust_vec_ptr(
    engine.rust.alloc_vector_positions2d_and_uv(length),
  );
}
export function allocate_vec_usize(length: number) {
  return create_rust_vec_ptr(engine.rust.alloc_vector_usize(length));
}

export function allocate_vec(array: Uint32Array): rust_vec_ptr<'usize'>;
export function allocate_vec(array: Float32Array): rust_vec_ptr<'f32'>;
export function allocate_vec(
  array: Uint32Array | Float32Array,
): readonly [
  ptr: rust_pointer<'usize'> | rust_pointer<'f32'>,
  len: number,
  cap: number,
] {
  if (array.buffer.byteLength === 0) {
    throw new Error('Cannot allocate deattached or empty buffer');
  }
  if (array.buffer === engine.rust.memory.buffer) {
    throw new Error('Source buffer is already in rust');
  }
  if (array instanceof Float32Array) {
    const ptr = allocate_vec_f32(array.length as Word<'dword'>);
    new Float32Array(engine.rust.memory.buffer, ptr[0], ptr[1]).set(array);
    return ptr;
  } else {
    const vec_ptr = create_rust_vec_ptr(
      engine.rust.alloc_vector_usize(array.length),
    );
    new Uint32Array(engine.rust.memory.buffer, vec_ptr[0], vec_ptr[1]).set(
      array,
    );
    return vec_ptr;
  }
}

export const closeDistance = 0.0022;
export const closeDistanceSquared = closeDistance * closeDistance;
export class DataNode extends MainNode {
  override drawable?: Drawable<MainNode> | undefined;
  #props: Readonly<DataNodeProps>;

  //Physic things
  acceleration2: [number, number, number] = [0, 0, 0];
  //Actual velocity that occured last tick
  last_velocity: [number, number, number] = [0, 0, 0];
  last_acceleration: [number, number, number] = [0, 0, 0];
  // Shortcut property to avoid calls to rust
  #strip: boolean;
  getSpeedSquared(engine_lock: rust_pointer<'engine'>) {
    const velocity = this.getVelocity(engine_lock);
    return (
      velocity[0] * velocity[0] +
      velocity[1] * velocity[1] +
      velocity[2] * velocity[2]
    );
  }
  getSpeedSquaredFromMutex(engine_lock: rust_mutex<'locked', 'enginelock'>) {
    const velocity = this.getVelocityFromMutex(engine_lock);
    return (
      velocity[0] * velocity[0] +
      velocity[1] * velocity[1] +
      velocity[2] * velocity[2]
    );
  }
  //coefficient of friction
  grip = 1;
  impulse: [number, number, number] = [0, 0, 0];
  hasGravity = false;

  onVerticesChangeListeners: Set<() => void> = new Set();
  onVerticesChange() {
    this.onVerticesChangeListeners.forEach((cb) => {
      cb();
    });
  }

  // TODO: collide or uncollide with ANY mesh will change this value, so its lot of broken and does not indicate if mesh is really colliding now.
  colliding_physics = false;
  //Used for character
  colliding_character = false;

  #vectorsVec4: number[] = [];
  checkCollide(
    _velocityPerDelta: [number, number, number],
    engine_lock: rust_mutex<'locked', 'enginelock'>,
  ): TerraVector3 {
    return this.getTranslationFromMutex(engine_lock);
    // TODO: Generic collision check, object shape is not known
  }
  onCollideCharacter(
    _started: boolean,
    _engine_lock: rust_mutex<'locked', 'enginelock'>,
  ) {}
  readonly pickInfo = new pickInfo();
  protected readonly colliderVerticesV4: number[] = [];
  readonly #triangleFaces: Triangle[] = [];
  #lastColliderTransformMatrix = new TerraMatrix();

  #faceQuatros: [Triangle, Triangle, Triangle, Triangle][] = [];

  get_faces_count(engine_lock: rust_mutex<'locked', 'enginelock'>) {
    return engine.rust.faces_count(engine_lock, this.id);
  }
  set faces(faces: Float32Array) {
    const vec_ptr = create_rust_vec_ptr(
      engine.rust.alloc_vector_f32(faces.length as Word<'dword'>),
    );
    new Float32Array(engine.rust.memory.buffer, vec_ptr[0], vec_ptr[1]).set(
      faces,
    );
    engine.rust.set_faces(this.id, ...vec_ptr);
  }
  /**
   * Get raw vertices data
   */
  get vertices() {
    return new ReadOnlyFloat32Array(
      engine.rust.memory.buffer,
      engine.rust.vertices_pointer(this.geometry),
      this.vertices_count * this.vertices_stride,
    );
  }
  get vertices_count() {
    return engine.rust.vertices_count(this.geometry);
  }
  get have_vertices() {
    return engine.rust.have_vertices(this.id);
  }
  /**
   * stride as DWORD in vertices vec
   */
  get vertices_stride(): Word<'dword'> {
    return engine.rust.vertices_stride(this.geometry);
  }
  /**
   * Update existing vertices
   * @param cb Callback which gets the vertices array as argument
   */
  update_vertices(cb: (view: Float32Array) => void) {
    const view = new Float32Array(
      engine.rust.memory.buffer,
      engine.rust.vertices_pointer(this.geometry),
      this.vertices_count * this.vertices_stride,
    );
    cb(view);
    this.onVerticesChange();
  }
  calculate_normals() {
    engine.rust.calculate_normals(this.id);
  }
  dedup_positions() {
    engine.rust.dedup_positions(this.geometry);
  }
  override update_scale(x: number, y: number, z: number): void {
    super.update_scale(x, y, z);
    if (this.#props.can_collide) {
      const collider_ptr = this.create_collider();
      engine.rust.add_collider(this.id, collider_ptr);
    }
  }
  get last_collider_world_vertices_pointer() {
    return engine.rust.last_collider_world_vertices_pointer(this.geometry);
  }
  create_collider() {
    return engine.rust.create_trimesh_collider(this.id);
  }
  static Meshes: Map<number, DataNode> = new Map();
  static CharacterCanCollideMeshes: Set<DataNode> = new Set();
  #frontFace: GPUFrontFace;
  #character_can_collide_to: boolean;
  geometry: rust_pointer<'geometry'>;
  constructor(props: DataNodeProps, mainNodeProps: MainNodeProps | number) {
    super(mainNodeProps);
    this.#props = Object.freeze(props);

    const {
      vertices,
      can_collide = false,
      frontFace = 'cw',
      character_can_collide_to = true,
    } = props;

    this.#frontFace = frontFace;
    this.#character_can_collide_to = character_can_collide_to;

    DataNode.Meshes.set(this.id, this);
    if (typeof mainNodeProps !== 'number') {
      this.geometry = engine.rust.set_geometry(this.id, vertices);
    } else {
      this.geometry = engine.rust.get_geometry(this.id);
    }

    if (can_collide) {
      const collider_ptr = this.create_collider();
      engine.rust.add_collider(this.id, collider_ptr);
    }
    if (character_can_collide_to) {
      DataNode.CharacterCanCollideMeshes.add(this);
    }
    this.#strip = this.strip;
  }
  protected pushVertice = (
    position: number,
    collider_faces_pointer: rust_pointer<'collider_faces'>,
  ) => {
    let newLen = 0;
    if (this.#frontFace === 'ccw') {
      newLen = this.#vectorsVec4.unshift(position);
    } else {
      newLen = this.#vectorsVec4.push(position);
    }
    if (newLen === 3) {
      const faceIndex = this.#triangleFaces.length;
      this.#triangleFaces.push(
        new Triangle(
          this.#vectorsVec4 as [number, number, number],
          (collider_faces_pointer + faceIndex * 4 * 7) as rust_pointer<'Plane'>,
        ),
      ); // ColliderPlane size is 7
      new Uint32Array(
        engine.rust.memory.buffer,
        collider_faces_pointer +
          faceIndex * Float32Array.BYTES_PER_ELEMENT * 7 +
          4 * Float32Array.BYTES_PER_ELEMENT,
        3,
      ).set(this.#vectorsVec4); //4 is from plane

      if (this.#strip) {
        this.#vectorsVec4 = [
          (this.#vectorsVec4 as [number, number, number])[1],
          (this.#vectorsVec4 as [number, number, number])[2],
        ];
      } else {
        this.#vectorsVec4 = [];
      }
    }
  };
  get verticesArray() {
    const arr: Float32Array[] = [];
    const vertices_pointer = engine.rust.vertices_pointer(this.geometry);
    for (let i = 0; i < this.vertices_count; i++) {
      arr.push(
        new Float32Array(
          engine.rust.memory.buffer,
          vertices_pointer +
            i * Float32Array.BYTES_PER_ELEMENT * this.vertices_stride,
          this.vertices_stride,
        ),
      );
    }
    return arr;
  }
  override destroy() {
    let idx = engine.physics.tickables.indexOf(this);
    // TODO: save index to property
    if (idx >= 0) {
      engine.physics.tickables.splice(idx, 1);
    }
    idx = engine.physics.movables.indexOf(this);
    if (idx >= 0) {
      engine.physics.movables.splice(idx, 1);
    }
    DataNode.Meshes.delete(this.id);
    DataNode.CharacterCanCollideMeshes.delete(this);
    super.destroy();
  }
  initCollider() {
    if (!this.#character_can_collide_to) return false;
    //TODO: Calculate on demand
    const engine_lock = engine.rust.get_engine();
    const facesCount = this.get_faces_count(engine_lock);
    engine.rust.drop_engine_lock(engine_lock);

    if (facesCount === 0 || this.vertices_count === 0) return false;
    this.#triangleFaces.length = 0;
    this.#vectorsVec4 = [];
    this.colliderVerticesV4.length = 0;
    //this.lastColliderWorldVectorsPointer = this.engine.mallocView(this.positions_count * 4 * Float32Array.BYTES_PER_ELEMENT);
    const last_collider_world_vertices_pointer =
      this.last_collider_world_vertices_pointer;
    for (let i = 0; i < this.vertices_count; i++) {
      const colPos =
        last_collider_world_vertices_pointer +
        i * 4 * Float32Array.BYTES_PER_ELEMENT;
      this.colliderVerticesV4.push(colPos);
    }
    //return this.facesBufferColliderPointer.byteOffset;
    return true;
  }

  #updateColliderPlanes(engine_lock: rust_mutex<'locked', 'enginelock'>) {
    engine.rust.update_collider_planes(this.geometry);
    this.#triangleFaces.forEach((face) => {
      face.updatePlane();
    });
    const collider_planes_parallel_pointer =
      engine.rust.collider_planes_parallel_pointer(engine_lock, this.id);

    this.#faceQuatros.forEach((quatro, i) => {
      new Float32Array(
        engine.rust.memory.buffer,
        collider_planes_parallel_pointer + i * 4 * 16,
        16,
      ).set([
        quatro[0].planeCollider[0],
        quatro[1].planeCollider[0],
        quatro[2].planeCollider[0],
        quatro[3].planeCollider[0], //x
        quatro[0].planeCollider[1],
        quatro[1].planeCollider[1],
        quatro[2].planeCollider[1],
        quatro[3].planeCollider[1], //y
        quatro[0].planeCollider[2],
        quatro[1].planeCollider[2],
        quatro[2].planeCollider[2],
        quatro[3].planeCollider[2], //z
        quatro[0].planeCollider[3],
        quatro[1].planeCollider[3],
        quatro[2].planeCollider[3],
        quatro[3].planeCollider[3], //d
      ]);
    });
  }
  //collisionsScalingMatrix = new TerraMatrix();
  get #myCollisionsTransformMatrix(): TerraMatrix {
    return new TerraMatrix(
      engine.rust.memory.buffer,
      engine.rust.collisions_transform_matrix_ptr(this.geometry),
    );
  }
  public checkCollision(
    engine_lock: rust_mutex<'locked', 'enginelock'>,
    _collider: ColliderJS,
    sphere: Ellipsoid,
  ) {
    //TODO: When there is support for bounding sphere.
    //  var distance = Vector3.Distance(Vector3.FromArray(this._basePointWorld), sphereCenter);

    var max = Math.max(sphere.radius[0], sphere.radius[1], sphere.radius[2]);

    /*   if (distance > this._velocityWorldLength + max + sphereRadius) {
               return false;
           }*/
    if (!this.intersect_box_aa_sphere(engine_lock, engine.collider, max)) {
      return;
    }
    // TODO: keep colliderplanes in memory for x amount of collisionsScalingMatrix
    this.get_transformation(engine_lock).multiplyToRef(
      sphere.collisionsScalingMatrix,
      this.#myCollisionsTransformMatrix,
    );
    if (
      !this.#lastColliderTransformMatrix.equals(
        this.#myCollisionsTransformMatrix,
      )
    ) {
      this.#lastColliderTransformMatrix =
        this.#myCollisionsTransformMatrix.clone();
      this.#updateColliderPlanes(engine_lock);
    }
    const facesCount = this.get_faces_count(engine_lock);
    if (facesCount % 4 != 0) {
      /* const scaledPosition=collider.scaledPosition;
             const scaledVelocity=collider.scaledVelocity
             const trLength=this.#triangleFaces.length;
             for(let i=0; i<trLength; i++) {
                 collider._testTriangle(this.#triangleFaces[i]!, scaledPosition, scaledVelocity);
             }*/
      /*   const scaledPosition=collider.scaledPosition;
               const scaledVelocity=collider.scaledVelocity
               const trLength=this.#triangleFaces.length;
               for(let i=0; i<trLength; i++) {
                   collider._testTriangle(this.#triangleFaces[i]!, scaledPosition, scaledVelocity);
               }*/
    } else {
      //   TODO: Use wasm when this.faces_count % 4 == 0
      engine.wasm.testTriangles(
        engine.rust.collider_faces_pointer(engine_lock, this.id),
        engine.rust.collider_planes_parallel_pointer(engine_lock, this.id),
        facesCount * 7 * Float32Array.BYTES_PER_ELEMENT, //  plane + vector pointers
        this.id,
      );
      /*
           const scaledPosition=collider.scaledPosition;
           const scaledVelocity=collider.scaledVelocity
           const trLength=this.#triangleFaces.length;
           for(let i=0; i<trLength; i++) {
               collider._testTriangle(this.#triangleFaces[i]!, scaledPosition, scaledVelocity);
           }*/
    }
  }
  protected buildFaces() {
    const engine_lock = engine.rust.get_engine();
    if (this.get_faces_count(engine_lock) % 4 === 0) {
      this.#faceQuatros.length = 0;
      let faceQuatro: Triangle[] = [];
      this.#triangleFaces.forEach((face) => {
        if (faceQuatro.push(face) === 4) {
          this.#faceQuatros.push(
            faceQuatro as [Triangle, Triangle, Triangle, Triangle],
          );
          faceQuatro = [];
        }
      });
    }
    this.#updateColliderPlanes(engine_lock);
    engine.rust.drop_engine_lock(engine_lock);
  }
}

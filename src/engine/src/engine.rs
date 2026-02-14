use std::cell::{OnceCell, RefCell};
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{mpsc, Arc, LazyLock, Mutex, MutexGuard};

use crate::allocators::freeindex::{FreeIndex, FreeIndexIndex};
use crate::gpu::gpu::MeshGPU;
use crate::gpu::lights::InnerLights;
use crate::objectstores::{PLANTAE_STORE, SAVE_STORE, ZONES_STORE};
use allocators::explicit_generational_freelist::{
    ExplicitGenerationalFreeList, ExplicitGenerationalFreeListIndex,
};
use web::file_system::fs_directory_handle::FSDirectoryHandle;
use web::primitives::jsstring::JSString;
use web::storage_buckets::storage_buckets::{NavigatorStorageBuckets, StorageBuckets};
use IDB::idb_database::IDBDatabase;
use IDB::idb_factory::IDBFactory;

use crate::mesh::JSMesh;
pub use crate::mesh::Mesh;
use collider::{ColliderSphere, CLOSE_DISTANCE_SQRT};
use externref::externref;
use externref::Resource;
use logger::Logger;
use rapier3d::control::KinematicCharacterController;
use rapier3d::prelude::*;
use terramath::VectorMathF32;

#[cfg(test)]
unsafe fn mesh_on_physic_tick(_mesh: *const Mesh, _delta: f32, _externref: &Resource<JSMesh>) {}
#[cfg(test)]
pub unsafe fn get_preferred_canvas_format() -> u32 {
    1
}
#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "env")]
extern "C" {
    fn mesh_on_physic_tick(mesh: *const Mesh, delta: f32, externref: &Resource<JSMesh>);
    pub fn vertices_change(mesh: &Resource<JSMesh>);
}
#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "gpu")]
extern "C" {
    pub fn get_preferred_canvas_format() -> u32;
}

#[no_mangle]
#[externref]
pub unsafe extern "C" fn get_engine() -> *mut MutexGuard<'static, Engine2> {
    Box::into_raw(Box::new(ENGINE.engine2.lock().unwrap()))
}

#[no_mangle]
pub unsafe extern "C" fn drop_engine_lock(engine: *mut MutexGuard<'static, Engine2>) {
    drop(Box::from_raw(engine));
}
#[no_mangle]
#[cfg(target_arch = "wasm32")]
/// Run only from main thread
pub extern "C" fn init_engine2() -> usize {
    use web::document::event_listener::EventListener;

    pub use crate::GPUMesh;
    use std::panic;
    String::from("Init engine").log();
    panic::set_hook(Box::new(|panic_info| {
        panic_info.to_string().error();
    }));
    EventListener::new();
    debug_assert!(std::mem::size_of::<GPUMesh>() % 8 == 0, "GPUMesh offset must be multiple of 8 https://www.w3.org/TR/webgpu/#dom-gpubuffer-getmappedrange");
    std::mem::size_of::<GPUMesh>()
}
#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub unsafe extern "C" fn physic_tick(delta: f32) {
    for mesh in ENGINE.meshes.lock().unwrap().iter() {
        if let Some(externref) = mesh.externref.as_ref() {
            unsafe { mesh_on_physic_tick(mesh, delta, externref) }
        }
    }
    let engine = &mut ENGINE.engine2.lock().unwrap();
    engine.physic_tick(delta / 1000.0);
}
#[no_mangle]
pub unsafe extern "C" fn set_mouse_position(x: f32, y: f32) {
    MOUSE_POSITION.store(
        ((y.to_bits() as u64) << 32) | (x.to_bits() as u64),
        Ordering::Relaxed,
    );
}
const GRAVITY: nalgebra::Matrix<
    f32,
    nalgebra::Const<3>,
    nalgebra::Const<1>,
    nalgebra::ArrayStorage<f32, 3, 1>,
> = vector![0.0, -9.81, 0.0];
pub static MOUSE_POSITION: AtomicU64 = AtomicU64::new(0);
pub struct Engine {
    pub engine2: Mutex<Engine2>,
    event_handler: ChannelEventCollector,
    pub character_controller: KinematicCharacterController,
    pub meshes: Mutex<ExplicitGenerationalFreeList<Mesh>>,
    pub dropped_meshes: Mutex<Vec<ExplicitGenerationalFreeListIndex<fn() -> MeshGPU>>>,
    pub point_lights: Arc<Mutex<InnerLights>>,
    pub directional_lights: Arc<Mutex<InnerLights>>,
}
pub struct Engine2 {
    pub physic_pipeline: PhysicsPipeline,
    pub rigid_bodies: HashMap<RigidBodyHandle, ExplicitGenerationalFreeListIndex<fn() -> Mesh>>,
    pub gpu_allocated: FreeIndex,
    pub collider_set: ColliderSet,
    pub modified_colliders: Vec<ColliderHandle>,
    pub removed_colliders: Vec<ColliderHandle>,
    pub broad_phase: DefaultBroadPhase,
    pub ccd_solver: CCDSolver,
    pub island_manager: IslandManager,
    pub joint_set: ImpulseJointSet,
    pub narrow_phase: NarrowPhase,
    pub multi_joint_set: MultibodyJointSet,
    pub rigid_body_set: RigidBodySet,
    pub camera_can_collide_meshes: Vec<ExplicitGenerationalFreeListIndex<fn() -> Mesh>>,
    pub collider: collider::Collider,
}
struct StorageResouceState<T> {
    resource: OnceCell<T>,
    cbs: RefCell<Vec<Box<dyn FnOnce(&T) -> ()>>>,
}
impl<T> StorageResouceState<T> {
    pub fn new() -> Self {
        StorageResouceState {
            resource: OnceCell::new(),
            cbs: RefCell::new(Vec::new()),
        }
    }
    fn get_or_init(&self, cb: impl FnOnce(&T) + 'static, init_cb: impl FnOnce()) {
        if let Some(storage_bucket) = self.resource.get() {
            cb(storage_bucket);
        } else {
            let mut cbs = self.cbs.borrow_mut();
            if cbs.len() == 0 {
                init_cb()
            }
            cbs.push(Box::new(cb));
        }
    }
    fn run_cbs(&self, is_ok: bool, resource: T) {
        let mut cbs = self.cbs.borrow_mut();
        for fn_once in cbs.drain(..) {
            fn_once(&resource)
        }
        if is_ok {
            self.resource.set(resource);
        }
    }
}
pub struct StorageState {
    indexed_db: Rc<StorageResouceState<IDBDatabase>>,
    directory: Rc<StorageResouceState<Result<FSDirectoryHandle, JSString>>>,
    storage_bucket: Rc<StorageResouceState<NavigatorStorageBuckets>>,
}
impl StorageState {
    pub fn onready_storagebucket(&self, cb: impl FnOnce(&NavigatorStorageBuckets) -> () + 'static) {
        self.storage_bucket.get_or_init(cb, || {
            let storage_bucket_clone = self.storage_bucket.clone();
            StorageBuckets::open(
                String::from("terrasim"),
                true,
                1000000,
                2052766290000.0,
                move |storage_bucket| {
                    storage_bucket_clone.run_cbs(true, storage_bucket);
                },
            );
        });
    }
    pub fn get_directory(
        &self,
        cb: impl FnOnce(&Result<FSDirectoryHandle, JSString>) -> () + 'static,
    ) {
        self.directory.get_or_init(cb, || {
            let directory_clone = self.directory.clone();
            self.onready_storagebucket(|storage_bucket| {
                storage_bucket.get_directory(move |directory| {
                    directory_clone.run_cbs(directory.is_ok(), directory);
                });
            })
        });
    }
    pub fn get_indexed_db(&self, cb: impl FnOnce(&IDBDatabase) -> () + 'static) {
        self.indexed_db.get_or_init(cb, || {
            let indexed_db_clone = self.indexed_db.clone();
            self.onready_storagebucket(move |storage_bucket| {
                let open_request = IDBFactory::open_with_storage_bucket(
                    String::from("TerraSim"),
                    6,
                    storage_bucket,
                    move |database_res| match database_res {
                        Ok(db) => {
                            &"DB opened succesfully".log();
                            db.on_error(|_| {
                                &"DB on error".error();
                            });
                            db.on_abort(|_| {
                                &"DB on abort".error();
                            });
                            db.on_version_change(|_| {
                                &"DB version change".log();
                            });
                            indexed_db_clone.run_cbs(true, db);
                        }
                        Err(error) => {
                            //panic!("IndexDB error {}", error.0.get_as_string())
                        }
                    },
                );
                open_request.on_upgrade_needed(|db, _old_version, _new_version| {
                    db.create_object_store::<&[String; 2]>(&SAVE_STORE);
                    let plantae = db.create_object_store_with_auto_increment(&PLANTAE_STORE);
                    plantae.create_index::<false, false, _>(
                        String::from("family"),
                        [String::from("family")],
                    );
                    plantae.create_index::<false, false, _>(String::from("x"), [String::from("x")]);
                    let _zones = db.create_object_store_with_auto_increment(&ZONES_STORE);
                });
                open_request.on_blocked(|_oldv, _newv| {
                    &"DB on blocked".log();
                });
            });
        });
    }
}
thread_local! {
    pub static STORAGE: StorageState = {
        let dbstore = StorageState {
            directory: Rc::new(StorageResouceState::new()),
            indexed_db: Rc::new(StorageResouceState::new()),
            storage_bucket: Rc::new(StorageResouceState::new())
        };
        return dbstore;
    };
}
pub static ENGINE: LazyLock<Engine> = LazyLock::new(|| {
    // Initialize the event collector.
    let (contact_send, _contact_recv) = mpsc::channel();
    let (collision_send, _collision_recv) = mpsc::channel();

    return Engine {
        engine2: Mutex::new(Engine2 {
            physic_pipeline: PhysicsPipeline::new(),
            rigid_bodies: HashMap::new(),
            gpu_allocated: FreeIndex::new(),
            collider_set: ColliderSet::new(),
            modified_colliders: Vec::with_capacity(32),
            removed_colliders: Vec::with_capacity(32),
            broad_phase: DefaultBroadPhase::new(),
            ccd_solver: CCDSolver::new(),
            island_manager: IslandManager::new(),
            joint_set: ImpulseJointSet::new(),
            narrow_phase: NarrowPhase::new(),
            multi_joint_set: MultibodyJointSet::new(),
            rigid_body_set: RigidBodySet::new(),
            camera_can_collide_meshes: Vec::new(),
            collider: collider::Collider::new(),
        }),
        meshes: Mutex::new(ExplicitGenerationalFreeList::new(100)),
        dropped_meshes: Mutex::new(Vec::new()),
        event_handler: ChannelEventCollector::new(collision_send, contact_send),
        character_controller: KinematicCharacterController::default(),
        point_lights: Arc::new(Mutex::new(InnerLights {
            lights: vec![FreeIndexIndex(0)],
            dirty: false,
        })),
        directional_lights: Arc::new(Mutex::new(InnerLights {
            lights: vec![FreeIndexIndex(0)],
            dirty: false,
        })),
    };
});

// MESH ON COLLIDE JAVASCRIPT EVENT REMOVED
// TODO: create rust event for that
/*unsafe fn collider_to_mesh<'frame>(
    e: &'frame Engine2,
    collider_handle: ColliderHandle,
) -> Option<&'frame Mesh> {
    /*let collider = e.collider_set.get(collider_handle)?;
    let rigid_body_handle = collider.parent()?;
    let mesh_id = e.rigid_bodies.get(&rigid_body_handle)?;
    return Some(get_mesh_by_id(*mesh_id));*/
    let collider_set = &mut ENGINE.engine2.lock().unwrap().collider_set;

    return match collider_set.get(collider_handle) {
        Some(collider) => match collider.parent() {
            Some(rigid_body_handle) => {
                let mesh_id = e.rigid_bodies.get(&rigid_body_handle);
                match mesh_id {
                    Some(id) => return Some(&e.meshes[*id]),
                    None => {
                        js_warn(["mesh_id not found"]);
                        None
                    }
                }
            }
            None => {
                js_warn(["rigid_body_handle not found"]);
                None
            }
        },
        None => {
            js_warn(["parent collider not found"]);
            None
        }
    };
}*/

impl Engine2 {
    pub fn physic_tick(&mut self, dt: f32) {
        let integration_parameters: IntegrationParameters = IntegrationParameters {
            dt,
            min_ccd_dt: 1.0 / 60.0 / 100.0,
            contact_softness: SpringCoefficients::contact_defaults(),
            friction_model: FrictionModel::default(),
            warmstart_coefficient: 1.0,
            num_internal_pgs_iterations: 1,
            num_internal_stabilization_iterations: 2,
            num_solver_iterations: 4,
            // TODO: what is the optimal value for min_island_size?
            // It should not be too big so that we don't end up with
            // huge islands that don't fit in cache.
            // However we don't want it to be too small and end up with
            // tons of islands, reducing SIMD parallelism opportunities.
            min_island_size: 128,
            normalized_allowed_linear_error: 0.001,
            normalized_max_corrective_velocity: 10.0,
            normalized_prediction_distance: 0.002,
            max_ccd_substeps: 2,
            length_unit: 1.0,
        };
        let physics_hooks = ();
        self.physic_pipeline.step(
            &GRAVITY,
            &integration_parameters,
            &mut self.island_manager,
            &mut self.broad_phase,
            &mut self.narrow_phase,
            &mut self.rigid_body_set,
            &mut self.collider_set,
            &mut self.joint_set,
            &mut self.multi_joint_set,
            &mut self.ccd_solver,
            &physics_hooks,
            &ENGINE.event_handler,
        );
        // MESH ON COLLIDE JAVASCRIPT EVENT REMOVED
        // TODO: create rust event for that
        /*
        unsafe {
            while let Ok(collision_event) = collision_recv.try_recv() {
                // Handle the collision event.
                match collider_to_mesh(self, collision_event.collider1()) {
                    Some(m) => mesh_on_collide(self, m.id, collision_event.started()),
                    None => js_warn(["Mesh not found for collider1"]),
                }
                match collider_to_mesh(&self, collision_event.collider2()) {
                    Some(m) => mesh_on_collide(self, m.id, collision_event.started()),
                    None => js_warn(["Mesh not found for collider2"]),
                }
            }
        };*/
        // Iter on each dynamic rigid-bodies that moved.
        for rigid_body_handle in self.island_manager.active_bodies() {
            let mesh = self.rigid_bodies.get_mut(rigid_body_handle);
            match mesh {
                Some(m_id) => {
                    let rigid_body = &self.rigid_body_set[*rigid_body_handle];
                    let newrot = rigid_body.rotation().as_vector();
                    let mesh = &mut ENGINE.meshes.lock().unwrap()[m_id];

                    {
                        let mut mesh_property = mesh.mesh_property.lock().unwrap();

                        mesh_property.rotation.i = newrot.x;
                        mesh_property.rotation.j = newrot.y;
                        mesh_property.rotation.k = newrot.z;
                        mesh_property.rotation.w = newrot.w;
                    }
                    let pos = rigid_body.position();
                    mesh.update_translation(
                        pos.translation.x,
                        pos.translation.y,
                        pos.translation.z,
                        false,
                    );
                }
                None => "Mesh not found for rigid body".warn(),
            }
        }
    }
    pub fn check_collisions(
        &mut self,
        collider_sphere: &ColliderSphere,
        new_position: [f32; 4],
        world_position: &[f32; 4],
    ) -> Option<[f32; 4]> {
        use terramath::VectorMath;
        let world_velocity = new_position.sub_vec(world_position);
        world_velocity.divide_to_ref(
            collider_sphere.collision_radius,
            &mut self.collider.scaled_velocity,
        );
        world_position.divide_to_ref(
            collider_sphere.collision_radius,
            &mut self.collider.scaled_position,
        );

        self.collider.did_collide = false;
        for _ in 0..3 {
            //TODO: really, here inside the loop?
            self.collider._initialize(
                world_position,
                self.collider.scaled_velocity.length() * collider_sphere.collision_radius,
            );
            self.collider.destination_point = self
                .collider
                .scaled_position
                .add_vec(&mut self.collider.scaled_velocity);
            let meshes: &mut MutexGuard<'_, ExplicitGenerationalFreeList<Mesh>> =
                &mut ENGINE.meshes.lock().unwrap();
            self.camera_can_collide_meshes
                .retain(|mesh_id| match meshes.get_mut(&mesh_id) {
                    Some(mesh) => {
                        mesh.check_collision(&mut self.collider, &*collider_sphere);
                        return true;
                    }
                    None => return false,
                });

            if self.collider.collision_resolved {
                self.collider.scaled_position = self.collider.destination_point;
                break;
            }
            if self.collider.scaled_velocity[0] != 0.0
                || self.collider.scaled_velocity[1] != 0.0
                || self.collider.scaled_velocity[2] != 0.0
            {
                //this.collider._getResponse(position, velocity);
                // https://arxiv.org/ftp/arxiv/papers/1211/1211.0059.pdf
                // vel.scaleInPlace((this._nearestDistance / vel.length()));

                let scale = (self.collider.nearest_distance_squared
                    / self
                        .collider
                        .scaled_velocity
                        .dot(&self.collider.scaled_velocity))
                .sqrt();
                // let scale = this.#nearestDistanceSquared / (vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
                self.collider.scaled_velocity.multiply_in_place(scale);
                self.collider
                    .scaled_position
                    .add_vec_in_place(&self.collider.scaled_velocity);

                //pos.subtractToRef(this.intersectionPoint, this._slidePlaneNormal);
                let slide_plane_normal = match self.collider.collided_point_in_triangle {
                    Some(collided_point_in_triangle) => collided_point_in_triangle,
                    None => {
                        let mut slide_plane_normal2 = self
                            .collider
                            .scaled_position
                            .sub_vec(&self.collider.intersection_point);

                        // this._slidePlaneNormal.normalize();
                        // const length = Math.sqrt(this.collider._slidePlaneNormal[0] * this.collider._slidePlaneNormal[0] + this.collider._slidePlaneNormal[1] * this.collider._slidePlaneNormal[1] + this.collider._slidePlaneNormal[2] * this.collider._slidePlaneNormal[2]);
                        slide_plane_normal2.normalize_in_place();
                        slide_plane_normal2
                    }
                };
                let displacement_vector =
                    slide_plane_normal.multiply(collider_sphere.close_distance_vector);
                // pos.addInPlace(this._displacementVector);
                /*
                    displacementVector is a constraint added to position, so eg. objects that are colliding
                    ground because of gravity, will "flow" of amount of displacementVector.
                    It must be small enought so same force applied from displacement position would cause collide.
                    Otherwise object would constantry jumping on ground.
                */
                self.collider
                    .scaled_position
                    .add_vec_in_place(&displacement_vector);
                //this.intersectionPoint.addInPlace(this._displacementVector);
                self.collider
                    .intersection_point
                    .add_vec_in_place(&displacement_vector);

                let d = -(slide_plane_normal.dot(&self.collider.intersection_point));

                let scale = self.collider.destination_point.dot(&slide_plane_normal) + d;

                self.collider
                    .destination_point
                    .sub_vec_in_place(&slide_plane_normal.multiply(scale));
                //this._destinationPoint.subtractToRef(this.intersectionPoint, vel);
                self.collider.scaled_velocity = self
                    .collider
                    .destination_point
                    .sub_vec(&self.collider.intersection_point);
            }
            let unscaled_velocity = self
                .collider
                .scaled_velocity
                .multiply(collider_sphere.collision_radius);
            // if (Math.hypot(velocity[0], velocity[1], velocity[2]) <= closeDistance) {
            if unscaled_velocity.dot(&unscaled_velocity) <= CLOSE_DISTANCE_SQRT {
                break;
            }
        }
        if self.collider.did_collide {
            return Some(
                self.collider
                    .scaled_position
                    .multiply(collider_sphere.collision_radius),
            );
        }
        return None;
    }
    pub fn add_collider_to_mesh<'a>(&mut self, collider: Collider, mesh: &mut Mesh) {
        match mesh.rigid_body_handle {
            Some(rigid_body_handle) => {
                let collider_handle = self.collider_set.insert_with_parent(
                    collider,
                    rigid_body_handle,
                    &mut self.rigid_body_set,
                );
                self.modified_colliders.push(collider_handle);
                if let Some(old) = mesh.collider_handle.replace(collider_handle) {
                    self.collider_set.remove(
                        old,
                        &mut self.island_manager,
                        &mut self.rigid_body_set,
                        true,
                    );
                    self.removed_colliders.push(old);
                }
            }
            None => {
                let collider_handle = self.collider_set.insert(collider);
                mesh.collider_handle.replace(collider_handle);
                self.modified_colliders.push(collider_handle);
            }
        }
    }
}

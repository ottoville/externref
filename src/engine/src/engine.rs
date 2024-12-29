use std::collections::HashMap;
use std::num::NonZeroUsize;
use std::panic;
use std::sync::{LazyLock, Mutex, MutexGuard};

use crate::allocators::freeindex::FreeIndex;
use crate::cameras::Cameras;
use crate::gpu::buffer::buffer::JSBuffer;

use crate::gpu::gpu::GPU;
use crate::gpu::lights::Lights;

pub use crate::mesh::Mesh;
pub use crate::GPUMesh;
use crate::MULTIVALUE_USIZE;
use externref::{externref, Resource};
use rapier3d::prelude::*;

#[link(wasm_import_module = "console")]
#[cfg(target_arch = "wasm32")]
extern "C" {
    fn log(number: *const usize);
    pub fn log_u32(number: u32);
    fn warn(number: *const usize);
    fn error(number: *const usize);
}

extern "C" {
    #[cfg(target_arch = "wasm32")]
    fn jspanic(number: *const u8);
    #[cfg(target_arch = "wasm32")]
    fn mesh_on_collide(engine: *const MutexGuard<'_, Engine2>, mesh_id: usize, status: bool);
    #[cfg(target_arch = "wasm32")]
    fn mesh_on_physic_tick(engine: *const MutexGuard<'_, Engine2>, number: usize);
    #[cfg(target_arch = "wasm32")]
    pub fn verticesChange(mesh_id: usize);

}

pub struct PhysicEngine {
    pub broad_phase: DefaultBroadPhase,
}
pub struct Engine {
    pub rigid_body_set: Mutex<RigidBodySet>,
    pub island_manager: Mutex<IslandManager>,
    pub physic_engine: Mutex<PhysicEngine>,
    pub collider_set: Mutex<ColliderSet>,
    pub joint_set: Mutex<ImpulseJointSet>,
    pub narrow_phase: Mutex<NarrowPhase>,
    pub ccd_solver: Mutex<CCDSolver>,

    pub engine2: Mutex<Engine2>,
    pub gpu: Mutex<Option<GPU>>,
}

pub static ENGINE: LazyLock<Engine> = LazyLock::new(|| {
    let rigid_body_set = Mutex::new(RigidBodySet::new());
    let collider_set = ColliderSet::new();

    Engine {
        rigid_body_set,
        island_manager: Mutex::new(IslandManager::new()),
        physic_engine: Mutex::new(PhysicEngine {
            broad_phase: DefaultBroadPhase::new(),
        }),
        collider_set: Mutex::new(collider_set),
        joint_set: Mutex::new(ImpulseJointSet::new()),
        narrow_phase: Mutex::new(NarrowPhase::new()),
        ccd_solver: Mutex::new(CCDSolver::new()),
        engine2: Mutex::new(Engine2 {
            physic_pipeline: PhysicsPipeline::new(),
            meshes: Vec::with_capacity(100),
            rigid_bodies: HashMap::new(),
            gpu_allocated: FreeIndex::new(),
        }),
        gpu: Mutex::new(None),
    }
});
#[no_mangle]
#[externref]
pub unsafe extern "C" fn get_engine() -> *mut MutexGuard<'static, Engine2> {
    Box::into_raw(Box::new(ENGINE.engine2.lock().unwrap()))
}

#[no_mangle]
pub unsafe extern "C" fn drop_engine_lock(engine: *mut MutexGuard<'static, Engine2>) {
    drop(Box::from_raw(engine));
}

pub struct Engine2 {
    pub physic_pipeline: PhysicsPipeline,
    pub meshes: Vec<Mesh>,
    pub rigid_bodies: HashMap<RigidBodyHandle, usize>,
    pub gpu_allocated: FreeIndex,
}
static mut LOG_STRING: String = String::new();

// TODO, remove and use "str_ptr_from_arr" syntax
pub fn create_js_string(mut str: String) -> *const u8 {
    str.truncate(512);
    let log_str = format!("{: <512}", str);
    let ptr = log_str.as_ptr();
    std::mem::forget(log_str);
    return ptr;
}
unsafe fn str_ptr_from_arr<const N: usize>(strings: [&(impl ToString + ?Sized); N]) {
    LOG_STRING.clear();
    for str in strings.iter() {
        LOG_STRING.push(' ');
        LOG_STRING.push_str(&str.to_string());
    }
    MULTIVALUE_USIZE[0] = LOG_STRING.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = LOG_STRING.len();
    MULTIVALUE_USIZE[2] = LOG_STRING.capacity();
}

pub fn js_log<const N: usize>(strings: [&(impl ToString + ?Sized); N]) {
    unsafe {
        str_ptr_from_arr(strings);
        #[cfg(target_arch = "wasm32")]
        log(MULTIVALUE_USIZE.as_ptr());
    }
}
pub trait Logger {
    fn log(&self);
}
impl Logger for usize {
    fn log(&self) {
        unsafe {
            LOG_STRING.clear();
            LOG_STRING = self.to_string();
            MULTIVALUE_USIZE[0] = LOG_STRING.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = LOG_STRING.len();
            MULTIVALUE_USIZE[2] = LOG_STRING.capacity();

            #[cfg(target_arch = "wasm32")]
            log(MULTIVALUE_USIZE.as_ptr());
        }
    }
}
impl Logger for Vec<u32> {
    fn log(&self) {
        unsafe {
            LOG_STRING.clear();
            for str in self.iter() {
                LOG_STRING.push(' ');
                LOG_STRING.push_str(&str.to_string());
            }
            MULTIVALUE_USIZE[0] = LOG_STRING.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = LOG_STRING.len();
            MULTIVALUE_USIZE[2] = LOG_STRING.capacity();

            #[cfg(target_arch = "wasm32")]
            log(MULTIVALUE_USIZE.as_ptr());
        }
    }
}
impl Logger for Vec<usize> {
    fn log(&self) {
        unsafe {
            LOG_STRING.clear();
            for str in self.iter() {
                LOG_STRING.push(' ');
                LOG_STRING.push_str(&str.to_string());
            }
            MULTIVALUE_USIZE[0] = LOG_STRING.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = LOG_STRING.len();
            MULTIVALUE_USIZE[2] = LOG_STRING.capacity();

            #[cfg(target_arch = "wasm32")]
            log(MULTIVALUE_USIZE.as_ptr());
        }
    }
}
impl Logger for [[f32; 4]; 4] {
    fn log(&self) {
        unsafe {
            LOG_STRING.clear();
            for i in 0..4 {
                for ii in 0..4 {
                    LOG_STRING.push_str(&self[i][ii].to_string());
                    LOG_STRING.push(' ');
                }
            }
            MULTIVALUE_USIZE[0] = LOG_STRING.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = LOG_STRING.len();
            MULTIVALUE_USIZE[2] = LOG_STRING.capacity();

            #[cfg(target_arch = "wasm32")]
            log(MULTIVALUE_USIZE.as_ptr());
        }
    }
}
pub fn js_warn<const N: usize>(strings: [&(impl ToString + ?Sized); N]) {
    unsafe {
        str_ptr_from_arr(strings);
        #[cfg(target_arch = "wasm32")]
        warn(MULTIVALUE_USIZE.as_ptr());
    }
}
pub fn js_error<const N: usize>(strings: [&(impl ToString + ?Sized); N]) {
    unsafe {
        str_ptr_from_arr(strings);
        #[cfg(target_arch = "wasm32")]
        error(MULTIVALUE_USIZE.as_ptr());
    }
}
#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub extern "C" fn init_engine2() -> usize {
    panic::set_hook(Box::new(|panic_info| unsafe {
        jspanic(create_js_string(panic_info.to_string()));
    }));
    debug_assert!(std::mem::size_of::<GPUMesh>() % 8 == 0, "GPUMesh offset must be multiple of 8 https://www.w3.org/TR/webgpu/#dom-gpubuffer-getmappedrange");
    std::mem::size_of::<GPUMesh>()
}

unsafe fn collider_to_mesh<'frame>(
    e: &'frame Engine2,
    collider_handle: ColliderHandle,
) -> Option<&'frame Mesh> {
    /*let collider = e.collider_set.get(collider_handle)?;
    let rigid_body_handle = collider.parent()?;
    let mesh_id = e.rigid_bodies.get(&rigid_body_handle)?;
    return Some(get_mesh_by_id(*mesh_id));*/
    let collider_set = &mut ENGINE.collider_set.lock().unwrap();

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
}
#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub unsafe extern "C" fn physic_tick() {
    //  jslog_number(&(ENGINE.physic_engine().meshes[0]) as *const Mesh as u32);
    use rapier3d::crossbeam;
    let gravity = vector![0.0, -9.81, 0.0];
    let integration_parameters = IntegrationParameters {
        dt: 1.0 / 60.0,
        min_ccd_dt: 1.0 / 60.0 / 100.0,
        contact_natural_frequency: 30.0,
        contact_damping_ratio: 5.0,
        joint_natural_frequency: 1.0e6,
        joint_damping_ratio: 1.0,
        warmstart_coefficient: 1.0,
        num_internal_pgs_iterations: 1,
        num_internal_stabilization_iterations: 2,
        num_additional_friction_iterations: 0,
        num_solver_iterations: NonZeroUsize::new(4).unwrap(),
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

    let mut multi_joint_set = MultibodyJointSet::new();
    let physics_hooks = ();
    // Initialize the event collector.
    //TODO: do not create on each step.
    let (contact_send, _contact_recv) = crossbeam::channel::unbounded();
    let (collision_send, collision_recv) = crossbeam::channel::unbounded();

    let event_handler = ChannelEventCollector::new(collision_send, contact_send);
    let engine = &mut ENGINE.engine2.lock().unwrap();
    for mesh in &engine.meshes {
        mesh_on_physic_tick(engine, mesh.id)
    }
    // engine.meshes.iter().for_each(|m| mesh_on_physic_tick(engine, m.id));

    let island_manager = &mut ENGINE.island_manager.lock().unwrap();
    let rigid_body_set = &mut ENGINE.rigid_body_set.lock().unwrap();
    let physic_engine = &mut ENGINE.physic_engine.lock().unwrap();
    let collider_set = &mut ENGINE.collider_set.lock().unwrap();
    let joint_set = &mut ENGINE.joint_set.lock().unwrap();
    let narrow_phase = &mut ENGINE.narrow_phase.lock().unwrap();
    let ccd_solver = &mut ENGINE.ccd_solver.lock().unwrap();
    engine.physic_pipeline.step(
        &gravity,
        &integration_parameters,
        island_manager,
        &mut physic_engine.broad_phase,
        narrow_phase,
        rigid_body_set,
        collider_set,
        joint_set,
        &mut multi_joint_set,
        ccd_solver,
        None,
        &physics_hooks,
        &event_handler,
    );
    while let Ok(collision_event) = collision_recv.try_recv() {
        // Handle the collision event.
        match collider_to_mesh(engine, collision_event.collider1()) {
            Some(m) => mesh_on_collide(engine, m.id, collision_event.started()),
            None => js_warn(["Mesh not found for collider1"]),
        }
        match collider_to_mesh(engine, collision_event.collider2()) {
            Some(m) => mesh_on_collide(engine, m.id, collision_event.started()),
            None => js_warn(["Mesh not found for collider2"]),
        }
    }
    // Iter on each dynamic rigid-bodies that moved.
    for rigid_body_handle in island_manager.active_dynamic_bodies() {
        let mesh = engine.rigid_bodies.get_mut(rigid_body_handle);
        match mesh {
            Some(m_id) => {
                let rigid_body = &rigid_body_set[*rigid_body_handle];
                let newrot = rigid_body.rotation().as_vector();
                let mesh_id = *m_id;
                let mesh = &mut engine.meshes[mesh_id];
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
            None => js_warn(["Mesh not found for rigid body"]),
        }
    }
}

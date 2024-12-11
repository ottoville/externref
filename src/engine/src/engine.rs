use std::collections::HashMap;
use std::num::NonZeroUsize;
use std::panic;
use std::sync::{LazyLock, Mutex};

use crate::allocators::freeindex::FreeIndex;
use crate::cameras::Cameras;
use crate::gpu::buffer::buffer::JSBuffer;

use crate::gpu::gpu::GPU;
use crate::gpu::lights::Lights;

pub use crate::mesh::Mesh;
use crate::mesh::{get_mesh_by_id, get_mesh_by_id_mut};
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
    fn mesh_on_collide(mesh_id: usize, status: bool);
    #[cfg(target_arch = "wasm32")]
    fn mesh_on_physic_tick(number: usize);
    #[cfg(target_arch = "wasm32")]
    pub fn verticesChange(mesh_id: usize);
}

pub struct Engine {
    pub engine2: Option<Engine2>,
}

pub static mut ENGINE: Engine = Engine { engine2: None };
#[no_mangle]
#[cfg(feature = "webgpu")]
#[externref]
pub unsafe extern "C" fn get_gpu_mesh_buffer() -> &'static Resource<JSBuffer> {
    &ENGINE
        .physic_engine()
        .gpu
        .as_ref()
        .unwrap()
        .gpu_buffer
        .externref
}
#[no_mangle]
#[cfg(feature = "webgpu")]
#[externref]
pub unsafe extern "C" fn get_directional_lights_buffer() -> &'static Resource<JSBuffer> {
    &ENGINE
        .physic_engine()
        .directional_lights
        .buffer
        .as_ref()
        .unwrap()
        .externref
}
#[no_mangle]
#[cfg(feature = "webgpu")]
#[externref]
pub unsafe extern "C" fn get_point_lights_buffer() -> &'static Resource<JSBuffer> {
    &ENGINE
        .physic_engine()
        .point_lights
        .buffer
        .as_ref()
        .unwrap()
        .externref
}

pub struct Engine2 {
    pub physic_pipeline: PhysicsPipeline,
    pub rigid_body_set: RigidBodySet,
    pub collider_set: ColliderSet,
    pub island_manager: IslandManager,
    pub narrow_phase: NarrowPhase,
    pub ccd_solver: CCDSolver,
    pub meshes: Vec<Mesh>,
    pub rigid_bodies: HashMap<RigidBodyHandle, usize>,
    pub broad_phase: DefaultBroadPhase,
    pub joint_set: ImpulseJointSet,
    pub gpu_allocated: FreeIndex,
    pub gpu: Option<GPU>,
    pub point_lights: Lights,
    pub directional_lights: Lights,
    pub cameras: Cameras,
}
pub static GPU_QUEUE: LazyLock<Mutex<Vec<usize>>> =
    LazyLock::new(|| Mutex::new(Vec::with_capacity(128)));

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
    init_engine();
    debug_assert!(std::mem::size_of::<GPUMesh>() % 8 == 0, "GPUMesh offset must be multiple of 8 https://www.w3.org/TR/webgpu/#dom-gpubuffer-getmappedrange");
    std::mem::size_of::<GPUMesh>()
}

pub fn init_engine() {
    let rigid_body_set = RigidBodySet::new();
    let collider_set = ColliderSet::new();

    let e = Engine2 {
        physic_pipeline: PhysicsPipeline::new(),
        rigid_body_set,
        collider_set,
        island_manager: IslandManager::new(),
        narrow_phase: NarrowPhase::new(),
        meshes: Vec::with_capacity(100),
        rigid_bodies: HashMap::new(),
        broad_phase: DefaultBroadPhase::new(),
        ccd_solver: CCDSolver::new(),
        joint_set: ImpulseJointSet::new(),
        gpu_allocated: FreeIndex::new(),
        gpu: None,
        point_lights: Lights::new(String::from("GPUPointLights")),
        directional_lights: Lights::new(String::from("GPUDirectionalLights")),
        cameras: Cameras {
            cameras: Vec::with_capacity(4),
        },
    };
    unsafe {
        ENGINE.engine2 = Some(e);
    }
}
unsafe fn collider_to_mesh<'frame>(
    e: &'frame Engine2,
    collider_handle: ColliderHandle,
) -> Option<&'frame Mesh> {
    /*let collider = e.collider_set.get(collider_handle)?;
    let rigid_body_handle = collider.parent()?;
    let mesh_id = e.rigid_bodies.get(&rigid_body_handle)?;
    return Some(get_mesh_by_id(*mesh_id));*/
    return match e.collider_set.get(collider_handle) {
        Some(collider) => match collider.parent() {
            Some(rigid_body_handle) => {
                let mesh_id = e.rigid_bodies.get(&rigid_body_handle);
                match mesh_id {
                    Some(id) => Some(get_mesh_by_id(*id)),
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

    let e = ENGINE.physic_engine_mut();
    e.meshes.iter().for_each(|m| mesh_on_physic_tick(m.id));

    e.physic_pipeline.step(
        &gravity,
        &integration_parameters,
        &mut e.island_manager,
        &mut e.broad_phase,
        &mut e.narrow_phase,
        &mut e.rigid_body_set,
        &mut e.collider_set,
        &mut e.joint_set,
        &mut multi_joint_set,
        &mut e.ccd_solver,
        None,
        &physics_hooks,
        &event_handler,
    );
    while let Ok(collision_event) = collision_recv.try_recv() {
        // Handle the collision event.
        match collider_to_mesh(e, collision_event.collider1()) {
            Some(m) => mesh_on_collide(m.id, collision_event.started()),
            None => js_warn(["Mesh not found for collider1"]),
        }
        match collider_to_mesh(e, collision_event.collider2()) {
            Some(m) => mesh_on_collide(m.id, collision_event.started()),
            None => js_warn(["Mesh not found for collider2"]),
        }
    }
    // Iter on each dynamic rigid-bodies that moved.
    for rigid_body_handle in e.island_manager.active_dynamic_bodies() {
        let mesh = e.rigid_bodies.get_mut(rigid_body_handle);
        match mesh {
            Some(m_id) => {
                let rigid_body = &e.rigid_body_set[*rigid_body_handle];
                let newrot = rigid_body.rotation().as_vector();
                let mesh: &mut Mesh = get_mesh_by_id_mut(*m_id);
                {
                    let mut mesh_property = mesh.mesh_property.lock().unwrap();
                    mesh_property.rotation.i = newrot.x;
                    mesh_property.rotation.j = newrot.y;
                    mesh_property.rotation.k = newrot.z;
                    mesh_property.rotation.w = newrot.w;
                }
                let pos = rigid_body.position();
                mesh.update_translation(pos.translation.x, pos.translation.y, pos.translation.z, false);
            }
            None => js_warn(["Mesh not found for rigid body"]),
        }
    }
}
//const GPU_QUEUE: Vec<(* const GPUMesh, u32)> = Vec::new();
//const MESHES: Vec<*const Mesh> = Vec::new();
impl Engine {
    pub fn physic_engine(&self) -> &Engine2 {
        match &self.engine2 {
            Some(e) => {
                return e;
            }
            None => panic!("Engine not initialized"),
        }
    }
    pub fn physic_engine_mut(&mut self) -> &mut Engine2 {
        match &mut self.engine2 {
            Some(e) => {
                return e;
            }
            None => panic!("Engine not initialized"),
        }
    }
}

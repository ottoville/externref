use std::collections::{HashMap, HashSet};
use std::panic;

pub use crate::mesh::Mesh;
pub use crate::GPUMesh;
use rapier3d::prelude::*;

#[link(wasm_import_module = "console")]
#[cfg(target_arch = "wasm32")]
extern "C" {
    fn log(number: &'static String);
    fn warn(number: &'static String);
}

extern "C" {
    #[cfg(feature = "webgpu")]
    fn update_point_lights(pointer: *const u32, length: usize);
    #[cfg(feature = "webgpu")]
    fn update_directional_lights(pointer: *const u32, length: usize);
    #[cfg(feature = "webgpu")]
    fn handle_gpu_queue(pointerVec: *const usize, length: usize);
    #[cfg(feature = "webgpu")]
    fn updateAllocatedMemory(ptr: *const u32, length: usize);
    #[cfg(target_arch = "wasm32")]
    fn jspanic(number: *const u8);
    #[cfg(target_arch = "wasm32")]
    fn mesh_on_collide(number: usize, status: bool);
    #[cfg(target_arch = "wasm32")]
    fn mesh_on_physic_tick(number: usize);
}
pub struct Engine {
    gpu_reserved_slots: u64,
    pub point_lights: Vec<u32>,
    pub directional_lights: Vec<u32>,
    pub allocated_gpu_memory: Vec<u32>,
    pub engine2: Option<Engine2>,
}
pub static mut ENGINE: Engine = Engine {
    gpu_reserved_slots:
        0b0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000, //ZERO:Free, ONE: Reserved
    point_lights: Vec::new(),
    directional_lights: Vec::new(),
    allocated_gpu_memory: Vec::new(),
    engine2: None,
};
static mut GPU_QUEUE: Vec<usize> = vec![];

#[no_mangle]
#[cfg(feature = "webgpu")]
pub unsafe extern "C" fn renderloop() {
    use crate::{mesh::get_mesh_by_id_mut};

    let engine2 = ENGINE.physic_engine_mut();
    if engine2.gpu_queue2.len() > 0 {
        GPU_QUEUE = Vec::from_iter(engine2.gpu_queue2.drain());
        let iter = GPU_QUEUE.iter();
        for mesh_id in iter {
            let mesh = get_mesh_by_id_mut(*mesh_id);
            if mesh.transformation_is_dirty {
                mesh.update_matrix();
            }
        }
        handle_gpu_queue(GPU_QUEUE.as_ptr(), GPU_QUEUE.len());
    }
}
pub struct Engine2 {
    pub physic_pipeline: PhysicsPipeline,
    pub rigid_body_set: RigidBodySet,
    pub collider_set: ColliderSet,
    pub island_manager: IslandManager,
    pub narrow_phase: NarrowPhase,
    pub ccd_solver: CCDSolver,
    pub meshes: Vec<Mesh>,
    pub rigid_bodies: HashMap<RigidBodyHandle, &'static mut Mesh>,
    pub broad_phase: BroadPhase,
    pub gpu_meshes: Vec<GPUMesh>,
    pub joint_set: ImpulseJointSet,
    pub gpu_queue2: HashSet<usize>,
}
static mut LOG_STRING: String = String::new();
// TODO, remove and use "str_ptr_from_vec" syntax
pub fn create_js_string(mut str: String) -> *const u8 {
    str.truncate(512);
    let log_str = format!("{: <512}", str);
    let ptr = log_str.as_ptr();
    std::mem::forget(log_str);
    return ptr;
}
fn str_ptr_from_vec(strings: Vec<String>) -> &'static String {
    unsafe {
        LOG_STRING.clear();
        for str in strings.iter() {
            LOG_STRING.push(' ');
            LOG_STRING.push_str(str);
        }
        return &LOG_STRING;
    }
}
pub fn js_log(strings: Vec<String>) {
    unsafe {
        #[cfg(target_arch = "wasm32")]
        log(str_ptr_from_vec(strings));
    }
}
pub fn js_warn(strings: Vec<String>) {
    unsafe {
        #[cfg(target_arch = "wasm32")]
        warn(str_ptr_from_vec(strings));
    }
}

#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub extern "C" fn init_engine2() -> usize {
    panic::set_hook(Box::new(|panic_info| unsafe {
        jspanic(create_js_string(panic_info.to_string()));
    }));
    init_engine();
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
        broad_phase: BroadPhase::new(),
        gpu_meshes: Vec::with_capacity(100),
        ccd_solver: CCDSolver::new(),
        joint_set: ImpulseJointSet::new(),
        gpu_queue2: HashSet::new(),
    };
    unsafe {
        ENGINE.engine2 = Some(e);
    }
}
unsafe fn collider_to_mesh<'frame>(
    e: &'frame Engine2,
    collider_handle: ColliderHandle,
) -> Option<&'frame &'frame mut Mesh> {
    return match e.collider_set.get(collider_handle) {
        Some(collider) => match collider.parent() {
            Some(rigid_body_handle) => e.rigid_bodies.get(&rigid_body_handle),
            None => None,
        },
        None => None,
    };
}
#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub unsafe extern "C" fn physic_tick() {
    //  jslog_number(&(ENGINE.physic_engine().meshes[0]) as *const Mesh as u32);

    use rapier3d::crossbeam;
    let gravity = vector![0.0, -9.81, 0.0];
    let integration_parameters = IntegrationParameters::default();

    let mut multi_joint_set = MultibodyJointSet::new();
    let physics_hooks = ();
    // Initialize the event collector.
    //TODO: do not create on each step.
    let (contact_send, contact_recv) = crossbeam::channel::unbounded();
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
        /*jslog_string(vec![format!(
            "Received collision event: {:?}",
            collision_event
        )]);*/
        match collider_to_mesh(e, collision_event.collider1()) {
            Some(m) => mesh_on_collide(m.id, collision_event.started()),
            None => js_log(vec!["Mesh not found for collider1".to_string()]),
        }
        match collider_to_mesh(e, collision_event.collider2()) {
            Some(m) => mesh_on_collide(m.id, collision_event.started()),
            None => js_log(vec!["Mesh not found for collider2".to_string()]),
        }
    }
    // Iter on each dynamic rigid-bodies that moved.
    for rigid_body_handle in e.island_manager.active_dynamic_bodies() {
        let mesh = e.rigid_bodies.get_mut(rigid_body_handle);
        match mesh {
            Some(m) => {
                let rigid_body = &e.rigid_body_set[*rigid_body_handle];
                let newrot = rigid_body.rotation().as_vector();
                m.rotation.i = newrot.x;
                m.rotation.j = newrot.y;
                m.rotation.k = newrot.z;
                m.rotation.w = newrot.w;
                let pos = rigid_body.position();
                m.update_translation(pos.translation.x, pos.translation.y, pos.translation.z);
            }
            None => js_log(vec!["Mesh not found for rigid body".to_string()]),
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
    #[cfg(feature = "webgpu")]
    pub fn allocated_gpu_memory(&mut self) {
        self.allocated_gpu_memory.clear();
        self.allocated_gpu_memory.push(0);
        for i in 0..60 {
            let bit = (self.gpu_reserved_slots >> i) & 1u64;
            if bit == 1u64 {
                self.allocated_gpu_memory.push(i)
            }
        }
        self.allocated_gpu_memory[0] = self.allocated_gpu_memory.len() as u32;
        unsafe {
            updateAllocatedMemory(
                self.allocated_gpu_memory.as_ptr(),
                self.allocated_gpu_memory.len(),
            );
        }
    }
    #[cfg(feature = "webgpu")]
    pub fn update_point_lights(&self) {
        unsafe {
            update_point_lights(self.point_lights.as_ptr(), self.point_lights.len());
        }
    }
    #[cfg(feature = "webgpu")]
    pub fn update_directional_lights(&self) {
        unsafe {
            update_directional_lights(
                self.directional_lights.as_ptr(),
                self.directional_lights.len(),
            );
        }
    }

    pub fn allocate_gpu(&mut self) -> u32 {
        //ZERO:Free, ONE: Reserved
        let free_index = self.gpu_reserved_slots.trailing_ones();
        if free_index < 60u32 {
            //set bit to 1
            self.gpu_reserved_slots |= 1u64 << free_index;
        } else {
            //TODO
        }
        return free_index;
    }
    #[cfg(feature = "webgpu")]
    pub fn de_allocate_gpu(&mut self, address: u32) {
        self.gpu_reserved_slots &= !(1u64 << address);
        self.allocated_gpu_memory();
    }
}

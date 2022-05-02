use std::collections::HashMap;
use std::panic;

pub use crate::GPUMesh;
pub use crate::mesh::Mesh;
use rapier3d::prelude::*;


extern "C" {
    fn update_point_lights(pointer: *const u32, length:usize);
    fn update_directional_lights(pointer: *const u32, length:usize);
    fn handle_gpu_queue(pointerVec:*const[u32;2], length:usize);
    fn updateAllocatedMemory(ptr:*const u32, length: usize);
    fn jspanic(number:*const u8);
    fn jslog(number:*const u8);
}
pub struct Engine {
    gpu_reserved_slots: u64,
    pub gpu_queue2: Vec<(*const GPUMesh, u32)>, //mesh + gpu alignment //pub gpu_queue2: Vec<(*const GPUMesh, u32)>,
    pub point_lights:Vec<u32>,
    pub directional_lights:Vec<u32>,
    pub allocated_gpu_memory:Vec<u32>,
    pub engine2: Option<Engine2>,

}
pub static mut ENGINE:Engine = Engine {
    gpu_reserved_slots: 0b0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000,  //ZERO:Free, ONE: Reserved
    gpu_queue2: Vec::new(),
    point_lights: Vec::new(),
    directional_lights: Vec::new(),
    allocated_gpu_memory: Vec::new(),
    engine2: None
};

#[no_mangle]
pub unsafe extern "C" fn handle_gpu_queue_rust() {
    if ENGINE.gpu_queue2.len() > 0 {
        handle_gpu_queue(ENGINE.gpu_queue2.as_ptr() as *const [u32; 2], ENGINE.gpu_queue2.len());
        ENGINE.gpu_queue2.clear()
    }
}
pub struct Engine2 {
    physic_pipeline: PhysicsPipeline,
    pub rigid_body_set: RigidBodySet,
    pub collider_set: ColliderSet,
    pub island_manager: IslandManager,
    narrow_phase: NarrowPhase,
    pub meshes: Vec<Mesh>,
    pub rigid_bodies: HashMap<RigidBodyHandle,&'static mut Mesh>,
    broad_phase: BroadPhase,
    pub gpu_meshes: Vec<GPUMesh>
}
pub fn create_js_string(mut str:String) -> *const u8 {
    str.truncate(512);
    let log_str = format!("{: <512}", str);
    let ptr=log_str.as_ptr();
    std::mem::forget(log_str);
    return ptr;
}
pub fn jslog_string(strings: Vec<String>) {
    let mut newstr=String::new();
    for str in strings.iter() {
        newstr.push(' ');
        newstr.push_str(str);
    }
    unsafe {
       jslog(create_js_string(newstr));
    }
}
#[no_mangle]
pub unsafe extern "C" fn init_engine2() {
    panic::set_hook(Box::new(|panic_info| {
        jspanic(create_js_string(panic_info.to_string()));
    }));
    let mut rigid_body_set = RigidBodySet::new();
    let mut collider_set = ColliderSet::new();

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
    };

    ENGINE.engine2=Some(e);
}
#[no_mangle]
pub unsafe extern "C" fn physic_tick() {
      //  jslog_number(&(ENGINE.physic_engine().meshes[0]) as *const Mesh as u32);
        let gravity = vector![0.0, -9.81, 0.0];
        let integration_parameters = IntegrationParameters::default();
        
        let mut joint_set = ImpulseJointSet::new();
        let mut multi_joint_set = MultibodyJointSet::new();
        let mut ccd_solver = CCDSolver::new();
        let physics_hooks = ();
        let event_handler = ();

        let e = ENGINE.physic_engine_mut();
        e.physic_pipeline.step(
            &gravity,
            &integration_parameters,
            &mut e.island_manager,
            &mut e.broad_phase,
            &mut e.narrow_phase,
            &mut e.rigid_body_set,
            &mut e.collider_set,
            &mut joint_set,
            &mut multi_joint_set,
            &mut ccd_solver,
            &physics_hooks,
            &event_handler);

        // Iter on each dynamic rigid-bodies that moved.
        for rigid_body_handle in e.island_manager.active_dynamic_bodies() {
            let mesh=e.rigid_bodies.get_mut(rigid_body_handle);
            match mesh {
                Some(m) => {
                   // jslog(create_js_string("Mesh found".to_string()));
                    let rigid_body = &e.rigid_body_set[*rigid_body_handle];
                    let pos=rigid_body.position();
                    m.update_translation(pos.translation.x, pos.translation.y, pos.translation.z);
                }
                None => {
                    jslog(create_js_string("Mesh not found".to_string()))
                }
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
            None => panic!("Engine not initialized")
        }
    }
    pub fn physic_engine_mut(&mut self) -> &mut Engine2 {
        match &mut self.engine2 {
            Some(e) => {
                return e;
            }
            None => panic!("Engine not initialized")
        }
    }
    pub fn allocated_gpu_memory (&mut self) {
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
            updateAllocatedMemory(self.allocated_gpu_memory.as_ptr(),self.allocated_gpu_memory.len());
        }
    }
    pub fn gpu_queue_pointer2(&self) -> *const (*const GPUMesh, u32) {
        return self.gpu_queue2.as_ptr();
    }
    pub fn update_point_lights(&self) {
        unsafe {
            update_point_lights(self.point_lights.as_ptr(), self.point_lights.len());
        }
    }
    pub fn update_directional_lights(&self) {
        unsafe {
            update_directional_lights(self.directional_lights.as_ptr(),self.directional_lights.len());
        }
    }

    pub fn allocate_gpu(&mut self) -> u32 {
        //ZERO:Free, ONE: Reserved
        let free_index=self.gpu_reserved_slots.trailing_ones();
        if free_index < 60u32 {
            //set bit to 1
            self.gpu_reserved_slots |= 1u64<<free_index;
        }
        else {
            //TODO
        }
        return free_index;
    }
    pub fn de_allocate_gpu(&mut self, address: u32) {
        self.gpu_reserved_slots &= !(1u64<<address);
        self.allocated_gpu_memory();
    }
}

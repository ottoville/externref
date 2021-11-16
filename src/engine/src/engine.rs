pub use crate::GPUMesh;
pub use crate::mesh::Mesh;
extern "C" {
    fn update_point_lights(pointer: *const u32, length:usize);
    fn update_directional_lights(pointer: *const u32, length:usize);
    fn handle_gpu_queue(pointerVec:*const (*const GPUMesh, u32), length:usize);
    fn updateAllocatedMemory(ptr:*const u32, length: usize);
}
pub struct Engine {
    gpu_reserved_slots: u64,
    pub gpu_queue2: Vec<(*const GPUMesh, u32)>, //mesh + gpu alignment //pub gpu_queue2: Vec<(*const GPUMesh, u32)>,
    pub point_lights:Vec<u32>,
    pub directional_lights:Vec<u32>,
    pub allocated_gpu_memory:Vec<u32>
}
pub static mut ENGINE:Engine = Engine {
    gpu_reserved_slots: 0b0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000,  //ZERO:Free, ONE: Reserved
    gpu_queue2: Vec::new(),
    point_lights: Vec::new(),
    directional_lights: Vec::new(),
    allocated_gpu_memory: Vec::new(),
};

#[no_mangle]
pub unsafe extern "C" fn handle_gpu_queue_rust() {
    if ENGINE.gpu_queue2.len() > 0 {
        handle_gpu_queue(ENGINE.gpu_queue2.as_ptr(), ENGINE.gpu_queue2.len());
        ENGINE.gpu_queue2.clear()
    }
    //(ENGINE.gpu_queue2.as_ptr(), ENGINE.gpu_queue2.len())
}
//const GPU_QUEUE: Vec<(* const GPUMesh, u32)> = Vec::new();
//const MESHES: Vec<*const Mesh> = Vec::new();
impl Engine {
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

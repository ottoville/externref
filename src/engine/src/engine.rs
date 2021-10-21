pub use crate::GPUMesh;
pub use crate::mesh::Mesh;
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = engine)]
    fn update_point_lights(pointer: *const u32, length:usize);
    #[wasm_bindgen(js_namespace = engine)]
    fn update_directional_lights(pointer: *const u32, length:usize);
}
#[wasm_bindgen]
pub struct Engine {
    gpu_reserved_slots: u64,
    #[wasm_bindgen(skip)]
    pub gpu_queue2: Vec<(*const GPUMesh, u32)>, //mesh + gpu alignment
    gpu_queue_raw_parts: [usize;2],
    #[wasm_bindgen(skip)]
    pub point_lights:Vec<u32>,
    #[wasm_bindgen(skip)]
    pub directional_lights:Vec<u32>
}


//const GPU_QUEUE: Vec<(* const GPUMesh, u32)> = Vec::new();
//const MESHES: Vec<*const Mesh> = Vec::new();
#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Engine {
            gpu_reserved_slots: 0b0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000,  //ZERO:Free, ONE: Reserved
            gpu_queue2: Vec::new(),
            gpu_queue_raw_parts: [0,0],
            point_lights: Vec::new(),
            directional_lights: Vec::new(),
        }
    }
    #[wasm_bindgen(getter)]
    pub fn get_gpu_queue_raw_parts_ptr(&mut self) -> *const usize {
        self.gpu_queue_raw_parts=[self.gpu_queue2.as_ptr() as usize, self.gpu_queue2.len() as usize];
        return self.gpu_queue_raw_parts.as_ptr();
    }
   
    #[wasm_bindgen(getter)]
    pub fn gpu_queue_pointer2(&self) -> *const (*const GPUMesh, u32) {
        return self.gpu_queue2.as_ptr();
    }
        pub fn clear_gpu_queue(&mut self) {
        self.gpu_queue2.clear()
    }
    pub fn update_point_lights(&self) {
        update_point_lights(self.point_lights.as_ptr(), self.point_lights.len());
    }
    pub fn update_directional_lights(&self) {
        update_directional_lights(self.directional_lights.as_ptr(),self.directional_lights.len());
    }
    #[wasm_bindgen(getter)]
    pub fn allocated_gpu_memory(&self) -> Vec<u32> {
        let mut slots:Vec<u32>=Vec::with_capacity(60);
        for i in 0..60 {
            let bit = (self.gpu_reserved_slots >> i) & 1u64;
            if bit == 1u64 {
                slots.push(i)
            }
        }
        return slots;
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
        /*let d = self.gpu_reserved_slots ^ (1<<freeIndex);

        let o = self.gpu_released_slots.pop();
        let slot = match o {
            None => {
                let r = self.gpu_next_available_address;
                self.gpu_next_available_address += 1;
                return r;
            }
            Some(i) => i,
        };

        return slot;*/
    }
    pub fn de_allocate_gpu(&mut self, address: u32) {
        self.gpu_reserved_slots &= !(1u64<<address);
        /*

        if address == self.gpu_next_available_address - 1 {
            self.gpu_next_available_address -= 1;
            loop {
                let max_used_address = self.gpu_next_available_address - 1;
                if self.gpu_released_slots.iter().max() == Some(&max_used_address) {
                    self.gpu_released_slots.pop();
                    self.gpu_next_available_address = max_used_address;
                } else {
                    break;
                }
            }
        } else {
            self.gpu_released_slots.push(address);
        }*/
    }
}

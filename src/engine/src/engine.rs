pub use crate::GPUMesh;
pub use crate::mesh::Mesh;
use wasm_bindgen::prelude::*;
use std::collections::HashSet;
use std::collections::HashMap;
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = engine)]
    fn update_point_lights(lights: Vec<u32>);
    #[wasm_bindgen(js_namespace = engine)]
    fn update_directional_lights(lights: Vec<u32>);
}
#[wasm_bindgen]
pub struct Engine {
    gpu_reserved_slots: u64,
    #[wasm_bindgen(skip)]
    pub gpu_queue: HashMap<*const GPUMesh, u32>, //mesh + gpu alignment
    #[wasm_bindgen(skip)]
    pub point_lights:HashSet<u32>,
    #[wasm_bindgen(skip)]
    pub directional_lights:HashSet<u32>
}


//const GPU_QUEUE: Vec<(* const GPUMesh, u32)> = Vec::new();
//const MESHES: Vec<*const Mesh> = Vec::new();
#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Engine {
            gpu_reserved_slots: 0b0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000,  //ZERO:Free, ONE: Reserved
            gpu_queue: HashMap::new(),
            point_lights: HashSet::new(),
            directional_lights: HashSet::new(),
        }
    }
    #[wasm_bindgen(getter)]
    pub fn gpu_queue_pointer(&self) -> Vec<u32> {
        let as_vec:Vec<u32> = self.gpu_queue.clone().into_iter().map(|(gpu_mesh, alignment)| vec![gpu_mesh as u32,alignment]).flatten().into_iter().collect();//.collect();        
        return as_vec;
    }
    pub fn clear_gpu_queue(&mut self) {
        self.gpu_queue.clear()
    }
    pub fn update_point_lights(&self) {
        update_point_lights(self.point_lights.clone().into_iter().collect());
    }
    pub fn update_directional_lights(&self) {
        update_directional_lights(self.directional_lights.clone().into_iter().collect())
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
        self.point_lights.remove(&address);
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

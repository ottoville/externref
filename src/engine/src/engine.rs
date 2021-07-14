pub use crate::GPUMesh;
pub use crate::mesh::Mesh;
use wasm_bindgen::prelude::*;
use std::collections::HashSet;

#[wasm_bindgen]
pub struct Engine {
    gpu_slots: Vec<u32>,
    #[wasm_bindgen(skip)]
    pub gpu_queue: Vec<(*const GPUMesh, u32)>,
    gpu_next_available_address: u32,
    #[wasm_bindgen(skip)]
    pub lights:HashSet<u32>,
}


//const GPU_QUEUE: Vec<(* const GPUMesh, u32)> = Vec::new();
//const MESHES: Vec<*const Mesh> = Vec::new();
#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Engine {
            gpu_next_available_address: 0,
            gpu_slots: Vec::new(),
            gpu_queue: Vec::new(),
            lights: HashSet::new(),
        }
    }
    #[wasm_bindgen(getter)]
    pub fn gpu_queue_pointer(&self) -> Vec<usize> {
        return vec![self.gpu_queue.as_ptr() as usize,std::mem::size_of_val(&self.gpu_queue[..])];
    }
    pub fn clear_gpu_queue(&mut self) {
        self.gpu_queue.clear()
    }
    pub fn get_lights(&self) -> Vec<u32> {
        self.lights.clone().into_iter().collect()
    }
    pub fn allocate_gpu(&mut self) -> u32 {
        let o = self.gpu_slots.pop();
        match o {
            None => {
                let r = self.gpu_next_available_address;
                self.gpu_next_available_address += 1;
                return r;
            }
            Some(i) => i,
        }
    }
    pub fn de_allocate_gpu(&mut self, address: u32) {
        if address == self.gpu_next_available_address - 1 {
            self.gpu_next_available_address -= 1;
            loop {
                let max_used_address = self.gpu_next_available_address - 1;
                if self.gpu_slots.iter().max() == Some(&max_used_address) {
                    self.gpu_slots.pop();
                    self.gpu_next_available_address = max_used_address;
                } else {
                    break;
                }
            }
        } else {
            self.gpu_slots.push(address);
        }
    }
}

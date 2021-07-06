pub use crate::GPUMesh;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Engine {
    gpu_slots: Vec<u32>,
    #[wasm_bindgen(skip)]
    pub gpu_queue: Vec<(*const GPUMesh, u32)>,
    gpu_next_available_address: u32,
    #[wasm_bindgen(skip)]
    pub lights:Vec<u32>
}

//const GPU_QUEUE: Vec<(* const GPUMesh, u32)> = Vec::new();
//const MESHES: Vec<*const Mesh> = Vec::new();
#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let e = Engine {
            gpu_next_available_address: 0,
            gpu_slots: Vec::new(),
            gpu_queue: Vec::new(),
            lights: Vec::new(),
        };
        return e;
    }
    pub fn get_lights(&self) ->Vec<u32> {
        self.lights.clone()
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

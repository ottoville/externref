extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Engine {
   meshes: Vec<Mesh>,
}

#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Engine {
        Engine {
            meshes:Vec::new()
        }
    }
}

#[wasm_bindgen]
#[repr(align(8))]
pub struct Mesh {
    transformation: [f32;16],
    delta: [f32;4],
    custom: [f32;4],
    acceleration: [f32;4],
}

#[wasm_bindgen]
impl Mesh {
    #[wasm_bindgen]
    pub fn get_pointer(&self) -> * const f32 {
        (&self.transformation).as_ptr()
    }
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let m=Mesh {
            transformation:[
                1.0,0.0,0.0,0.0,
                0.0,1.0,0.0,0.0,
                0.0,0.0,1.0,0.0,
                0.0,0.0,0.0,1.0],
            delta:[0.0,0.0,0.0,0.0],
            custom:[0.0,0.0,0.0,0.0],
            acceleration:[0.0,0.0,0.0,0.0],
        };

        return m;
    }
}



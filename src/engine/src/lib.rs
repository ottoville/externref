extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Mesh {
    transformation: [f32;16],
    delta: [f32;4],
    custom: [f32;4],
    acceleration: [f32;4],
    alignment: [u32;144]
}
#[wasm_bindgen]
impl Mesh {
    #[wasm_bindgen(constructor)]
    pub fn new(c:f32) -> Mesh {
        Mesh {
            transformation:[
                1.0,0.0,0.0,0.0,
                0.0,1.0,0.0,0.0,
                0.0,0.0,1.0,0.0,
                0.0,0.0,0.0,1.0],
            delta:[0.0,0.0,0.0,0.0],
            custom:[c,0.0,0.0,0.0],
            acceleration:[0.0,0.0,0.0,0.0],
            alignment:[0;144]
        }
    }
}



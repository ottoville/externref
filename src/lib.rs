extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn test(x:f32) -> Vec<f32> {
    vec![x,x,x]
}


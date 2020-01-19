extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn test(x:f32) -> Vec<f32> {
    vec![x,x,x]
}
#[wasm_bindgen]
pub fn transformcoordinatesfromfloats(x: f32, y: f32, z: f32, m: Vec<f32>) -> Vec<f32> {
    let rx = x * m[0] + y * m[4] + z * m[8] + m[12];
    let ry = x * m[1] + y * m[5] + z * m[9] + m[13];
    let rz = x * m[2] + y * m[6] + z * m[10] + m[14];
    let rw = 1.0 / (x * m[3] + y * m[7] + z * m[11] + m[15]);

    vec![rx * rw,ry * rw, rz * rw]
}
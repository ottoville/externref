extern crate wasm_bindgen;
extern crate nalgebra;

use wasm_bindgen::prelude::*;
use nalgebra::Matrix4;

#[wasm_bindgen]
pub fn transformcoordinatesfromfloats(x: f32, y: f32, z: f32, m: Vec<f32>) -> Vec<f32> {

    let m1 = Matrix4::new(m[0], m[1],m[2],m[3],m[4], m[5],m[6],m[7],m[8], m[9], m[10],m[11],m[12],m[13],m[14],m[15]);
    let m2 = Matrix4::new(  x, y, z,  1.0,
                            x, y, z,  1.0,
                            x, y, z,  1.0,
                            x, y, z,  1.0);
    let r= m1*m2;
    vec![r[0],r[4],r[8]]
}
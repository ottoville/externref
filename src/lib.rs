extern crate wasm_bindgen;
extern crate nalgebra;

use wasm_bindgen::prelude::*;
use nalgebra::Matrix4;
//use nalgebra::Vector3;

#[wasm_bindgen]
pub fn test(x:f32) -> Vec<f32> {
    vec![x,x,x]
}
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
#[wasm_bindgen]
pub fn calculatelastcolliderworldvertices(positions: Vec<f32>, m: Vec<f32>) -> Vec<f32> {
    let m1 = Matrix4::new(
        m[0],m[4],m[8],m[12],
        m[1],m[5],m[9],m[13],
        m[2],m[6],m[10],m[14],
        m[3],m[7],m[11],m[15]);
    //let m1 = Matrix4::new(m[0], m[1],m[2],m[3],m[4], m[5],m[6],m[7],m[8], m[9], m[10],m[11],m[12],m[13],m[14],m[15]);
    let iter = positions.chunks(3);
    let mut r : Vec<f32> = Vec::new();
    for i in iter {
        r.append(&mut transformcoordinatesfromfloats2(i,&m1));
    };
    r
}
pub fn transformcoordinatesfromfloats2(xyz: &[f32], m1: &nalgebra::Matrix4<f32>) -> Vec<f32> {
   /* let m2 = Matrix4::new(
        xyz[0], xyz[1], xyz[2],  1.0,
        xyz[0], xyz[1], xyz[2],  1.0,
        xyz[0], xyz[1], xyz[2],  1.0,
        xyz[0], xyz[1], xyz[2],  1.0);*/
    let m2 = Matrix4::new(
        xyz[0], xyz[0], xyz[0], xyz[0],
        xyz[1], xyz[1], xyz[1], xyz[1],
        xyz[2], xyz[2], xyz[2],  xyz[2],
        1.0,  1.0,  1.0,  1.0);
    let r= m1*m2;
    //vec![r[0],r[4],r[8]]
    vec![r[0],r[1],r[2]]
}
#!cfg(target_arch = "wasm32")]
#![feature(vec_into_raw_parts)]

extern crate wasm_bindgen;

mod engine;
mod geometry;
mod mesh;
mod boundingbox;
mod terrain;
mod collider;
mod drawable;

pub use crate::engine::Engine;
pub use crate::geometry::Geometry;
pub use crate::terrain::elevator::Elevator;
#[derive(Copy, Clone)]

pub struct Vec4<T> {
    x: T,
    y: T,
    z: T,
    w: T,
}
#[derive(Copy, Clone)]
pub struct Vec3<T> {
    x: T,
    y: T,
    z: T,
}
#[repr(C, align(16))]
#[derive(Copy, Clone)]
pub struct Vec3_f32 {
    x: f32,
    y: f32,
    z: f32,
}
impl Vec3_f32 {
    fn transform_to_ref(&self, m: &Vec4<Vec4<f32>>, other: &mut Vec3_f32) {
        let rx = self.x * m.x.x + self.y * m.y.x + self.z * m.z.x + m.w.x;
        let ry = self.x * m.x.y + self.y * m.y.y + self.z * m.z.y + m.w.y;
        let rz = self.x * m.x.z + self.y * m.y.z + self.z * m.z.z + m.w.z;
        let rw = 1.0 / (self.x * m.x.w + self.y * m.y.w + self.z * m.y.w + m.w.w);
        other.x = rx * rw;
        other.y = ry * rw;
        other.z = rz * rw;
    }
}

impl Vec4<f32> {
    fn get_min(&self) -> f32 {
        self.x.min(self.y.min(self.z.min(self.w)))
    }
    fn get_max(&self) -> f32 {
        self.x.max(self.y.max(self.z.max(self.w)))
    }
    #[cfg(not(target_arch = "wasm32"))]
    fn min(&self, other: &Vec4<f32>) -> Vec4<f32> {
        Vec4 {
            x:self.x.min(other.x),
            y:self.y.min(other.y),
            z:self.z.min(other.z),
            w:self.w.min(other.w)
        }
    }
    #[cfg(not(target_arch = "wasm32"))]
    fn max(&self, other: &Vec4<f32>) -> Vec4<f32> {
        Vec4 {
            x:self.x.max(other.x),
            y:self.y.max(other.y),
            z:self.z.max(other.z),
            w:self.w.max(other.w)
        }
    }
    #[cfg(target_arch = "wasm32")]
    fn min(&self, other: &Vec4<f32>) -> Vec4<f32> {
        use std::arch::wasm32::*;
        unsafe {
            let v0 = v128_load(self as *const Vec4<f32> as *const v128);
            let v1 = v128_load(other as *const Vec4<f32> as *const v128);
            let res=f32x4_pmin(v0, v1);
            return std::mem::transmute::<v128, Vec4<f32>>(res);
        }
    }
    #[cfg(target_arch = "wasm32")]
    fn max(&self, other: &Vec4<f32>) -> Vec4<f32> {
        use std::arch::wasm32::*;
        unsafe {
            let v0 = v128_load(self as *const Vec4<f32> as *const v128);
            let v1 = v128_load(other as *const Vec4<f32> as *const v128);
            let res=f32x4_pmax(v0, v1);
            return std::mem::transmute::<v128, Vec4<f32>>(res);
        }
    }
}
pub struct GPUMesh {
    transformation: Vec4<Vec4<f32>>, //16
    delta: [f32; 4],                 //20
    custom: [f32; 4],                //24 user for color in simple.vert
    acceleration: [f32; 4],          //28
    id: u32,                         //29
    point_light_squared:f32,          //30
    directional_light:f32,          //31
    scenes:u32, //bitmask
}
impl GPUMesh {
    pub fn set_point_light(&mut self, engine:&mut Engine, range:f32, gpu_alignment:u32) {
        let old_value = self.point_light_squared;
        if range > 0.0 {
            self.point_light_squared = range * range;
            if old_value == 0.0 {
                engine.point_lights.push(gpu_alignment);
                engine.update_point_lights();
            }
        } else {
            self.point_light_squared = 0.0;
            if old_value > 0.0 {
                let index = engine.point_lights.iter().position(|x| *x == gpu_alignment).unwrap();
                engine.point_lights.swap_remove(index);
                engine.update_point_lights();
            }
        }
    }
    pub fn set_directional_light(&mut self, engine:&mut Engine, range:f32, gpu_alignment:u32) {
        let old_value = self.directional_light;
        if range > 0.0 {
            self.directional_light = range;
            if old_value == 0.0 {
                engine.directional_lights.push(gpu_alignment);
                engine.update_directional_lights();
            }
        } else {
            self.directional_light = 0.0;
            if old_value > 0.0 {
                let index = engine.directional_lights.iter().position(|x| *x == gpu_alignment).unwrap();
                engine.directional_lights.swap_remove(index);
                engine.update_directional_lights();
            }
        }
    }
}
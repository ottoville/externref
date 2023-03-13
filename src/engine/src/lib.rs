#!cfg(target_arch = "wasm32")]

mod boundingbox;
mod collider;
mod drawable;
mod engine;
mod geometry;
mod math2;
mod mesh;
mod terrain;
mod meshes;

pub use crate::engine::Engine;
pub use crate::geometry::Geometry;
pub use crate::terrain::elevator::Elevator;

use math2::Vec4;
use rapier3d::prelude::*;

#[no_mangle]
pub extern "C" fn alloc_vector_f32(size: usize) -> *mut f32 {
    let mut buf = std::mem::ManuallyDrop::new(vec![0.0; size]);
    buf.as_mut_ptr()
}
#[no_mangle]
pub extern "C" fn alloc_vector_usize(size: usize) -> *mut usize {
    let mut buf = std::mem::ManuallyDrop::new(vec![0; size]);
    buf.as_mut_ptr()
}
#[no_mangle]
pub extern "C" fn alloc_string(size: usize) -> *const std::os::raw::c_char {
    let str = format!("{:0>l$}", "\0", l = size + 1);
    let vec = str.as_bytes().to_vec();
    match std::ffi::CString::from_vec_with_nul(vec) {
        Ok(s) => s.into_raw(),
        Err(e) => {
            panic!("{}", e.to_string())
        }
    }
}
#[no_mangle]
pub extern "C" fn create_ball_collider(radius: f32) -> *mut Collider {
    let collider = Box::new(ColliderBuilder::ball(radius).restitution(0.0).build());
    Box::leak(collider)
}

#[no_mangle]
pub extern "C" fn create_capsule_collider(
    half_height: f32,
    radius: f32,
    orientation: u32,
    collision_events: bool,
) -> *mut Collider {
    let mut colliderbuilder = if orientation == 0 {
        ColliderBuilder::capsule_y(half_height, radius).restitution(0.0)
    } else if orientation == 1 {
        ColliderBuilder::capsule_x(half_height, radius).restitution(0.0)
    } else {
        ColliderBuilder::capsule_z(half_height, radius).restitution(0.0)
    };

    if collision_events {
        colliderbuilder = colliderbuilder.active_events(ActiveEvents::COLLISION_EVENTS);
    }
    Box::leak(Box::new(colliderbuilder.build()))
}
#[no_mangle]
pub extern "C" fn create_cuboid_collider(
    hx: f32,
    hy: f32,
    hz: f32,
    border_radius: f32,
    collision_events: bool,
) -> *mut Collider {

    let mut colliderbuilder = if border_radius > 0.0 {
        ColliderBuilder::round_cuboid(hx, hy, hz, border_radius).restitution(0.0)
    } else {
        ColliderBuilder::cuboid(hx, hy, hz).restitution(0.0)

    };
    if collision_events {
        colliderbuilder = colliderbuilder.active_events(ActiveEvents::COLLISION_EVENTS);
    }
    Box::leak(Box::new(colliderbuilder.build()))
}
#[no_mangle]
pub extern "C" fn create_cone_collider(half_height: f32, radius: f32) -> *mut Collider {
    let collider = Box::new(
        ColliderBuilder::cone(half_height, radius)
            .restitution(0.0)
            .build(),
    );
    Box::leak(collider)
}
#[repr(C)]
pub struct GPUMesh {
    transformation: Vec4<Vec4<f32>>, //16
    color: [f32; 4],                 //20
    ambient: [f32; 3],               //12
    shadow: f32,
    spotlight: [f32; 4],      //28
    _id: u32,                 //29
    point_light_squared: f32, //30
    directional_light: f32,   //31
    scenes: u32,              //bitmask           //48
}
impl GPUMesh {
    pub fn set_point_light(&mut self, engine: &mut Engine, range: f32, gpu_alignment: u32) {
        let old_value = self.point_light_squared;
        if range > 0.0 {
            self.point_light_squared = range * range;
            if old_value == 0.0 {
                engine.point_lights.push(gpu_alignment);
                #[cfg(feature = "webgpu")]
                engine.update_point_lights();
            }
        } else {
            self.point_light_squared = 0.0;
            if old_value > 0.0 {
                let index = engine
                    .point_lights
                    .iter()
                    .position(|x| *x == gpu_alignment)
                    .unwrap();
                engine.point_lights.swap_remove(index);
                #[cfg(feature = "webgpu")]
                engine.update_point_lights();
            }
        }
    }
    pub fn set_directional_light(&mut self, engine: &mut Engine, range: f32, gpu_alignment: u32) {
        let old_value = self.directional_light;
        if range > 0.0 {
            self.directional_light = range;
            if old_value == 0.0 {
                engine.directional_lights.push(gpu_alignment);
                #[cfg(feature = "webgpu")]
                engine.update_directional_lights();
            }
        } else {
            self.directional_light = 0.0;
            if old_value > 0.0 {
                let index = engine
                    .directional_lights
                    .iter()
                    .position(|x| *x == gpu_alignment)
                    .unwrap();
                engine.directional_lights.swap_remove(index);
                #[cfg(feature = "webgpu")]
                engine.update_directional_lights();
            }
        }
    }
}

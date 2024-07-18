#!cfg(target_arch = "wasm32")
mod boundingbox;
mod collider;
mod drawable;
mod engine;
mod geometry;
mod math2;
mod mesh;
mod meshes;
mod terrain;
mod freelist;
mod vertices;

use std::num::NonZeroUsize;

pub use crate::engine::Engine;
pub use crate::geometry::Geometry;
pub use crate::terrain::elevator::Elevator;

use math2::{Mat3wgslF32, Vec4};
use rapier3d::prelude::*;
use vertices::{Position, PositionAndNormal};

static mut MULTIVALUE_USIZE: [usize; 6] = [0; 6];
static mut MULTIVALUE_F32: [f32; 6] = [0.0; 6];

unsafe fn create_multivalue_vector<T>(vector: Vec<T>) -> *const usize {
    let mut buf = std::mem::ManuallyDrop::new(vector);
    MULTIVALUE_USIZE[0] = buf.as_mut_ptr() as usize;
    MULTIVALUE_USIZE[1] = buf.len();
    MULTIVALUE_USIZE[2] = buf.capacity();
    return MULTIVALUE_USIZE.as_ptr();
}

#[no_mangle]
pub unsafe extern "C" fn alloc_vector_f32(size: usize) -> *const usize {
    let mut vec: Vec<f32> = Vec::with_capacity(size);
    vec.set_len(size);    
    return create_multivalue_vector(vec);
}
#[no_mangle]
pub unsafe extern "C" fn alloc_vector_positions(size: usize) -> *const usize {
    let mut vec: Vec<Position> = Vec::with_capacity(size);
    vec.set_len(size);    
    return create_multivalue_vector(vec);
}
#[no_mangle]
pub unsafe extern "C" fn alloc_vector_positions_and_normal(size: usize) -> *const usize {
    let mut vec: Vec<PositionAndNormal> = Vec::with_capacity(size);
    vec.set_len(size);    
    return create_multivalue_vector(vec);
}
#[no_mangle]
pub unsafe extern "C" fn alloc_vector_usize(size: usize) -> *const usize {
    let mut vec: Vec<usize> = Vec::with_capacity(size);
    vec.set_len(size);    
    return create_multivalue_vector(vec)
}
#[no_mangle]
pub unsafe extern "C" fn alloc_vector_u8(size: usize) -> *const usize {
    let mut vec: Vec<u8> = Vec::with_capacity(size);
    vec.set_len(size);
    return create_multivalue_vector(vec)
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
    transformation: [[f32; 4]; 4],
    transformation_normals: Mat3wgslF32,
    color: [f32; 4],
    ambient: [f32; 3],
    shadow: f32,
    spotlight: [f32; 4],
    _id: usize,
    point_light_squared: f32,
    directional_light: f32,
    scenes: u32,
}
impl GPUMesh {
    pub fn set_point_light(&mut self, engine: &'static mut Engine, range: f32, gpu_alignment: NonZeroUsize) {
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
    pub fn set_directional_light(
        &mut self,
        engine: &'static mut Engine,
        range: f32,
        gpu_alignment: NonZeroUsize,
    ) {
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

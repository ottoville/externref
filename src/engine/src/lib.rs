#!cfg(target_arch = "wasm32")
mod allocators;
mod boundingbox;
pub mod cameras;
pub mod character;
mod devtools;
mod drawable;
mod engine;
mod geometry;
mod gpu;
mod indices;
mod math2;
mod mesh;
mod mesh_property;
mod meshes;
pub mod objectstores;
pub mod projection;
mod swapbuffers;
mod terrain;
mod vertices;

pub use crate::engine::Engine;
pub use crate::geometry::Geometry;
pub use crate::terrain::elevator::Elevator;
use crate::{mesh::ENGINE, Collider};

use ::allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;
use allocators::freeindex::FreeIndexIndex;
use math2::Mat3wgslF32;
use mesh::Mesh;
use rapier3d::prelude::*;

static mut MULTIVALUE_F32: [f32; 6] = [0.0; 6];

#[no_mangle]
pub extern "C" fn create_ball_collider(radius: f32) -> *mut Collider {
    let collider = Box::new(ColliderBuilder::ball(radius).restitution(0.0).build());
    Box::into_raw(collider)
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
    Box::into_raw(Box::new(colliderbuilder.build()))
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
    Box::into_raw(Box::new(colliderbuilder.build()))
}
#[no_mangle]
pub extern "C" fn create_cone_collider(half_height: f32, radius: f32) -> *mut Collider {
    let collider = Box::new(
        ColliderBuilder::cone(half_height, radius)
            .restitution(0.0)
            .build(),
    );
    Box::into_raw(collider)
}
#[repr(C)]
pub struct GPUMesh {
    transformation: [[f32; 4]; 4],
    transformation_normals: Mat3wgslF32,
    color: [f32; 4],
    ambient: [f32; 3],
    shadow: f32,
    spotlight: [f32; 4],
    id: Option<ExplicitGenerationalFreeListIndex<fn() -> Mesh>>,
    point_light_squared: f32,
    directional_light: f32,
    scenes: u32,
}
impl GPUMesh {
    pub fn set_point_light(&mut self, range: f32, gpu_alignment: FreeIndexIndex) {
        let point_lights = &mut ENGINE.point_lights.lock().unwrap();

        let old_value = self.point_light_squared;
        if range > 0.0 {
            self.point_light_squared = range * range;
            if old_value == 0.0 {
                point_lights.push(gpu_alignment);
            }
        } else {
            self.point_light_squared = 0.0;
            if old_value > 0.0 {
                point_lights.remove(gpu_alignment);
            }
        }
    }
    pub fn set_directional_light(&mut self, range: f32, gpu_alignment: FreeIndexIndex) {
        let directional_lights = &mut ENGINE.directional_lights.lock().unwrap();
        let old_value = self.directional_light;
        if range > 0.0 {
            self.directional_light = range;
            if old_value == 0.0 {
                directional_lights.push(gpu_alignment);
            }
        } else {
            self.directional_light = 0.0;
            if old_value > 0.0 {
                directional_lights.remove(gpu_alignment);
            }
        }
    }
}

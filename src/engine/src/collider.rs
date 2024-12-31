#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::v128;
use std::mem;

use crate::mesh::Plane;

pub struct Collider {
    pub basepoint_world: [f32; 4],
    intersection_point: [f32; 4],
    pub collision_resolved: u32,
    pub nearest_distance_squared: f32,
    scaled_position: [f32; 4],
    scaled_velocity: [f32; 4],
    collided_mesh: u32,
    pub speed: f32,
    collided_point_in_triangle: &'static Plane,
    // TODO: move to stack
    pub lowest_root: f32,
    // TODO: move to stack
    // TODO: when on stack use v128 type
    pub collision_point: [f32; 4],
}
#[no_mangle]
pub extern "C" fn collider() -> *const Collider {
    let coll = Box::new(Collider::new());
    Box::leak(coll)
}
#[no_mangle]
pub unsafe extern "C" fn intersection_point_pointer(collider_ptr: *const Collider) -> *const f32 {
    (*collider_ptr).intersection_point.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn lowest_root_pointer(collider_ptr: *const Collider) -> *const f32 {
    &raw const (*collider_ptr).lowest_root
}
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub unsafe extern "C" fn collision_point_pointer(collider_ptr: *const Collider) -> *const v128 {
    &raw const (*collider_ptr).collision_point as *const v128
}
#[no_mangle]
pub unsafe extern "C" fn collision_resolved_pointer(collider_ptr: *const Collider) -> &'static u32 {
    &((*collider_ptr).collision_resolved)
}
#[no_mangle]
pub unsafe extern "C" fn nearest_distance_squared_pointer(
    collider_ptr: *const Collider,
) -> &'static f32 {
    &((*collider_ptr).nearest_distance_squared)
}
#[no_mangle]
pub unsafe extern "C" fn set_nearest_distance_squared(collider_ptr: *mut Collider, distance: f32) {
    (*collider_ptr).nearest_distance_squared = distance;
}
#[no_mangle]
pub unsafe extern "C" fn get_nearest_distance_squared(collider_ptr: *const Collider) -> f32 {
    (*collider_ptr).nearest_distance_squared
}
#[no_mangle]
pub unsafe extern "C" fn scaled_position_pointer(collider_ptr: *const Collider) -> *const f32 {
    (*collider_ptr).scaled_position.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn scaled_velocity_pointer(collider_ptr: *const Collider) -> *const f32 {
    (*collider_ptr).scaled_velocity.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn collided_point_in_triangle_pointer(
    collider_ptr: *const Collider,
) -> &'static &'static Plane {
    &(*collider_ptr).collided_point_in_triangle
}
#[no_mangle]
pub unsafe extern "C" fn collided_mesh_pointer(collider_ptr: *const Collider) -> &'static u32 {
    &((*collider_ptr).collided_mesh)
}
#[no_mangle]
pub unsafe extern "C" fn speed_squared(collider_ptr: *const Collider) -> &'static f32 {
    &((*collider_ptr).speed)
}
#[no_mangle]
pub unsafe extern "C" fn set_speed(collider_ptr: *mut Collider, speed: f32) {
    (*collider_ptr).speed = speed;
}
#[no_mangle]
pub unsafe extern "C" fn basepoint_world_pointer(collider_ptr: *const Collider) -> *const f32 {
    (*collider_ptr).basepoint_world.as_ptr()
}
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn v3_dot(a: v128, b: v128) -> f32 {
    use std::arch::wasm32::{f32x4_extract_lane, f32x4_mul};
    let temp1 = f32x4_mul(a, b);
    f32x4_extract_lane::<0>(temp1) + f32x4_extract_lane::<1>(temp1) + f32x4_extract_lane::<2>(temp1)
}
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub unsafe extern "C" fn check_for_lowest_root(
    collider: *mut Collider,
    triangle1: v128,
    triangle2: v128,
    velocity: v128,
    velocity_squared: f32,
    basepoint: v128,
) {
    use std::arch::wasm32::{f32x4_add, f32x4_mul, f32x4_splat, f32x4_sub, v128_store};

    let edge: v128 = f32x4_sub(triangle1, triangle2);
    let edge_dot_velocity = v3_dot(edge, velocity);
    let edge_squared_length = v3_dot(edge, edge);

    let base_to_vertex = f32x4_sub(triangle2, basepoint);
    let edge_dot_base_to_vertex = v3_dot(edge, base_to_vertex);
    let cur_lowest_root = get_lowest_root(
        edge_dot_velocity * edge_dot_velocity - edge_squared_length * velocity_squared,
        2.0 * (edge_squared_length * v3_dot(velocity, base_to_vertex)
            - edge_dot_velocity * edge_dot_base_to_vertex),
        edge_squared_length * (1.0 - v3_dot(base_to_vertex, base_to_vertex))
            + edge_dot_base_to_vertex * edge_dot_base_to_vertex,
        (*collider).lowest_root,
    );
    if cur_lowest_root > 0.0 {
        let f = (edge_dot_velocity * (*collider).lowest_root - edge_dot_base_to_vertex)
            / edge_squared_length;
        if f < 0.0 {
            return;
        }
        if f > 1.0 {
            return;
        }
        (*collider).lowest_root = cur_lowest_root;
        
        v128_store((*collider).collision_point.as_mut_ptr() as *mut v128, f32x4_add(triangle2, f32x4_mul(edge, f32x4_splat(f))));
    }
}

#[no_mangle]
pub extern "C" fn get_lowest_root(a: f32, b: f32, c: f32, max_r: f32) -> f32 {
    let determinant = b * b - 4.0 * a * c;
    if determinant < 0.0 {
        return 0.0;
    }
    let sqrt_d = f32::sqrt(determinant);
    let doubled_a = 2.0 * a;
    let mut r1 = (-b - sqrt_d) / doubled_a;
    let mut r2 = (-b + sqrt_d) / doubled_a;

    if r1 > r2 {
        mem::swap(&mut r1, &mut r2);
    }
    if r1 > 0.0 && r1 < max_r {
        return r1;
    }
    if r2 > 0.0 && r2 < max_r {
        return r2;
    }
    return 0.0;
}
#[cfg(test)]
#[test]
fn lowest_root() {
    //determinant < 0
    let mut result = get_lowest_root(
        -189631.8622406479,
        362931.030971966,
        -214612.82423786155,
        1.0,
    );
    assert_eq!(result, 0.0);

    //r1
    result = get_lowest_root(
        -2755339.2714089374,
        1236275.7758921701,
        -138665.8530791428,
        1.0,
    );
    assert_eq!(result, 0.2226024);

    //r2
    result = get_lowest_root(
        277996.6249283695,
        -439.36045330401976,
        -0.1515882166195297,
        1.0,
    );
    assert_eq!(result, 0.0018717739);

    //last return
    result = get_lowest_root(
        -23649441.242871664,
        -41680497.82253834,
        -18363162.483611215,
        1.0,
    );
    assert_eq!(result, 0.0);
}

#[no_mangle]
pub unsafe extern "C" fn collision_found(
    collider_ptr: *mut Collider,
    t: f32,
    velocity_squared_length: f32,
    collided_point_in_triangle: bool,
    collided_plane: &'static Plane,
) {
    (*collider_ptr).collision_found(
        t,
        velocity_squared_length,
        collided_point_in_triangle,
        collided_plane,
    )
}
impl Collider {
    pub fn new() -> Self {
        unsafe {
            Collider {
                basepoint_world: [0.0, 0.0, 0.0, 0.0],
                intersection_point: [0.0, 0.0, 0.0, 0.0],
                collision_resolved: 1u32,
                nearest_distance_squared: 0.0,
                scaled_position: [0.0, 0.0, 0.0, 0.0],
                scaled_velocity: [0.0, 0.0, 0.0, 0.0],
                collided_mesh: 0u32,
                speed: 0.0,
                collided_point_in_triangle: *(0 as *const &'static Plane),
                lowest_root: 0.0,
                collision_point: [0.0; 4],
            }
        }
    }

    fn collision_found(
        &mut self,
        t: f32,
        velocity_squared_length: f32,
        collided_point_in_triangle: bool,
        collided_plane: &'static Plane,
    ) {
        let dist_to_collision_squared = t * t * velocity_squared_length;
        if self.collision_resolved == 1 || dist_to_collision_squared < self.nearest_distance_squared
        {
            self.intersection_point[0] = self.collision_point[0];
            self.intersection_point[1] = self.collision_point[1];
            self.intersection_point[2] = self.collision_point[2];
            self.nearest_distance_squared = dist_to_collision_squared;
            self.collision_resolved = 0;
            if collided_point_in_triangle {
                self.collided_point_in_triangle = collided_plane;
            } else {
                unsafe {
                    self.collided_point_in_triangle = *(0 as *const &'static Plane);
                }
            }
        }
    }
}


pub use crate::mesh::Mesh;
use crate::{mesh::Plane, engine::jslog_string};

pub struct Collider {
    pub basepoint_world:[f32;4],
    intersection_point:[f32;4],
    pub collision_resolved:u32,
    pub nearest_distance_squared:f32,
    scaled_position:[f32;4],
    scaled_velocity:[f32;4],
    collided_mesh:u32,
    pub speed:f32,
    collided_point_in_triangle: &'static Plane
}
#[no_mangle]
pub unsafe extern "C" fn collider() -> *const Collider {
    let coll = Box::new(Collider::new());
    Box::leak(coll)
}
#[no_mangle]
pub unsafe extern "C" fn intersection_point_pointer(collider_ptr:*const Collider) -> *const f32 {
    (*collider_ptr).intersection_point.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn collision_resolved_pointer(collider_ptr:*const Collider) -> &'static u32 {
    &((*collider_ptr).collision_resolved)
}
#[no_mangle]
pub unsafe extern "C" fn nearest_distance_squared_pointer(collider_ptr:*const Collider) -> &'static f32 {
    &((*collider_ptr).nearest_distance_squared)
}
#[no_mangle]
pub unsafe extern "C" fn set_nearest_distance_squared(collider_ptr:*mut Collider, distance:f32) {
    (*collider_ptr).nearest_distance_squared=distance;
}
#[no_mangle]
pub unsafe extern "C" fn get_nearest_distance_squared(collider_ptr:*const Collider) -> f32 {
    (*collider_ptr).nearest_distance_squared
}
#[no_mangle]
pub unsafe extern "C" fn scaled_position_pointer(collider_ptr:*const Collider) -> *const f32 {
    (*collider_ptr).scaled_position.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn scaled_velocity_pointer(collider_ptr:*const Collider) -> *const f32 {
    (*collider_ptr).scaled_velocity.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn collided_point_in_triangle_pointer(collider_ptr:*const Collider) -> &'static&'static Plane {
    &(*collider_ptr).collided_point_in_triangle
}
#[no_mangle]
pub unsafe extern "C" fn collided_mesh_pointer(collider_ptr:*const Collider) -> &'static u32 {
    &((*collider_ptr).collided_mesh)
}
#[no_mangle]
pub unsafe extern "C" fn speed_squared(collider_ptr:*const Collider) -> &'static f32 {
    &((*collider_ptr).speed)
}
#[no_mangle]
pub unsafe extern "C" fn set_speed(collider_ptr:*mut Collider, speed:f32) {
    (*collider_ptr).speed = speed;
}
#[no_mangle]
pub unsafe extern "C" fn basepoint_world_pointer(collider_ptr:*const Collider) -> *const f32 {
    (*collider_ptr).basepoint_world.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn collision_found(
    collider_ptr:*mut Collider,
    t:f32,
    velocity_squared_length:f32,
    collision_point_x:f32,
    collision_point_y:f32,
    collision_point_z:f32,
    collided_point_in_triangle: bool,
    collided_plane: &'static Plane) {
    (*collider_ptr).collision_found(
        t,
        velocity_squared_length,
        collision_point_x,
        collision_point_y,
        collision_point_z,
        collided_point_in_triangle,
        collided_plane
    )
}
impl Collider {
    pub unsafe fn new() -> Self {
        Collider {
            basepoint_world:[0.0,0.0,0.0,0.0],
            intersection_point:[0.0,0.0,0.0,0.0],
            collision_resolved:1u32,
            nearest_distance_squared:0.0,
            scaled_position:[0.0,0.0,0.0,0.0],
            scaled_velocity:[0.0,0.0,0.0,0.0],
            collided_mesh:0u32,
            speed:0.0,
            collided_point_in_triangle: *(0 as *const &'static Plane)
        }
    }
    unsafe fn collision_found(&mut self,
        t: f32,
        velocity_squared_length:f32,
        collision_point_x:f32,
        collision_point_y:f32,
        collision_point_z:f32,
        collided_point_in_triangle: bool,
        collided_plane: &'static Plane
    ) {
        let dist_to_collision_squared = t * t * velocity_squared_length;
        if self.collision_resolved == 1 || dist_to_collision_squared < self.nearest_distance_squared {
            self.intersection_point[0] = collision_point_x;
            self.intersection_point[1] = collision_point_y;
            self.intersection_point[2] = collision_point_z;
            self.nearest_distance_squared=dist_to_collision_squared;
            self.collision_resolved=0;
            if collided_point_in_triangle {
                self.collided_point_in_triangle = collided_plane;
            } else {
                self.collided_point_in_triangle = *(0 as *const &'static Plane)
            }
        }
    }

}
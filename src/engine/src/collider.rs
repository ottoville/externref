
pub use crate::mesh::Mesh;

pub struct Collider {
    pub basepoint_world:[f32;4],
    intersection_point:[f32;4],
    pub collision_resolved:u32,
    pub nearest_distance_squared:f32,
    scaled_position:[f32;4],
    scaled_velocity:[f32;4],
    collided_point_in_triangle_pointer:usize,
    collided_mesh:u32,
    pub speed:f32,
}
static COLLIDER:Collider=Collider {
    basepoint_world:[0.0,0.0,0.0,0.0],
    intersection_point:[0.0,0.0,0.0,0.0],
    collision_resolved:1u32,
    nearest_distance_squared:0.0,
    scaled_position:[0.0,0.0,0.0,0.0],
    scaled_velocity:[0.0,0.0,0.0,0.0],
    collided_point_in_triangle_pointer:0,
    collided_mesh:0u32,
    speed: 0.0,
};
#[no_mangle]
pub extern "C" fn collider() -> *const Collider {
    let ptr= &COLLIDER as *const _;
    return ptr;
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
pub unsafe extern "C" fn collided_point_in_triangle_pointer(collider_ptr:*const Collider) -> *const usize {
    &((*collider_ptr).collided_point_in_triangle_pointer)
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
pub unsafe extern "C" fn collision_found(collider_ptr:*mut Collider, dist_to_collision_squared:f32, collision_point_x:f32, collision_point_y:f32, collision_point_z:f32) {
    (*collider_ptr).collision_found(dist_to_collision_squared, collision_point_x, collision_point_y, collision_point_z)
}
impl Collider {
    pub fn new() -> Self {
        Collider {
            basepoint_world:[0.0,0.0,0.0,0.0],
            intersection_point:[0.0,0.0,0.0,0.0],
            collision_resolved:1u32,
            nearest_distance_squared:0.0,
            scaled_position:[0.0,0.0,0.0,0.0],
            scaled_velocity:[0.0,0.0,0.0,0.0],
            collided_point_in_triangle_pointer:0,
            collided_mesh:0u32,
            speed:0.0,
        }
    }
    fn collision_found(&mut self, dist_to_collision_squared:f32, collision_point_x:f32, collision_point_y:f32, collision_point_z:f32) {
        if self.collision_resolved == 1 || dist_to_collision_squared < self.nearest_distance_squared {
            self.intersection_point[0] = collision_point_x;
            self.intersection_point[1] = collision_point_y;
            self.intersection_point[2] = collision_point_z;
            self.nearest_distance_squared=dist_to_collision_squared;
            self.collision_resolved=0;
        }
    }

}
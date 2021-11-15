
pub use crate::mesh::Mesh;

pub struct Collider {
    intersection_point:[f32;4],
    pub collision_not_found:u32,
    pub nearest_distance_squared:f32,
    scaled_position:[f32;4],
    scaled_velocity:[f32;4],
    collided_mesh:u32
}
static COLLIDER:Collider=Collider {
    intersection_point:[0.0,0.0,0.0,0.0],
    collision_not_found:1u32,
    nearest_distance_squared:0.0,
    scaled_position:[0.0,0.0,0.0,0.0],
    scaled_velocity:[0.0,0.0,0.0,0.0],
    collided_mesh:0u32
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
pub unsafe extern "C" fn collision_not_found_pointer(collider_ptr:*const Collider) -> usize {
    (*collider_ptr).intersection_point.as_ptr() as usize + 16usize
}
#[no_mangle]
pub unsafe extern "C" fn nearest_distance_squared_pointer(collider_ptr:*const Collider) -> usize {
    (*collider_ptr).intersection_point.as_ptr() as usize + 20usize
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
pub unsafe extern "C" fn collided_mesh_pointer(collider_ptr:*const Collider) -> usize {
    (*collider_ptr).intersection_point.as_ptr() as usize + 56usize
}
impl Collider {
    pub fn new() -> Self {
        Collider {
            intersection_point:[0.0,0.0,0.0,0.0],
            collision_not_found:1u32,
            nearest_distance_squared:0.0,
            scaled_position:[0.0,0.0,0.0,0.0],
            scaled_velocity:[0.0,0.0,0.0,0.0],
            collided_mesh:0u32
        }
    }

}
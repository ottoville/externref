#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::v128;
use std::mem;

use terramath::Plane;

#[link(wasm_import_module = "console")]
#[cfg(target_arch = "wasm32")]
extern "C" {
    fn log(number: *const usize);
    pub fn log_u32(number: u32);
    fn warn(number: *const usize);
    fn error(number: *const usize);
}

static mut LOG_STRING: String = String::new();
static mut MULTIVALUE_USIZE: [usize; 6] = [0; 6];

unsafe fn str_ptr_from_arr<const N: usize>(strings: [&(impl ToString + ?Sized); N]) {
    LOG_STRING.clear();
    for str in strings.iter() {
        LOG_STRING.push(' ');
        LOG_STRING.push_str(&str.to_string());
    }
    MULTIVALUE_USIZE[0] = LOG_STRING.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = LOG_STRING.len();
    MULTIVALUE_USIZE[2] = LOG_STRING.capacity();
}

pub fn js_log<const N: usize>(strings: [&(impl ToString + ?Sized); N]) {
    unsafe {
        str_ptr_from_arr(strings);
        #[cfg(target_arch = "wasm32")]
        log(MULTIVALUE_USIZE.as_ptr());
    }
}
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
pub unsafe extern "C" fn check_point_in_triangle(
    point: v128,
    plane_collider: v128,
    v0: v128,
    v1: v128,
    v2: v128,
) -> bool {
    use std::arch::wasm32::{f32x4_mul, f32x4_sub, i8x16_shuffle};

    let temp_v2 = f32x4_sub(v1, point);
    let temp_v1 = f32x4_sub(v2, point);

    let temp_v1_shuffle =
        i8x16_shuffle::<8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 0, 0, 0, 0>(temp_v1, temp_v1);
    let temp_v2_shuffle =
        i8x16_shuffle::<8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 0, 0, 0, 0>(temp_v2, temp_v2);

    let mut shuffled_cross = f32x4_sub(
        f32x4_mul(temp_v2, temp_v1_shuffle),
        f32x4_mul(temp_v1, temp_v2_shuffle),
    );
    if v3_dot(
        i8x16_shuffle::<8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 0, 0, 0, 0>(
            shuffled_cross,
            shuffled_cross,
        ),
        plane_collider,
    ) < 0.0
    {
        return false;
    }
    let temp_v3 = f32x4_sub(v0, point);
    let temp_v3_shuffle =
        i8x16_shuffle::<8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 0, 0, 0, 0>(temp_v3, temp_v3);

    shuffled_cross = f32x4_sub(
        f32x4_mul(temp_v3, temp_v2_shuffle),
        f32x4_mul(temp_v2, temp_v3_shuffle),
    );
    if v3_dot(
        i8x16_shuffle::<8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 0, 0, 0, 0>(
            shuffled_cross,
            shuffled_cross,
        ),
        plane_collider,
    ) < 0.0
    {
        return false;
    }
    shuffled_cross = f32x4_sub(
        f32x4_mul(temp_v1, temp_v3_shuffle),
        f32x4_mul(temp_v3, temp_v1_shuffle),
    );
    return v3_dot(
        i8x16_shuffle::<8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 0, 0, 0, 0>(
            shuffled_cross,
            shuffled_cross,
        ),
        plane_collider,
    ) > 0.0;
}
//TODO finish this
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub unsafe extern "C" fn test_triangle(
    collider: *mut Collider,
    embedded_in_plane: bool,
    planePosition: i32,
    triangle0: v128,
    triangle1: v128,
    triangle2: v128,
    meshID: i32,
    t0: f32,
) -> bool {
    let found = false;
    (*collider).lowest_root = 1.0;
    if !embedded_in_plane {}
    return found;
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
) -> bool {
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
        if f < 0.0 || f > 1.0 {
            return false;
        }
        (*collider).lowest_root = cur_lowest_root;

        v128_store(
            (*collider).collision_point.as_mut_ptr() as *mut v128,
            f32x4_add(triangle2, f32x4_mul(edge, f32x4_splat(f))),
        );
        return true;
    };
    return false;
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
#[cfg(test)]
#[test]
#[wasm_bindgen_test::wasm_bindgen_test]
fn test_check_for_lowest_root() {
    use std::arch::wasm32::i32x4;
    use std::arch::wasm32::u32x4;
    use std::arch::wasm32::f32x4;

    let mut collider = Box::new(Collider::new());
    collider.lowest_root = 1.0;
    let collider_ptr = Box::into_raw(collider);
    unsafe {
        use mem;
        use std::arch::wasm32::f32x4;
        //let v1 = u32x4(0x439C4000, 0x426C2C2B, 0xC3C35000, 0x00000010);
        let v1 = f32x4(312.5, 59.043133, -390.625, 0.000000000000000000000000000000000000000000022);
        //let v2 = u32x4(0x439C4000, 0x428BBDBE, 0xC39C4000, 0x00000010);
        let v2 = f32x4(312.5, 69.87059, -312.5, 0.000000000000000000000000000000000000000000022);
        //let v3 = u32x4(0xC0821D40, 0xC05A36A0, 0x3D8DD000, 0x00000000);
        let v3 = f32x4(-4.0660706, -3.409584, 0.069244385, 0.0);
        let velocity_squared = 28.162988662719727;
        //let basepoint = u32x4(0x439CD56E, 0x4284E862, 0xC3ABAC5D, 0x00000000);
        let basepoint = f32x4(313.66742, 66.45387, -343.3466, 0.0);
        assert_eq!(
            check_for_lowest_root(collider_ptr, v1, v2, v3, velocity_squared, basepoint),
            true
        );
        assert_eq!(
            (*collider_ptr).collision_point,
            [
                312.5,
                65.55685424804688,
                -343.62554931640625,
                2.2420775429197073e-44
            ]
        );
    };
}

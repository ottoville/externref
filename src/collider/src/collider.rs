#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::v128;
use std::mem;

use terramath::{Plane, VectorMath, VectorMathF32};

pub struct Collider {
    pub basepoint_world: [f32; 3],
    intersection_point: [f32; 4],
    pub collision_resolved: bool,
    pub nearest_distance_squared: f32,
    scaled_position: [f32; 4],
    scaled_velocity: [f32; 4],
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
pub unsafe extern "C" fn initialize_collider(
    collider_ptr: *mut Collider,
    world_position_x: f32,
    world_position_y: f32,
    world_position_z: f32,
    world_velocity_x: f32,
    world_velocity_y: f32,
    world_velocity_z: f32,
    radius_x: f32,
    radius_y: f32,
    radius_z: f32,
) {
    (*collider_ptr)._initialize(
        world_position_x,
        world_position_y,
        world_position_z,
        world_velocity_x,
        world_velocity_y,
        world_velocity_z,
        radius_x,
        radius_y,
        radius_z,
    );
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
pub unsafe extern "C" fn set_collision_resolved(collider_ptr: *mut Collider, val: bool) {
    (*collider_ptr).collision_resolved = val
}
#[no_mangle]
pub unsafe extern "C" fn get_collision_resolved(collider_ptr: *const Collider) -> bool {
    (*collider_ptr).collision_resolved
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

#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn v3_dot(a: v128, b: v128) -> f32 {
    use std::arch::wasm32::{f32x4_extract_lane, f32x4_mul};
    let temp1 = f32x4_mul(a, b);
    f32x4_extract_lane::<0>(temp1) + f32x4_extract_lane::<1>(temp1) + f32x4_extract_lane::<2>(temp1)
}
#[cfg(target_arch = "wasm32")]
pub fn check_point_in_triangle(
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
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub unsafe extern "C" fn check_for_lowest_root0(
    collider: *mut Collider,
    triangle: v128,
    velocity_squared: f32,
) -> f32 {
    use std::arch::wasm32::{f32x4_sub, v128_load};
    let base_point = v128_load((*collider).scaled_position.as_ptr() as *const v128);
    let velocity = v128_load((*collider).scaled_velocity.as_ptr() as *const v128);
    let temp_v = f32x4_sub(triangle, base_point);
    get_lowest_root(
        velocity_squared,
        2.0 * v3_dot(velocity, temp_v),
        v3_dot(temp_v, temp_v) - 1.0,
        (*collider).lowest_root,
    )
}
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub unsafe extern "C" fn test_triangle(
    collider: *mut Collider,
    embedded_in_plane: bool,
    plane_position: *const Plane,
    triangle0: v128,
    triangle1: v128,
    triangle2: v128,
    t0: f32,
    velocity: v128,
    velocity_squared: f32,
) {
    (*collider).test_triangle(
        embedded_in_plane,
        plane_position,
        triangle0,
        triangle1,
        triangle2,
        t0,
        velocity,
        velocity_squared,
    );
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

#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub unsafe extern "C" fn test_triangles(
    collider_ptr: *mut Collider,
    plane_position: i32,
    plane_position_horizontal: usize,
    length: i32,
    normalized_velocity_x: v128,
    normalized_velocity_y: v128,
    normalized_velocity_z: v128,
    base_point_x: v128,
    base_point_y: v128,
    base_point_z: v128,
    velocity_x: v128,
    velocity_y: v128,
    velocity_z: v128,
    velocity_squared: f32,
) {
    (*collider_ptr).test_triangles(
        plane_position,
        plane_position_horizontal,
        length,
        normalized_velocity_x,
        normalized_velocity_y,
        normalized_velocity_z,
        base_point_x,
        base_point_y,
        base_point_z,
        velocity_x,
        velocity_y,
        velocity_z,
        velocity_squared,
    );
}

impl Collider {
    pub fn new() -> Self {
        unsafe {
            Collider {
                basepoint_world: [0.0; 3],
                intersection_point: [0.0, 0.0, 0.0, 0.0],
                collision_resolved: true,
                nearest_distance_squared: 9999999.0,
                scaled_position: [0.0, 0.0, 0.0, 0.0],
                scaled_velocity: [0.0, 0.0, 0.0, 0.0],
                speed: 0.0,
                collided_point_in_triangle: *(0 as *const &'static Plane),
                lowest_root: 0.0,
                collision_point: [0.0; 4],
            }
        }
    }
    pub fn _initialize(
        &mut self,
        world_position_x: f32,
        world_position_y: f32,
        world_position_z: f32,
        world_velocity_x: f32,
        world_velocity_y: f32,
        world_velocity_z: f32,
        radius_x: f32,
        radius_y: f32,
        radius_z: f32,
    ) {
        self.collision_resolved = true;
        let velocity_world = [world_velocity_x, world_velocity_y, world_velocity_z]
            .multiply_vec(&[radius_x, radius_y, radius_z]);
        self.speed = velocity_world.length();
        unsafe {
            self.collided_point_in_triangle = *(0 as *const &'static Plane);
        }
        self.basepoint_world = [world_position_x, world_position_y, world_position_z];
    }
    //TODO finish this
    #[cfg(target_arch = "wasm32")]
    pub fn test_triangles(
        &mut self,
        mut plane_position: i32,
        // TODO: refer to geometry.collider_planes_parallel
        mut plane_position_horizontal: usize,
        length: i32,
        normalized_velocity_x: v128,
        normalized_velocity_y: v128,
        normalized_velocity_z: v128,
        base_point_x: v128,
        base_point_y: v128,
        base_point_z: v128,
        velocity_x: v128,
        velocity_y: v128,
        velocity_z: v128,
        velocity_squared: f32,
    ) {
        use std::arch::wasm32::{
            f32x4, f32x4_abs, f32x4_add, f32x4_div, f32x4_extract_lane, f32x4_ge, f32x4_gt,
            f32x4_lt, f32x4_max, f32x4_min, f32x4_sub, i32x4_all_true, i32x4_extract_lane,
            v128_any_true, v128_bitselect, v128_load, v128_or,
        };
        use terramath::simd_dot;
        if length == 0 {
            return;
        }
        let scaled_velocity = unsafe { v128_load(self.scaled_velocity.as_ptr() as *const v128) };
        let end = plane_position + length;
        plane_position_horizontal -= 64;
        loop {
            plane_position_horizontal += 64;
            unsafe {
                let plane_x = v128_load(plane_position_horizontal as *const v128);
                let plane_y = v128_load((plane_position_horizontal + 16) as *const v128);
                let plane_z = v128_load((plane_position_horizontal + 32) as *const v128);
                let dot_over_zero = f32x4_gt(
                    simd_dot(
                        plane_x,
                        normalized_velocity_x,
                        plane_y,
                        normalized_velocity_y,
                        plane_z,
                        normalized_velocity_z,
                    ),
                    f32x4(0.0, 0.0, 0.0, 0.0),
                );
                if !i32x4_all_true(dot_over_zero) {
                    let signed_dist_to_triangle_plane = f32x4_add(
                        v128_load((plane_position_horizontal + 48) as *const v128),
                        simd_dot(
                            base_point_x,
                            plane_x,
                            base_point_y,
                            plane_y,
                            base_point_z,
                            plane_z,
                        ),
                    );

                    // Calculate dot angle between velocity and normal
                    let normal_dot_velocity = simd_dot(
                        plane_x, velocity_x, plane_y, velocity_y, plane_z, velocity_z,
                    );

                    let mut t0 = f32x4(0.0, 0.0, 0.0, 0.0);
                    let mut returnvalue = f32x4(0.0, 0.0, 0.0, 0.0);
                    //Todo: use constant for 0.0009 vec
                    let embedded_in_plane = f32x4_lt(
                        f32x4_abs(normal_dot_velocity),
                        f32x4(0.0009, 0.0009, 0.0009, 0.0009),
                    );
                    if !i32x4_all_true(embedded_in_plane) {
                        //Some is not embedded in plane
                        //var t0 = (-1.0 - signedDistToTrianglePlane) / normalDotVelocity
                        t0 = f32x4_div(
                            f32x4_sub(f32x4(-1.0, -1.0, -1.0, -1.0), signed_dist_to_triangle_plane),
                            normal_dot_velocity,
                        );

                        //var t1 = (1.0 - signedDistToTrianglePlane) / normalDotVelocity;
                        let mut t1 = f32x4_div(
                            f32x4_sub(f32x4(1.0, 1.0, 1.0, 1.0), signed_dist_to_triangle_plane),
                            normal_dot_velocity,
                        );
                        let max = f32x4_max(t0, t1);
                        let min = f32x4_min(t0, t1);
                        t0 = min;
                        t1 = max;

                        returnvalue = v128_or(
                            f32x4_gt(t0, f32x4(1.0, 1.0, 1.0, 1.0)),
                            f32x4_lt(t1, f32x4(0.0, 0.0, 0.0, 0.0)),
                        );

                        t0 = f32x4_max(t0, f32x4(0.0, 0.0, 0.0, 0.0));
                    }
                    // Check if movement is not at 90 degree angle with plane
                    if v128_any_true(embedded_in_plane) {
                        //Set t0 to zero when embedded in plane
                        t0 = v128_bitselect(f32x4(0.0, 0.0, 0.0, 0.0), t0, embedded_in_plane);
                        returnvalue = v128_bitselect(
                            f32x4_ge(
                                f32x4_abs(signed_dist_to_triangle_plane),
                                f32x4(1.0, 1.0, 1.0, 1.0),
                            ),
                            returnvalue,
                            embedded_in_plane,
                        );
                    }
                    returnvalue = v128_or(dot_over_zero, returnvalue);
                    //  plane_position.to_string().log();
                    if i32x4_extract_lane::<0>(returnvalue) == 0 {
                        self.test_triangle(
                            i32x4_extract_lane::<0>(embedded_in_plane) == 1,
                            plane_position as *const Plane,
                            v128_load(*((plane_position + 16) as *const &v128)),
                            v128_load(*((plane_position + 20) as *const &v128)),
                            v128_load(*((plane_position + 24) as *const &v128)),
                            f32x4_extract_lane::<0>(t0),
                            scaled_velocity,
                            velocity_squared,
                        );
                    }
                    if i32x4_extract_lane::<1>(returnvalue) == 0 {
                        self.test_triangle(
                            i32x4_extract_lane::<1>(embedded_in_plane) == 1,
                            (plane_position + 28) as *const Plane,
                            v128_load(*((plane_position + 44) as *const &v128)),
                            v128_load(*((plane_position + 48) as *const &v128)),
                            v128_load(*((plane_position + 52) as *const &v128)),
                            f32x4_extract_lane::<1>(t0),
                            scaled_velocity,
                            velocity_squared,
                        );
                    }

                    if i32x4_extract_lane::<2>(returnvalue) == 0 {
                        self.test_triangle(
                            i32x4_extract_lane::<2>(embedded_in_plane) == 1,
                            (plane_position + 56) as *const Plane,
                            v128_load(*((plane_position + 72) as *const &v128)),
                            v128_load(*((plane_position + 76) as *const &v128)),
                            v128_load(*((plane_position + 80) as *const &v128)),
                            f32x4_extract_lane::<2>(t0),
                            scaled_velocity,
                            velocity_squared,
                        );
                    }
                    if i32x4_extract_lane::<3>(returnvalue) == 0 {
                        self.test_triangle(
                            i32x4_extract_lane::<3>(embedded_in_plane) == 1,
                            (plane_position + 84) as *const Plane,
                            v128_load(*((plane_position + 100) as *const &v128)),
                            v128_load(*((plane_position + 104) as *const &v128)),
                            v128_load(*((plane_position + 108) as *const &v128)),
                            f32x4_extract_lane::<3>(t0),
                            scaled_velocity,
                            velocity_squared,
                        );
                    }
                }
                plane_position += 112;
                if plane_position >= end {
                    break;
                }
            }
        }
    }
    #[cfg(target_arch = "wasm32")]
    pub fn test_triangle(
        &mut self,
        embedded_in_plane: bool,
        plane_position: *const Plane,
        triangle0: v128,
        triangle1: v128,
        triangle2: v128,
        t0: f32,
        velocity: v128,
        velocity_squared: f32,
    ) {
        use std::arch::wasm32::{
            f32x4_add, f32x4_mul, f32x4_splat, f32x4_sub, v128_load, v128_store,
        };
        let mut found = false;
        self.lowest_root = 1.0;
        let base_point = unsafe { v128_load(self.scaled_position.as_ptr() as *const v128) };
        let mut collided_point_in_triangle = false;
        if !embedded_in_plane {
            let plane_collider = unsafe { v128_load(plane_position as *const v128) };
            //planeIntersectionPoint = this.#basePoint - triangle.planeCollider + this.#velocity * t0

            let plane_intersection_point = f32x4_add(
                f32x4_sub(base_point, plane_collider),
                f32x4_mul(velocity, f32x4_splat(t0.max(0.0))),
            );
            collided_point_in_triangle = check_point_in_triangle(
                plane_intersection_point,
                plane_collider,
                triangle0,
                triangle1,
                triangle2,
            );
            if collided_point_in_triangle {
                self.lowest_root = t0;
                unsafe {
                    v128_store(
                        self.collision_point.as_mut_ptr() as *mut v128,
                        plane_intersection_point,
                    );
                }
                found = true;
            }
        }
        if !found {
            unsafe {
                let mut cur_lowest_root = check_for_lowest_root0(self, triangle0, velocity_squared);
                if cur_lowest_root > 0.0 {
                    self.lowest_root = cur_lowest_root;
                    v128_store(self.collision_point.as_mut_ptr() as *mut v128, triangle0);
                    found = true
                }
                cur_lowest_root = check_for_lowest_root0(self, triangle1, velocity_squared);
                if cur_lowest_root > 0.0 {
                    self.lowest_root = cur_lowest_root;
                    v128_store(self.collision_point.as_mut_ptr() as *mut v128, triangle1);
                    found = true
                }
                cur_lowest_root = check_for_lowest_root0(self, triangle2, velocity_squared);
                if cur_lowest_root > 0.0 {
                    self.lowest_root = cur_lowest_root;
                    v128_store(self.collision_point.as_mut_ptr() as *mut v128, triangle2);
                    found = true
                }
            }
            if self.check_for_lowest_root(
                triangle0,
                triangle1,
                velocity,
                velocity_squared,
                base_point,
            ) {
                found = true;
            }
            if self.check_for_lowest_root(
                triangle2,
                triangle0,
                velocity,
                velocity_squared,
                base_point,
            ) {
                found = true;
            }
        }
        if found {
            self.collision_found(
                self.lowest_root,
                velocity_squared,
                collided_point_in_triangle,
                plane_position,
            );
        }
    }
    #[cfg(target_arch = "wasm32")]
    pub fn check_for_lowest_root(
        &mut self,
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
            self.lowest_root,
        );
        if cur_lowest_root > 0.0 {
            let f = (edge_dot_velocity * self.lowest_root - edge_dot_base_to_vertex)
                / edge_squared_length;
            if f < 0.0 || f > 1.0 {
                return false;
            }
            self.lowest_root = cur_lowest_root;
            unsafe {
                v128_store(
                    self.collision_point.as_mut_ptr() as *mut v128,
                    f32x4_add(triangle2, f32x4_mul(edge, f32x4_splat(f))),
                );
            }
            return true;
        };
        return false;
    }
    fn collision_found(
        &mut self,
        t: f32,
        velocity_squared_length: f32,
        collided_point_in_triangle: bool,
        collided_plane: *const Plane,
    ) {
        let dist_to_collision_squared = t * t * velocity_squared_length;
        if self.collision_resolved || dist_to_collision_squared < self.nearest_distance_squared {
            self.intersection_point[0] = self.collision_point[0];
            self.intersection_point[1] = self.collision_point[1];
            self.intersection_point[2] = self.collision_point[2];
            self.nearest_distance_squared = dist_to_collision_squared;
            self.collision_resolved = false;
            unsafe {
                if collided_point_in_triangle {
                    self.collided_point_in_triangle = &*(collided_plane);
                } else {
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
    use std::arch::wasm32::f32x4;
    use std::arch::wasm32::i32x4;
    use std::arch::wasm32::u32x4;

    let mut collider = Box::new(Collider::new());
    collider.lowest_root = 1.0;
    let collider_ptr = Box::into_raw(collider);
    unsafe {
        use mem;
        use std::arch::wasm32::f32x4;
        //let v1 = u32x4(0x439C4000, 0x426C2C2B, 0xC3C35000, 0x00000010);
        let v1 = f32x4(
            312.5,
            59.043133,
            -390.625,
            0.000000000000000000000000000000000000000000022,
        );
        //let v2 = u32x4(0x439C4000, 0x428BBDBE, 0xC39C4000, 0x00000010);
        let v2 = f32x4(
            312.5,
            69.87059,
            -312.5,
            0.000000000000000000000000000000000000000000022,
        );
        //let v3 = u32x4(0xC0821D40, 0xC05A36A0, 0x3D8DD000, 0x00000000);
        let v3 = f32x4(-4.0660706, -3.409584, 0.069244385, 0.0);
        let velocity_squared = 28.162988662719727;
        //let basepoint = u32x4(0x439CD56E, 0x4284E862, 0xC3ABAC5D, 0x00000000);
        let basepoint = f32x4(313.66742, 66.45387, -343.3466, 0.0);
        assert_eq!(
            (*collider_ptr).check_for_lowest_root(v1, v2, v3, velocity_squared, basepoint),
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

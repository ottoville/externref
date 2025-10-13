use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;

use crate::mesh::{Mesh, ENGINE};

use super::{
    camera::{Camera, VIEW_UPDATED_DIRECTION, VIEW_UPDATED_POSITION},
    cameracontroller::CameraController,
    position_camera::{ARROW_KEYS_DOWN, ARROW_KEYS_LEFT, ARROW_KEYS_RIGHT, ARROW_KEYS_UP},
};

#[no_mangle]
pub unsafe extern "C" fn new_mesh_camera(
    mesh_id: *mut ExplicitGenerationalFreeListIndex<fn() -> Mesh>,
) -> *mut MeshCamera {
    Box::into_raw(Box::new(MeshCamera {
        arrow_keys_down: 0,
        pointer_movement_x: 0,
        pointer_movement_y: 0,
        angle: std::f32::consts::PI,
        v_angle: std::f32::consts::FRAC_PI_2,
        mesh_id: (*mesh_id).clone(),
    }))
}
#[no_mangle]
pub unsafe extern "C" fn attach_meshcamera_camera_controller(
    camera: *mut &mut Camera,
    controller: *mut MeshCamera,
) {
    (*camera).controller = Some(Box::from_raw(controller));
}
#[no_mangle]
pub unsafe extern "C" fn keyfunctionmeshcamera(
    controller: *mut MeshCamera,
    up: bool,
    key_ptr: *mut u8,
    key_len: usize,
    key_cap: usize,
) {
    if up {
        (*controller).keyupfunction(String::from_raw_parts(key_ptr, key_len, key_cap));
    } else {
        (*controller).keydownfunction(String::from_raw_parts(key_ptr, key_len, key_cap));
    }
}
#[no_mangle]
pub unsafe extern "C" fn pointer_move_function(
    controller: *mut MeshCamera,
    movement_x: i32,
    movement_y: i32,
) {
    (*controller).pointer_movement_x = movement_x;
    (*controller).pointer_movement_y = movement_y;
}
#[no_mangle]
pub unsafe extern "C" fn get_arrow_keys_down(controller: *mut MeshCamera) -> u32 {
    return (*controller).arrow_keys_down;
}
pub struct MeshCamera {
    arrow_keys_down: u32,
    pointer_movement_x: i32,
    pointer_movement_y: i32,
    angle: f32,
    v_angle: f32,
    mesh_id: ExplicitGenerationalFreeListIndex<fn() -> Mesh>,
}
impl MeshCamera {
    fn keydownfunction(&mut self, key: String) {
        if key == "ArrowUp" {
            self.arrow_keys_down |= ARROW_KEYS_UP;
        } else if key == "ArrowDown" {
            self.arrow_keys_down |= ARROW_KEYS_DOWN;
        }
        if key == "ArrowLeft" {
            self.arrow_keys_down |= ARROW_KEYS_LEFT;
        } else if key == "ArrowRight" {
            self.arrow_keys_down |= ARROW_KEYS_RIGHT;
        }
    }
    fn keyupfunction(&mut self, key: String) {
        if key == "ArrowUp" {
            self.arrow_keys_down &= !ARROW_KEYS_UP;
        } else if key == "ArrowDown" {
            self.arrow_keys_down &= !ARROW_KEYS_DOWN;
        }
        if key == "ArrowLeft" {
            self.arrow_keys_down &= !ARROW_KEYS_LEFT;
        } else if key == "ArrowRight" {
            self.arrow_keys_down &= !ARROW_KEYS_RIGHT;
        }
    }
}
impl CameraController for MeshCamera {
    fn check_inputs(
        &mut self,
        _force_recalculate: bool,
        position: &mut [f32; 4],
        direction: &mut [f32; 4],
        _view: &[[f32; 4]; 4],
    ) -> u32 {
        let mut updated = 0;
        let meshes = ENGINE.meshes.lock().unwrap();
        let mesh = meshes.get(&self.mesh_id).unwrap();
        let mesh_property = mesh.mesh_property.lock().unwrap();
        let translation = mesh_property.translation.0;
        if position[0] != translation[0]
            || position[1] != translation[1]
            || position[2] != translation[2]
        {
            updated |= VIEW_UPDATED_POSITION;
            position[0] = translation[0];
            position[1] = translation[1];
            position[2] = translation[2];
        }
        let dir = [0.0, 0.0, 1.0];
        let mut res = [0.0; 3];
        mesh_property.rotation.apply_to_ref(dir, &mut res);

        if direction[0] != res[0] || direction[1] != res[1] || direction[2] != res[2] {
            updated |= VIEW_UPDATED_DIRECTION;
            direction[0] = res[0];
            direction[1] = res[1];
            direction[2] = res[2];
        }
        return updated;
    }
}

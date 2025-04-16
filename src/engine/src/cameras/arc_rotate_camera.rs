use std::f32;

use collider::{Collider, ColliderSphere, CLOSE_DISTANCE};
use terramath::{VectorMath, VectorMathF32};

use crate::{
    cameras::camera::{VIEW_UPDATED_DIRECTION, VIEW_UPDATED_POSITION},
    mesh::ENGINE,
};

use super::cameracontroller::CameraController;

struct CameraMovement {
    kinematic: bool,
    target_moving_from: [f32; 3],
    target_moving_to: [f32; 3],
    target_lerp_position: f32,
}
impl CameraMovement {
    fn move_to_place(&mut self, target: &mut [f32; 3]) -> bool {
        self.target_moving_from.lerp_to_ref(
            &self.target_moving_to,
            self.target_lerp_position,
            target,
        );
        self.target_lerp_position += 0.01;
        return self.target_lerp_position > 1.0;
    }
}
#[no_mangle]
pub unsafe extern "C" fn new_arc_rotate_camera() -> *mut ArcRotateCamera {
    Box::into_raw(Box::new(ArcRotateCamera::new()))
}

pub struct ArcRotateCamera {
    alpha: f32,
    beta: f32,
    radius: f32,

    ///  Current inertia value on the longitudinal axis.
    ///  The bigger this number the longer it will take for the camera to stop.
    inertial_alpha_offset: f32,

    /// Current inertia value on the latitudinal axis.
    /// The bigger this number the longer it will take for the camera to stop.
    inertial_beta_offset: f32,
    /// Current inertia value on the radius axis.
    /// The bigger this number the longer it will take for the camera to stop.
    inertial_radius_offset: f32,
    inertia: f32,
    inertial_panning: [f32; 3],
    target: [f32; 3],
    transformed_direction: [f32; 3],
    movement: Option<CameraMovement>,
    collider_sphere: ColliderSphere,
}

impl CameraController for ArcRotateCamera {
    fn check_inputs(
        &mut self,
        force_recalculate: bool,
        position: &mut [f32; 4],
        direction: &mut [f32; 3],
    ) -> u32 {
        return 0;
        /*if let Some(movement) = &mut self.movement {
            if movement.kinematic {
                if movement.move_to_place(&mut self.target) {
                    self.movement = None;
                }
                if self.calculate_camera_position_and_target(position) {
                    return VIEW_UPDATED_POSITION | VIEW_UPDATED_DIRECTION;
                }
                return 0;
            }
        }
        todo!()*/
    }
}
impl ArcRotateCamera {
    pub fn new() -> Self {
        let collision_radius = 2.0;
        ArcRotateCamera {
            alpha: 0.0,
            beta: 0.0,
            radius: 10.0,
            inertial_alpha_offset: 0.0,
            inertial_beta_offset: 0.0,
            inertial_radius_offset: 0.0,
            inertia: 0.9,
            inertial_panning: [0.0; 3],
            target: [100.0, 0.0, 1000.0],
            transformed_direction: [0.0; 3],
            movement: None,
            collider_sphere: ColliderSphere {
                collision_radius,
                collisions_scaling_matrix: [
                    [1.0 / collision_radius, 0.0, 0.0, 0.0],
                    [0.0, 1.0 / collision_radius, 0.0, 0.0],
                    [0.0, 0.0, 1.0 / collision_radius, 0.0],
                    [0.0, 0.0, 0.0, 1.0],
                ],
                close_distance_vector: CLOSE_DISTANCE / collision_radius,
            },
        }
    }
    fn rebuild_angles_and_radius(&mut self, current_position: &[f32; 3]) {
        let direction = current_position.sub_vec(&self.target);
        let length = direction.length();
        if length > 0.0 {
            self.radius = length;
        } else {
            self.radius = 0.0001; // Just to avoid division by zero
        }
        // Alpha

        self.alpha = if direction[0] == 0.0 && direction[2] == 0.0 {
            f32::consts::PI / 2.0 // avoid division by zero when looking along up axis, and set to acos(0)
        } else {
            (direction[0] / (direction[0].powf(2.0) + direction[2].powf(2.0)).sqrt()).acos()
        };
        if direction[2] < 0.0 {
            self.alpha = f32::consts::TAU - self.alpha;
        }
        self.beta = (direction[1] / self.radius).acos();
        self.check_limits();
    }
    fn check_limits(&self) {
        todo!()
    }

    fn calculate_camera_position_and_target(&mut self, current_position: &mut [f32; 4]) -> bool {
        let mut new_position = [0.0; 4];
        self.calculate_position(&mut new_position);
        let mut engine = ENGINE.engine2.lock().unwrap();
        if let Some(position_after_collide) =
            engine.check_collisions(&self.collider_sphere, new_position, current_position)
        {
            current_position[0] = position_after_collide[0];
            current_position[1] = position_after_collide[1];
            current_position[2] = position_after_collide[2];
            return true;
        }
        return false;
    }
    fn calculate_position(&mut self, result: &mut [f32; 4]) {
        let mut sinb = self.beta.sin();
        if sinb == 0.0 {
            sinb = 0.0001;
        }
        //this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);
        result[0] = self.target[0] + self.radius * self.alpha.cos() * sinb;
        result[1] = self.target[1] + self.radius * self.beta.cos();
        result[2] = self.target[2] + self.radius * self.alpha.sin() * sinb;
    }
}

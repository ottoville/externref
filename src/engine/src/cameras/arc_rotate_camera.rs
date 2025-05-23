use collider::{ColliderSphere, CLOSE_DISTANCE};
use terramath::{MatrixMath, VectorMath, VectorMathF32};

use crate::{
    cameras::camera::{VIEW_UPDATED_DIRECTION, VIEW_UPDATED_POSITION},
    mesh::ENGINE,
};

use super::{camera::Camera, cameracontroller::CameraController};
const EPSILON: f32 = 0.001;
const PANNING_SENSIBILITY: f32 = 20.0;
const ANGULAR_SENSIBILITY_X: f32 = 3000.0;
const ANGULAR_SENSIBILITY_Y: f32 = 3000.0;

struct CameraMovement {
    kinematic: bool,
    target_moving_from: [f32; 4],
    target_moving_to: [f32; 4],
    target_lerp_position: f32,
}
impl CameraMovement {
    fn move_to_place(&mut self, target: &mut [f32; 4]) -> bool {
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
pub unsafe extern "C" fn new_arc_rotate_camera(initial: bool, camera_id: usize) -> *mut ArcRotateCamera {
    Box::into_raw(Box::new(ArcRotateCamera::new(initial, camera_id)))
}
#[no_mangle]
pub unsafe extern "C" fn camera_move(
    arc_rotate_camera: *mut ArcRotateCamera,
    pointer_down_button: u32,
    movement_x: i32,
    movement_y: i32,
) {
    (*arc_rotate_camera).camera_move(pointer_down_button, movement_x, movement_y);
}
#[no_mangle]
pub unsafe extern "C" fn camera_wheel(
    arc_rotate_camera: *mut ArcRotateCamera,
    delta_y: f32,
    ctrl_key: bool,
) {
    (*arc_rotate_camera).camera_wheel(delta_y, ctrl_key);
}
#[no_mangle]
pub unsafe extern "C" fn get_alpha(arc_rotate_camera: *mut ArcRotateCamera) -> f32 {
    (*arc_rotate_camera).alpha
}
#[no_mangle]
pub unsafe extern "C" fn get_beta(arc_rotate_camera: *mut ArcRotateCamera) -> f32 {
    (*arc_rotate_camera).beta
}
#[no_mangle]
pub unsafe extern "C" fn get_radius(arc_rotate_camera: *mut ArcRotateCamera) -> f32 {
    (*arc_rotate_camera).radius
}
#[no_mangle]
pub unsafe extern "C" fn get_target_ptr(
    arc_rotate_camera: *mut ArcRotateCamera,
) -> *const [f32; 4] {
    &(*arc_rotate_camera).target
}
#[no_mangle]
pub unsafe extern "C" fn attach_archrotate_camera_controller(
    camera: *mut &mut Camera,
    controller: *mut ArcRotateCamera,
) {
    (*camera).controller = Some(Box::from_raw(controller));
}
#[no_mangle]
pub unsafe extern "C" fn set_movement(
    arc_rotate_camera: *mut ArcRotateCamera,
    kinematic: bool,
    target_moving_to_x: f32,
    target_moving_to_y: f32,
    target_moving_to_z: f32,
) {
    (*arc_rotate_camera).movement = Some(CameraMovement {
        kinematic,
        target_moving_from: (*arc_rotate_camera).target,
        target_moving_to: [
            target_moving_to_x,
            target_moving_to_y,
            target_moving_to_z,
            0.0,
        ],
        target_lerp_position: 0.0,
    })
}
#[no_mangle]
pub unsafe extern "C" fn restore_arc_rotate_camera(
    arc_rotate_camera: *mut ArcRotateCamera,
    alpha: f32,
    beta: f32,
    radius: f32,
    target_x: f32,
    target_y: f32,
    target_z: f32,
    position_x: f32,
    position_y: f32,
    position_z: f32,
    camera_id: usize,
) {
    (*arc_rotate_camera).restore(
        alpha, beta, radius, target_x, target_y, target_z, position_x, position_y, position_z,
        camera_id,
    );
}
pub struct ArcRotateCamera {
    alpha: f32,
    beta: f32,
    radius: f32,

    // Minimum allowed angle on the latitudinal axis.
    // This can help limiting how the Camera is able to move in the scene.
    lower_beta_limit: f32,

    // Maximum allowed angle on the latitudinal axis.
    // This can help limiting how the Camera is able to move in the scene.
    upper_beta_limit: f32,

    // Minimum allowed angle on the longitudinal axis.
    // This can help limiting how the Camera is able to move in the scene.
    lower_alpha_limit: f32,
    // Maximum allowed angle on the longitudinal axis.
    // This can help limiting how the Camera is able to move in the scene.
    upper_alpha_limit: f32,
    //Minimum allowed distance of the camera to the target(The camera can not get closer).
    // This can help limiting how the Camera is able to move in the scene.
    lower_radius_limit: f32,
    /// Maximum allowed distance of the camera to the target (The camera can not get further).
    /// This can help limiting how the Camera is able to move in the scene.
    upper_radius_limit: f32,
    /// Minimum allowed vertical target position of the camera.
    /// Use this setting in combination with `upperRadiusLimit` to set a global limit for the Cameras vertical position.
    lower_target_ylimit: f32,

    ///  Current inertia value on the longitudinal axis.
    ///  The bigger this number the longer it will take for the camera to stop.
    inertial_alpha_offset: f32,

    /// Current inertia value on the latitudinal axis.
    /// The bigger this number the longer it will take for the camera to stop.
    inertial_beta_offset: f32,
    /// Current inertia value on the radius axis.
    /// The bigger this number the longer it will take for the camera to stop.
    inertial_radius_offset: f32,
    camera_transform_matrix: [[f32; 4]; 4],
    /// Defines the value of the inertia used during panning.
    /// 0 would mean stop inertia and one would mean no decelleration at all.
    panning_inertia: f32,
    inertia: f32,
    speed: f32,
    inertial_panning: [f32; 3],
    target: [f32; 4],
    transformed_direction: [f32; 3],
    movement: Option<CameraMovement>,
    collider_sphere: ColliderSphere,
}

impl CameraController for ArcRotateCamera {
    fn check_inputs(
        &mut self,
        force_recalculate: bool,
        position: &mut [f32; 4],
        direction: &mut [f32; 4],
        view: &[[f32; 4]; 4],
    ) -> u32 {
        if let Some(movement) = &mut self.movement {
            if movement.kinematic {
                //Todo: use delta as t increase
                if movement.move_to_place(&mut self.target) {
                    self.movement = None;
                }
                self.calculate_camera_position_and_target(position, direction);
                return VIEW_UPDATED_POSITION | VIEW_UPDATED_DIRECTION;
            }
        }
        let mut update_view = force_recalculate;
        // Inertia
        if self.inertial_alpha_offset != 0.0
            || self.inertial_beta_offset != 0.0
            || self.inertial_radius_offset != 0.0
        {
            if let Some(movement) = &mut self.movement {
                if movement.move_to_place(&mut self.target) {
                    self.movement = None;
                }
            }
            let mut inertial_alpha_offset = self.inertial_alpha_offset;
            if self.beta <= 0.0 {
                inertial_alpha_offset *= -1.0;
            }
            self.alpha += inertial_alpha_offset;

            self.beta += self.inertial_beta_offset;
            self.radius -= self.inertial_radius_offset;
            self.inertial_alpha_offset *= self.inertia;
            self.inertial_beta_offset *= self.inertia;
            self.inertial_radius_offset *= self.inertia;
            if self.inertial_alpha_offset.abs() < EPSILON {
                self.inertial_alpha_offset = 0.0;
            }
            if self.inertial_beta_offset.abs() < EPSILON {
                self.inertial_beta_offset = 0.0;
            }
            if self.inertial_radius_offset.abs() < self.speed * EPSILON {
                self.inertial_radius_offset = 0.0;
            }
            update_view = true;
        }
        // Panning inertia
        if self.inertial_panning[0] != 0.0 || self.inertial_panning[2] != 0.0 {
            self.movement = None;
            view.invert_to_ref(&mut self.camera_transform_matrix);
            self.transformed_direction = [
                self.camera_transform_matrix[0][0],
                self.camera_transform_matrix[0][1],
                self.camera_transform_matrix[0][2],
            ];

            let scale_x = self.inertial_panning[0];
            let scale_z = self.inertial_panning[2];
            // panning on X Axis
            self.transformed_direction.multiply_in_place(scale_x);
            // panning on Y axis
            // this.#transformedDirection[1] += panningAxis[1] * this.#inertialPanningY;

            // panning on Z axis
            self.transformed_direction[0] -= self.alpha.cos() * scale_z;
            self.transformed_direction[2] -= self.alpha.sin() * scale_z;
            //this._target.addInPlace(this._transformedDirection);
            self.target[0] += self.transformed_direction[0];
            self.target[1] += self.transformed_direction[1];
            self.target[2] += self.transformed_direction[2];
            //Camera direction
            //for LHW this is target - position
            self.calculate_direction(position, direction);

            update_view = true;
            self.inertial_panning[0] *= self.panning_inertia;
            self.inertial_panning[2] *= self.panning_inertia;

            if self.inertial_panning[0].abs() < self.speed * EPSILON {
                self.inertial_panning[0] = 0.0;
            }
            if self.inertial_panning[2].abs() < self.speed * EPSILON {
                self.inertial_panning[2] = 0.0;
            }
        }
        self.check_limits();
        if update_view {
            self.calculate_camera_position_and_target(position, direction);
        }
        if update_view {
            return VIEW_UPDATED_POSITION | VIEW_UPDATED_DIRECTION;
        }
        return 0;
    }
}
impl ArcRotateCamera {
    pub fn new(initial: bool, camera_id: usize) -> Self {
        let collision_radius = 2.0;
        let mut controller = ArcRotateCamera {
            alpha: 0.0,
            beta: 0.0,
            radius: 10.0,
            inertial_alpha_offset: 0.0,
            inertial_beta_offset: 0.0,
            inertial_radius_offset: 0.0,
            camera_transform_matrix: [[0.0; 4]; 4],
            panning_inertia: 0.9,
            inertia: 0.9,
            speed: 2.0,
            inertial_panning: [0.0; 3],
            target: [100.0, 0.0, 1000.0, 0.0],
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
            lower_beta_limit: 0.01,
            upper_beta_limit: std::f32::consts::PI - 0.01,
            lower_alpha_limit: f32::NEG_INFINITY,
            upper_alpha_limit: f32::INFINITY,
            lower_radius_limit: f32::NEG_INFINITY,
            upper_radius_limit: f32::INFINITY,
            lower_target_ylimit: f32::NEG_INFINITY,
        };
        if !initial {
            let gpuopt = ENGINE.gpu.lock().unwrap();
            let gpu = gpuopt.as_ref().unwrap();
            let camera = gpu.get_camera_by_id(camera_id);
            controller.target = camera.position.sub_vec(&camera.direction.multiply(100.0));
            controller.rebuild_angles_and_radius(&camera.position);
        }
        return controller;
    }
    fn camera_move(&mut self, pointer_down_button: u32, movement_x: i32, movement_y: i32) {
        if pointer_down_button == 2 {
            self.inertial_panning[0] += -movement_x as f32 / PANNING_SENSIBILITY;
            self.inertial_panning[2] += movement_y as f32 / PANNING_SENSIBILITY;
        } else {
            self.inertial_alpha_offset += movement_x as f32 / ANGULAR_SENSIBILITY_X;
            self.inertial_beta_offset -= movement_y as f32 / ANGULAR_SENSIBILITY_Y;
        }
    }
    fn camera_wheel(&mut self, delta_y: f32, ctrl_key: bool) {
        let mut delta = -delta_y / (3.0 * 40.0);
        if ctrl_key {
            delta *= 10.0;
        }
        if delta != 0.0 {
            self.inertial_radius_offset += delta;
        }
    }
    fn restore(
        &mut self,
        alpha: f32,
        beta: f32,
        radius: f32,
        target_x: f32,
        target_y: f32,
        target_z: f32,
        position_x: f32,
        position_y: f32,
        position_z: f32,
        camera_id: usize,
    ) {
        self.alpha = alpha;
        self.beta = beta;
        self.radius = radius;
        self.target = [target_x, target_y, target_z, 0.0];

        let mut gpuopt = ENGINE.gpu.lock().unwrap();
        let gpu = gpuopt.as_mut().unwrap();
        let camera = gpu.get_camera_by_id_mut(camera_id);

        camera.update_position([position_x, position_y, position_z, 0.0]);
        self.calculate_direction(&camera.position, &mut camera.direction);
    }
    /// Rebuilds angles (alpha, beta) and radius from the give position and target
    fn rebuild_angles_and_radius(&mut self, current_position: &[f32; 4]) {
        let direction = current_position.sub_vec(&self.target);
        let length = direction.length();
        if length > 0.0 {
            self.radius = length;
        } else {
            self.radius = 0.0001; // Just to avoid division by zero
        }
        // Alpha

        self.alpha = if direction[0] == 0.0 && direction[2] == 0.0 {
            std::f32::consts::FRAC_PI_2 // avoid division by zero when looking along up axis, and set to acos(0)
        } else {
            (direction[0] / (direction[0].powf(2.0) + direction[2].powf(2.0)).sqrt()).acos()
        };
        if direction[2] < 0.0 {
            self.alpha = std::f32::consts::TAU - self.alpha;
        }
        self.beta = (direction[1] / self.radius).acos();
        self.check_limits();
    }
    fn check_limits(&mut self) {
        if self.beta < self.lower_beta_limit {
            self.beta = self.lower_beta_limit;
        } else if self.beta > self.upper_beta_limit {
            self.beta = self.upper_beta_limit;
        }
        if self.alpha < self.lower_alpha_limit {
            self.alpha = self.lower_alpha_limit;
        } else if self.alpha > self.upper_alpha_limit {
            self.alpha = self.upper_alpha_limit;
        }

        if self.radius < self.lower_radius_limit {
            self.radius = self.lower_radius_limit;
            self.inertial_radius_offset = 0.0;
        } else if self.radius > self.upper_radius_limit {
            self.radius = self.upper_radius_limit;
            self.inertial_radius_offset = 0.0;
        }

        self.target[1] = self.target[1].max(self.lower_target_ylimit);
    }

    fn calculate_camera_position_and_target(
        &mut self,
        camera_position: &mut [f32; 4],
        camera_direction: &mut [f32; 4],
    ) {
        let mut new_position = [0.0; 4];
        self.calculate_position(&mut new_position);
        let mut engine = ENGINE.engine2.lock().unwrap();
        if let Some(position_after_collide) =
            engine.check_collisions(&self.collider_sphere, new_position, camera_position)
        {
            camera_position[0] = position_after_collide[0];
            camera_position[1] = position_after_collide[1];
            camera_position[2] = position_after_collide[2];
            self.rebuild_angles_and_radius(&position_after_collide);
        }
        // Recompute because of constraints
        self.calculate_position(camera_position);
        self.calculate_direction(camera_position, camera_direction);
    }
    fn calculate_direction(&mut self, camera_position: &[f32; 4], camera_direction: &mut [f32; 4]) {
        camera_position.sub_vec_to_ref(&self.target, camera_direction);
        camera_direction.normalize_in_place();
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

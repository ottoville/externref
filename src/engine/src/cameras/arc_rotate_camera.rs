use std::{cell::RefCell, rc::Rc};

use collider::{ColliderSphere, CLOSE_DISTANCE};
use logger::{Logger, LoggerArray};
use terramath::{MatrixMath, VectorMath, VectorMathF32};

use crate::{
    cameras::camera::{Camera, CameraPtr, VIEW_UPDATED_DIRECTION, VIEW_UPDATED_POSITION},
    engine::STORAGE,
    mesh::ENGINE,
    objectstores::SAVE_STORE,
};

use super::cameracontroller::CameraController;
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
pub unsafe extern "C" fn new_arc_rotate_camera(
    initial: bool,
    camera: CameraPtr,
) -> *mut ArcRotateCamera {
    Box::into_raw(Box::new(ArcRotateCamera::new(
        initial,
        (*camera).upgrade().unwrap().clone(),
    )))
}
#[no_mangle]
pub unsafe extern "C" fn serialize_arcrotatecamera(arc_rotate_camera: *mut ArcRotateCamera) {
    (*arc_rotate_camera).serialize();
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
pub unsafe extern "C" fn attach_archrotate_camera_controller(
    camera: CameraPtr,
    controller: *mut ArcRotateCamera,
) {
    (&(*camera))
        .upgrade()
        .unwrap()
        .camera
        .borrow_mut()
        .controller = Some(Box::from_raw(controller));
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
        target_moving_from: (*arc_rotate_camera).state.borrow().target,
        target_moving_to: [
            target_moving_to_x,
            target_moving_to_y,
            target_moving_to_z,
            0.0,
        ],
        target_lerp_position: 0.0,
    })
}
pub struct ArcRotateCameraState {
    alpha: f32,
    beta: f32,
    radius: f32,
    target: [f32; 4],
}
pub struct ArcRotateCamera {
    state: Rc<RefCell<ArcRotateCameraState>>,

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
    transformed_direction: [f32; 3],
    movement: Option<CameraMovement>,
    collider_sphere: ColliderSphere,
    camera: Rc<Camera>,
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
                if movement.move_to_place(&mut self.state.borrow_mut().target) {
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
            let mut state = self.state.borrow_mut();

            if let Some(movement) = &mut self.movement {
                if movement.move_to_place(&mut state.target) {
                    self.movement = None;
                }
            }
            let mut inertial_alpha_offset = self.inertial_alpha_offset;
            if state.beta <= 0.0 {
                inertial_alpha_offset *= -1.0;
            }
            state.alpha += inertial_alpha_offset;

            state.beta += self.inertial_beta_offset;
            state.radius -= self.inertial_radius_offset;
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
            {
                let mut state = self.state.borrow_mut();
                // panning on Z axis
                self.transformed_direction[0] -= state.alpha.cos() * scale_z;
                self.transformed_direction[2] -= state.alpha.sin() * scale_z;
                //this._target.addInPlace(this._transformedDirection);
                state.target[0] += self.transformed_direction[0];
                state.target[1] += self.transformed_direction[1];
                state.target[2] += self.transformed_direction[2];
            }
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
pub struct IDBGetResultCamera {
    alpha: f32,
    beta: f32,
    position: [f32; 4],
    radius: f32,
    target: [f32; 4],
}

impl ArcRotateCamera {
    pub fn new(initial: bool, camera: Rc<Camera>) -> Self {
        let collision_radius = 2.0;
        let state = Rc::new(RefCell::new(ArcRotateCameraState {
            alpha: 0.0,
            beta: 0.0,
            radius: 10.0,
            target: [100.0, 0.0, 1000.0, 0.0],
        }));
        let mut controller = ArcRotateCamera {
            state: state.clone(),
            inertial_alpha_offset: 0.0,
            inertial_beta_offset: 0.0,
            inertial_radius_offset: 0.0,
            camera_transform_matrix: [[0.0; 4]; 4],
            panning_inertia: 0.9,
            inertia: 0.9,
            speed: 2.0,
            inertial_panning: [0.0; 3],
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
            camera: camera.clone(),
        };
        if !initial {
            let camera = camera.camera.borrow();
            state.borrow_mut().target = camera.position.sub_vec(&camera.direction.multiply(100.0));
            controller.rebuild_angles_and_radius(&camera.position);
        } else {
            STORAGE.with(|storage| {
                storage.get_indexed_db(|db| {
                    let transaction = db.transaction::<false, false, _>([&SAVE_STORE]);
                    let objectstore = transaction.object_store(&SAVE_STORE);

                    let result = objectstore.get::<IDBGetResultCamera>(&[
                        String::from("camera"),
                        String::from("ArchRotateCamera"),
                    ]);
                    result.on_success(move |maybe_res, _| {
                        let mut borrowed = state.borrow_mut();
                        let mut borrowed_camera = camera.camera.borrow_mut();

                        if let Some(res) = maybe_res {
                            borrowed.alpha = res.alpha;
                            borrowed.beta = res.beta;
                            borrowed.radius = res.radius;
                            borrowed.target = res.target;
                            borrowed_camera.update_position(res.position);
                            borrowed_camera.set_direction_from_target(&res.target);
                        } else {
                            borrowed.alpha = 0.4614110368395256;
                            borrowed.beta = 1.4816457152012938;
                            borrowed.radius = 457.55058783756886;
                            borrowed.target = [544.716, 258.727, 384.33, 0.0];
                            borrowed_camera.update_position([952.791, 299.464, 587.233, 0.0]);
                            borrowed_camera.set_direction_from_target(&borrowed.target);
                        }
                    });
                })
            })
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
    fn serialize(&self) {
        STORAGE.with(|db_request| {
            let position = self.camera.camera.borrow().position;
            let state = self.state.borrow();
            let serialized = IDBGetResultCamera {
                alpha: state.alpha,
                beta: state.beta,
                radius: state.radius,
                position,
                target: state.target,
            };
            db_request.get_indexed_db(move |db| {
                let transaction = db.transaction::<true, false, _>([&SAVE_STORE]);
                transaction.on_error(|k, e| {
                    &"camera serialization transaction error".error();
                });
                transaction.on_abort(|k, e| {
                    &"camera serialization transaction abort".error();
                });
                transaction.on_complete(|e| {
                    &"camera serialization transaction complete".log();
                });
                let objectstore = transaction.object_store(&SAVE_STORE);
                let req = objectstore.put(
                    &serialized,
                    &[String::from("camera"), String::from("ArchRotateCamera")],
                );
                req.on_error(|k, e| {
                    &"camera serialization error".error();
                });
                req.on_success(|s,e| {});
            });
        })
    }
    /// Rebuilds angles (alpha, beta) and radius from the give position and target
    fn rebuild_angles_and_radius(&mut self, current_position: &[f32; 4]) {
        {
            let mut state = self.state.borrow_mut();
            let direction = current_position.sub_vec(&state.target);
            let length = direction.length();
            if length > 0.0 {
                state.radius = length;
            } else {
                state.radius = 0.0001; // Just to avoid division by zero
            }
            // Alpha

            state.alpha = if direction[0] == 0.0 && direction[2] == 0.0 {
                std::f32::consts::FRAC_PI_2 // avoid division by zero when looking along up axis, and set to acos(0)
            } else {
                (direction[0] / (direction[0].powf(2.0) + direction[2].powf(2.0)).sqrt()).acos()
            };
            if direction[2] < 0.0 {
                state.alpha = std::f32::consts::TAU - state.alpha;
            }
            state.beta = (direction[1] / state.radius).acos();
        };
        self.check_limits();
    }
    fn check_limits(&mut self) {
        let mut state = self.state.borrow_mut();

        if state.beta < self.lower_beta_limit {
            state.beta = self.lower_beta_limit;
        } else if state.beta > self.upper_beta_limit {
            state.beta = self.upper_beta_limit;
        }
        if state.alpha < self.lower_alpha_limit {
            state.alpha = self.lower_alpha_limit;
        } else if state.alpha > self.upper_alpha_limit {
            state.alpha = self.upper_alpha_limit;
        }

        if state.radius < self.lower_radius_limit {
            state.radius = self.lower_radius_limit;
            self.inertial_radius_offset = 0.0;
        } else if state.radius > self.upper_radius_limit {
            state.radius = self.upper_radius_limit;
            self.inertial_radius_offset = 0.0;
        }

        state.target[1] = state.target[1].max(self.lower_target_ylimit);
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
        camera_position.sub_vec_to_ref(&self.state.borrow().target, camera_direction);
        camera_direction.normalize_in_place();
    }
    fn calculate_position(&mut self, result: &mut [f32; 4]) {
        let mut state = self.state.borrow_mut();

        let mut sinb = state.beta.sin();
        if sinb == 0.0 {
            sinb = 0.0001;
        }
        //this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);
        result[0] = state.target[0] + state.radius * state.alpha.cos() * sinb;
        result[1] = state.target[1] + state.radius * state.beta.cos();
        result[2] = state.target[2] + state.radius * state.alpha.sin() * sinb;
    }
}

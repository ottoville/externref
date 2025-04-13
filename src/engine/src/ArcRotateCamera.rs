use terramath::VectorMath;

use crate::{
    camera::{VIEW_UPDATED_DIRECTION, VIEW_UPDATED_POSITION},
    cameracontroller::CameraController,
};

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
pub struct ArcRotateCamera {
    alpha: f32,
    beta: f32,
    radius: f32,
    /*
     * Current inertia value on the longitudinal axis.
     * The bigger this number the longer it will take for the camera to stop.
     */
    inertial_alpha_offset: f32,
    /**
     * Current inertia value on the latitudinal axis.
     * The bigger this number the longer it will take for the camera to stop.
     */
    inertial_beta_offset: f32,
    inertial_radius_offset: f32,
    inertia: f32,
    inertial_panning: [f32; 3],
    target: [f32; 3],
    transformed_sirection: [[f32; 4]; 4],
    movement: Option<CameraMovement>,
}

impl CameraController for ArcRotateCamera {
    fn check_inputs(
        &mut self,
        force_recalculate: bool,
        position: &mut [f32; 4],
        direction: &mut [f32; 3],
    ) -> u32 {
        if let Some(movement) = &mut self.movement {
            if movement.kinematic {
                if movement.move_to_place(&mut self.target) {
                    self.movement = None;
                }
                //this.calculateCameraPositionAndTarget();
                return VIEW_UPDATED_POSITION & VIEW_UPDATED_DIRECTION;
            }
        }
        todo!()
    }
}
impl ArcRotateCamera {
    fn calculate_camera_position_and_target(&mut self) {}
    fn calculate_position(&mut self, result: &mut [f32; 3]) {
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

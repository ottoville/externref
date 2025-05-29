use super::{
    camera::{Camera, VIEW_UPDATED_DIRECTION, VIEW_UPDATED_POSITION},
    cameracontroller::CameraController,
};

pub const VELOCITY: f32 = 0.5;
pub const ARROW_KEYS_UP: u32 = 1;
pub const ARROW_KEYS_RIGHT: u32 = 2;
pub const ARROW_KEYS_DOWN: u32 = 4;
pub const ARROW_KEYS_LEFT: u32 = 8;
/*const ARROW_KEYS_UP_RIGHT: u32 = ARROW_KEYS_UP | ARROW_KEYS_RIGHT;
const ARROW_KEYS_UP_LEFT: u32 = ARROW_KEYS_UP | ARROW_KEYS_LEFT;
const ARROW_KEYS_DOWN_RIGHT: u32 = ARROW_KEYS_DOWN | ARROW_KEYS_RIGHT;
const ARROW_KEYS_DOWN_LEFT: u32 = ARROW_KEYS_DOWN | ARROW_KEYS_LEFT;
const ARROW_KEYS_LEFT_OR_RIGHT: u32 = ARROW_KEYS_LEFT | ARROW_KEYS_RIGHT;*/
const ARROW_KEYS_UP_OR_DOWN: u32 = ARROW_KEYS_UP | ARROW_KEYS_DOWN;

#[no_mangle]
pub unsafe extern "C" fn new_position_camera() -> *mut PositionCamera {
    Box::into_raw(Box::new(PositionCamera {
        arrow_keys_down: 0,
        elevation: 0,
        position: [0.0; 4],
        ctrl: false,
        angle: std::f32::consts::PI,
        v_angle: std::f32::consts::FRAC_PI_2,
    }))
}
#[no_mangle]
pub unsafe extern "C" fn attach_positioncamera_camera_controller(
    camera: *mut &mut Camera,
    controller: *mut PositionCamera,
) {
    (*camera).controller = Some(Box::from_raw(controller));
}
#[no_mangle]
pub unsafe extern "C" fn keyfunction(
    controller: *mut PositionCamera,
    up: bool,
    ctrl_key: bool,
    key_ptr: *mut u8,
    key_len: usize,
    key_cap: usize,
) {
    if up {
        (*controller).keyupfunction(ctrl_key, String::from_raw_parts(key_ptr, key_len, key_cap));
    } else {
        (*controller).keydownfunction(ctrl_key, String::from_raw_parts(key_ptr, key_len, key_cap));
    }
}
pub struct PositionCamera {
    arrow_keys_down: u32,
    elevation: i32,
    position: [f32; 4],
    ctrl: bool,
    angle: f32,
    v_angle: f32,
}
impl PositionCamera {
    fn keydownfunction(&mut self, ctrl_key: bool, key: String) {
        self.ctrl = ctrl_key;
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
        if key == "PageUp" {
            self.elevation = 1;
        } else if key == "PageDown" {
            self.elevation = -1;
        }
    }
    fn keyupfunction(&mut self, ctrl_key: bool, key: String) {
        self.ctrl = ctrl_key;
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
        if key == "PageUp" || key == "PageDown" {
            self.elevation = 0;
        }
    }
}
impl CameraController for PositionCamera {
    fn check_inputs(
        &mut self,
        _force_recalculate: bool,
        position: &mut [f32; 4],
        direction: &mut [f32; 4],
        _view: &[[f32; 4]; 4],
    ) -> u32 {
        if self.arrow_keys_down == 0 && self.elevation == 0 {
            return 0;
        }
        let mut view_updated = 0;

        if self.elevation != 0 {
            position[1] += self.elevation as f32 * VELOCITY;
            view_updated = VIEW_UPDATED_POSITION; 
        }

        if self.arrow_keys_down != 0 {
            if self.ctrl {
                if (self.arrow_keys_down & ARROW_KEYS_RIGHT) == ARROW_KEYS_RIGHT {
                    self.angle += 0.03;
                    if self.angle > std::f32::consts::PI {
                        self.angle = -std::f32::consts::PI - (self.angle % std::f32::consts::PI);
                    }
                }
                if (self.arrow_keys_down & ARROW_KEYS_LEFT) == ARROW_KEYS_LEFT {
                    self.angle -= 0.03;
                    if self.angle < -std::f32::consts::PI {
                        self.angle = std::f32::consts::PI - (self.angle % std::f32::consts::PI);
                    }
                }
                if (self.arrow_keys_down & ARROW_KEYS_UP) == ARROW_KEYS_UP {
                    self.v_angle += 0.02;
                }
                if (self.arrow_keys_down & ARROW_KEYS_DOWN) == ARROW_KEYS_DOWN {
                    self.v_angle -= 0.02;
                }
                self.v_angle = self.v_angle % (std::f32::consts::TAU);
                let vsin = self.v_angle.sin();
                direction[0] = self.angle.cos() * vsin;
                direction[1] = self.v_angle.cos();
                direction[2] = self.angle.sin() * vsin;
                view_updated |= VIEW_UPDATED_DIRECTION; 

            } else {
                if self.arrow_keys_down & ARROW_KEYS_UP_OR_DOWN > 0 {
                    if (self.arrow_keys_down & ARROW_KEYS_UP) == ARROW_KEYS_UP {
                        position[0] -= direction[0] * VELOCITY;
                        position[2] -= direction[2] * VELOCITY;
                    } else {
                        position[0] += direction[0] * VELOCITY;
                        position[2] += direction[2] * VELOCITY;
                    }
                }
                else {
                    if (self.arrow_keys_down & ARROW_KEYS_RIGHT) == ARROW_KEYS_RIGHT {
                        position[0] += direction[2] * VELOCITY;
                        position[2] -= direction[0] * VELOCITY;
                    } else {
                        position[0] -= direction[2] * VELOCITY;
                        position[2] += direction[0] * VELOCITY;
                    }
                }
                self.position = position.clone();
                view_updated |= VIEW_UPDATED_POSITION; 
            }
        }

        return view_updated;
    }
}

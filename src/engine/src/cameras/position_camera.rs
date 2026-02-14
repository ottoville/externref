use std::{cell::RefCell, rc::Rc, sync::atomic::Ordering};

use web::{
    console::console::Console,
    document::event_listener::{
        ARROW_KEYS_DOWN, ARROW_KEYS_LEFT, ARROW_KEYS_RIGHT, ARROW_KEYS_UP, ARROW_KEYS_UP_OR_DOWN,
        CTRL, KEYSDOWN, PAGEDOWN, PAGEUP, PREVIOUS_KEYSDOWN, SOME_ARROW_KEY,
    },
};

use crate::{
    cameras::camera::{Camera, CameraPtr},
    engine::STORAGE,
    objectstores::SAVE_STORE,
};

use super::{
    camera::{VIEW_UPDATED_DIRECTION, VIEW_UPDATED_POSITION},
    cameracontroller::CameraController,
};

pub const VELOCITY: f32 = 0.5;
#[no_mangle]
pub unsafe extern "C" fn new_position_camera(
    initial: bool,
    camera: CameraPtr,
) -> *mut PositionCamera {
    Box::into_raw(Box::new(PositionCamera::new(
        initial,
        (*camera).upgrade().unwrap().clone(),
    )))
}
#[no_mangle]
pub unsafe extern "C" fn attach_positioncamera_camera_controller(
    camera: CameraPtr,
    controller: *mut PositionCamera,
) {
    (&(*camera))
        .upgrade()
        .unwrap()
        .camera
        .borrow_mut()
        .controller = Some(Box::from_raw(controller));
}
#[no_mangle]
pub unsafe extern "C" fn serialize_positioncamera(position_camera: *mut PositionCamera) {
    (*position_camera).serialize();
}
/**
    This camera is used for camera that can be moved with keyboard
    without being attached to any mesh
*/
pub struct PositionCamera {
    moving: bool,
    state: Rc<RefCell<PositionCameraState>>,
}
pub struct PositionCameraState {
    angle: f32,
    v_angle: f32,
    position: [f32; 4],
}
impl PositionCamera {
    pub fn new(initial: bool, camera: Rc<Camera>) -> Self {
        let position_camera = PositionCamera {
            moving: false,
            state: Rc::new(RefCell::new(PositionCameraState {
                position: [0.0; 4],
                angle: std::f32::consts::PI,
                v_angle: std::f32::consts::FRAC_PI_2,
            })),
        };
        if !initial {
            let mut state = position_camera.state.borrow_mut();
            let camera = camera.camera.borrow();
            state.position = camera.position;
            state.angle = camera.direction[2].atan2(camera.direction[0]);

            state.v_angle = camera.direction[1].atan2(
                (camera.direction[0] * camera.direction[0]
                    + camera.direction[2] * camera.direction[2])
                    .sqrt(),
            ) * -1.0
                + std::f32::consts::PI * 0.5;
        } else {
            let state = position_camera.state.clone();
            STORAGE.with(|storage| {
                storage.get_indexed_db(|db| {
                    let transaction = db.transaction::<false, false, _>([&SAVE_STORE]);
                    let objectstore = transaction.object_store(&SAVE_STORE);

                    objectstore.get::<PositionCameraState>(
                        &[String::from("camera"), String::from("ArchRotateCamera")],
                        move |res_opt| match res_opt {
                            Ok(maybe_res) => {
                                if let Some(res) = maybe_res {
                                    let mut borrowed_camera = camera.camera.borrow_mut();
                                    borrowed_camera.update_position(res.position);
                                    borrowed_camera.update_direction([
                                        f32::cos(res.angle),
                                        0.0,
                                        f32::sin(res.angle),
                                        0.0,
                                    ]);
                                    let mut borrowed = state.borrow_mut();
                                    *borrowed = res;
                                }
                            }
                            Err(_) => todo!(),
                        },
                    );
                })
            })
        }
        return position_camera;
    }
    pub fn serialize(&self) {
        let serialized = self.state.clone();
        STORAGE.with(|db_request| {
            db_request.get_indexed_db(move |db| {
                let transaction = db.transaction::<true, false, _>([&SAVE_STORE]);
                transaction.on_error(|k, e| {
                    Console::error("camera serialization transaction error");
                });
                let objectstore = transaction.object_store(&SAVE_STORE);
                let data = &**(&serialized.borrow());
                objectstore.put(
                    data,
                    &[String::from("camera"), String::from("PositionCamera")],
                    |res| {
                        if res.is_err() {
                            Console::error("camera serialization error");
                        }
                    },
                );
            })
        })
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
        let keysdown = KEYSDOWN.load(Ordering::Relaxed);
        if (!self.moving) && keysdown == PREVIOUS_KEYSDOWN.load(Ordering::Relaxed) {
            return 0;
        }
        let mut view_updated = 0;
        if (keysdown & PAGEUP) == PAGEUP {
            position[1] += VELOCITY;
            view_updated = VIEW_UPDATED_POSITION;
        } else if (keysdown & PAGEDOWN) == PAGEDOWN {
            position[1] -= VELOCITY;
            view_updated = VIEW_UPDATED_POSITION;
        }
        if keysdown & SOME_ARROW_KEY != 0 {
            let mut state = self.state.borrow_mut();
            if (keysdown & CTRL) != 0 {
                if (keysdown & ARROW_KEYS_RIGHT) == ARROW_KEYS_RIGHT {
                    state.angle += 0.03;
                    if state.angle > std::f32::consts::PI {
                        state.angle = -std::f32::consts::PI - (state.angle % std::f32::consts::PI);
                    }
                }
                if (keysdown & ARROW_KEYS_LEFT) == ARROW_KEYS_LEFT {
                    state.angle -= 0.03;
                    if state.angle < -std::f32::consts::PI {
                        state.angle = std::f32::consts::PI - (state.angle % std::f32::consts::PI);
                    }
                }
                if (keysdown & ARROW_KEYS_UP) == ARROW_KEYS_UP {
                    state.v_angle += 0.02;
                }
                if (keysdown & ARROW_KEYS_DOWN) == ARROW_KEYS_DOWN {
                    state.v_angle -= 0.02;
                }
                if state.v_angle > std::f32::consts::PI {
                    state.v_angle = std::f32::consts::PI;
                }
                if state.v_angle < 0.0 {
                    state.v_angle = 0.0;
                }
                let vsin = state.v_angle.sin();
                direction[0] = state.angle.cos() * vsin;
                direction[1] = state.v_angle.cos();
                direction[2] = state.angle.sin() * vsin;

                view_updated |= VIEW_UPDATED_DIRECTION;
            } else {
                if keysdown & ARROW_KEYS_UP_OR_DOWN > 0 {
                    if (keysdown & ARROW_KEYS_UP) == ARROW_KEYS_UP {
                        position[0] -= direction[0] * VELOCITY;
                        position[2] -= direction[2] * VELOCITY;
                    } else {
                        position[0] += direction[0] * VELOCITY;
                        position[2] += direction[2] * VELOCITY;
                    }
                } else {
                    if (keysdown & ARROW_KEYS_RIGHT) == ARROW_KEYS_RIGHT {
                        position[0] += direction[2] * VELOCITY;
                        position[2] -= direction[0] * VELOCITY;
                    } else {
                        position[0] -= direction[2] * VELOCITY;
                        position[2] += direction[0] * VELOCITY;
                    }
                }
                state.position = position.clone();
                view_updated |= VIEW_UPDATED_POSITION;
            }
        }
        self.moving = view_updated != 0;
        return view_updated;
    }
}

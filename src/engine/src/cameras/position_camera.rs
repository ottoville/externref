use super::cameracontroller::CameraController;

#[no_mangle]
pub unsafe extern "C" fn new_position_camera() -> *mut PositionCamera {
    Box::into_raw(Box::new(PositionCamera {}))
}

pub struct PositionCamera {
    
}
impl CameraController for PositionCamera {
    fn check_inputs(
        &mut self,
        force_recalculate: bool,
        position: &mut [f32; 4],
        direction: &mut [f32; 3],
    ) -> u32 {
        todo!()
    }
}
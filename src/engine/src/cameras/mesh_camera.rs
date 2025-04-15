use super::cameracontroller::CameraController;

#[no_mangle]
pub unsafe extern "C" fn new_mesh_camera() -> *mut MeshCamera {
    Box::into_raw(Box::new(MeshCamera {}))
}

pub struct MeshCamera {
    
}
impl CameraController for MeshCamera {
    fn check_inputs(
        &mut self,
        force_recalculate: bool,
        position: &mut [f32; 4],
        direction: &mut [f32; 3],
    ) -> u32 {
        todo!()
    }
}
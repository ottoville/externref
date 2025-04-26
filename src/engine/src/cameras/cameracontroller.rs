pub trait CameraController {
    fn check_inputs(
        &mut self,
        force_recalculate: bool,
        position: &mut [f32; 4],
        direction: &mut [f32; 4],
        view: &[[f32; 4]; 4]
    ) -> u32;
}

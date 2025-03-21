pub trait CameraController {
    fn check_inputs(&mut self, force_recalculate: bool);
}

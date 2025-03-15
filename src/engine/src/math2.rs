#[repr(C, align(16))]
pub struct Mat3wgslF32 {
    pub x: [f32; 3],
    _padding0: f32,
    pub y: [f32; 3],
    _padding1: f32,
    pub z: [f32; 3],
    _padding2: f32,
}
impl Mat3wgslF32 {
    pub fn identity() -> Mat3wgslF32 {
        Mat3wgslF32 {
            x: [1.0, 0.0, 0.0],
            _padding0: 0.0,
            y: [0.0, 1.0, 0.0],
            _padding1: 0.0,
            z: [0.0, 0.0, 1.0],
            _padding2: 0.0,
        }
    }
}

#[repr(C, align(8))]
pub struct Vec2wgslF32 {
    pub vec: [f32; 2],
}

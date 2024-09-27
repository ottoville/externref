#[repr(C, align(16))]
pub struct Mat3wgslF32 {
    pub x: [f32; 3],
    _padding0: f32,
    pub y: [f32; 3],
    _padding1: f32,
    pub z: [f32; 3],
    _padding2: f32,
}
#[derive(Debug, Copy, Clone)]
#[repr(C, align(16))]
pub struct Vec3wgslF32(pub [f32; 3]);

impl Vec3wgslF32 {
    pub fn new_zero() -> Vec3wgslF32 {
        Vec3wgslF32([0.0, 0.0, 0.0])
    }
    pub fn clone(&self) -> Vec3wgslF32 {
        Vec3wgslF32(self.0.clone())
    }
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

#[derive(Copy, Clone)]
pub struct Vec3<T> {
    pub x: T,
    pub y: T,
    pub z: T,
}
#[repr(C, align(16))]
pub struct Mat3wgslF32 {
    pub x: [f32; 3],
    _padding0: f32,
    pub y: [f32; 3],
    _padding1: f32,
    pub z: [f32; 3],
    _padding2: f32
}
#[repr(C, align(16))]
pub struct Vec3wgslF32 {
    pub vec: [f32; 3]
}

impl Vec3wgslF32 {
    pub fn new() -> Vec3wgslF32 {
        Vec3wgslF32 {
            vec: [0.0,0.0,0.0]
        }
    }
    pub fn clone(&self) -> Vec3wgslF32 {
        Vec3wgslF32 {
            vec: self.vec.clone()
        }
    }
}

impl Mat3wgslF32 {
    pub fn identity() -> Mat3wgslF32 {
        Mat3wgslF32 {
            x: [1.0,0.0,0.0],
            _padding0: 0.0,
            y: [0.0,1.0,0.0],
            _padding1: 0.0,
            z: [0.0,0.0,1.0],
            _padding2: 0.0,
        }
    }
}


#[repr(C, align(16))]
pub struct Vec2F32 {
    pub u: f32,
    pub v: f32,
}



#[derive(Copy, Clone)]
pub struct Vec4<T> {
    pub x: T,
    pub y: T,
    pub z: T,
    pub w: T,
}

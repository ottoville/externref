use crate::math2::{Vec2F32, Vec3F32};

#[repr(C, align(16))]
pub struct PositionAndNormal {
    pub position: Vec3F32,
    pub normal: Vec3F32,
}
#[repr(C, align(16))]
pub struct PositionAndNormalAndUV {
    pub position: Vec3F32,
    pub normal: Vec3F32,
    pub uv: Vec2F32
}
#[repr(C, align(16))]
pub struct PositionAndNormalAndColor {
    pub position: Vec3F32,
    pub normal: Vec3F32,
    pub color: Vec3F32
}
pub use crate::Vec3;

pub struct BoundingBox {
    pub has_bounding:bool,
    pub min:Vec3,
    pub max:Vec3,
    pub min_original:Vec3,
    pub max_original:Vec3,
    pub dirty_min:bool,
    pub dirty_max:bool,
    pub need_init_min:bool,
    pub need_init_max:bool,
}
impl BoundingBox {

}
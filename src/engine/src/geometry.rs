
pub use crate::Vec3;
pub use crate::boundingbox::BoundingBox;

pub struct Geometry {
    pub has_geometry:bool,
    pub bounding_box:BoundingBox,
    pub vertices:Vec<f32>,
    pub vertices_stride: usize,
}
impl Geometry {
    pub fn new(has_geometry:bool, has_bounding:bool,vertices_stride:usize, vertices_amount:usize) -> Self {
        Geometry {
            has_geometry,
            bounding_box:BoundingBox::new(has_bounding),
            vertices:Vec::with_capacity(vertices_amount*vertices_stride),
            vertices_stride,
        }
    }
    pub fn update_vertices(&mut self, vertices:Vec<f32>) {
        self.vertices=vertices;
        self.bounding_box.need_init_min = true;
        self.bounding_box.need_init_max = true;
    }
}
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
    pub fn min(&self) -> Vec3<f32> {
        let mut min_original=Vec3 {
            x:self.vertices[0],
            y:self.vertices[1],
            z:self.vertices[2]
        };
        let positions=self.vertices.chunks(self.vertices_stride);
        for position in positions {
            if position[0] < min_original.x {
                min_original.x = position[0]
            }
            if position[1] < min_original.y {
                min_original.y = position[1]
            }
            if position[2] < min_original.z {
                min_original.z = position[2]
            }
        }
        return min_original;
    }
    pub fn max(&self) -> Vec3<f32> {
        let mut original=Vec3 {
            x:self.vertices[0],
            y:self.vertices[1],
            z:self.vertices[2]
        };
        let positions=self.vertices.chunks(self.vertices_stride);
        for position in positions {
            if position[0] > original.x {
                original.x = position[0]
            }
            if position[1] > original.y {
                original.y = position[1]
            }
            if position[2] > original.z {
                original.z = position[2]
            }
        }
        return original;
    }
    pub fn update_vertices(&mut self, vertices:Vec<f32>) {
        self.vertices=vertices;
        self.bounding_box.need_init_min = true;
        self.bounding_box.need_init_max = true;
    }
}
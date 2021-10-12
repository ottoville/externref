pub use crate::Vec3;
pub use crate::Vec4;
pub use crate::mesh::Mesh;

pub struct BoundingBox {
    pub has_bounding:bool,
    pub min:Vec3<f32>,
    pub max:Vec3<f32>,
    pub min_original:Vec3<f32>,
    pub max_original:Vec3<f32>,
    pub vectors_original: [Vec3<f32>;8],
    pub vectors: [Vec3<f32>;8],
    pub dirty:bool,
    pub need_init:bool,
}

impl BoundingBox {
    pub fn new(has_bounding:bool) -> Self {
        BoundingBox {
            has_bounding,
            min:Vec3 {x:0.0,y:0.0,z:0.0},
            max:Vec3 {x:0.0,y:0.0,z:0.0},
            min_original:Vec3 {x:0.0,y:0.0,z:0.0},
            max_original:Vec3 {x:0.0,y:0.0,z:0.0},
            vectors_original:[Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0}],
            vectors:[Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0},Vec3 {x:0.0,y:0.0,z:0.0}],
            dirty:true,
            need_init:true,
        }
    }
    pub fn init(&mut self, vertices:&Vec<f32>,vertices_stride: usize) {
        self.min_original.x=vertices[0];
        self.min_original.x=vertices[1];
        self.min_original.x=vertices[2];
        self.max_original.x=vertices[0];
        self.max_original.x=vertices[1];
        self.max_original.x=vertices[2];

        let positions=vertices.chunks(vertices_stride);
        for position in positions {
            if position[0] < self.min_original.x {
                self.min_original.x = position[0]
            }
            else if position[0] > self.max_original.x {
                self.max_original.x = position[0]
            }
            if position[1] < self.min_original.y {
                self.min_original.y = position[1]
            }
            else if position[1] > self.max_original.y {
                self.max_original.y = position[1]
            }
            if position[2] < self.min_original.z {
                self.min_original.z = position[2]
            } else if position[2] > self.max_original.z {
                self.max_original.z = position[2]
            }
        }
        self.vectors_original[0] = Vec3 {x:self.min_original.x, y:self.min_original.y, z:self.min_original.z};
        self.vectors_original[1] = Vec3 {x:self.min_original.x, y:self.min_original.y, z:self.max_original.z};
        self.vectors_original[2] = Vec3 {x:self.min_original.x, y:self.max_original.y, z:self.max_original.z};
        self.vectors_original[3] = Vec3 {x:self.min_original.x, y:self.max_original.y, z:self.min_original.z};

        self.vectors_original[4] = Vec3 {x:self.max_original.x, y:self.max_original.y, z:self.min_original.z};
        self.vectors_original[5] = Vec3 {x:self.max_original.x, y:self.max_original.y, z:self.max_original.z};
        self.vectors_original[6] = Vec3 {x:self.max_original.x, y:self.min_original.y, z:self.max_original.z};
        self.vectors_original[7] = Vec3 {x:self.max_original.x, y:self.min_original.y, z:self.min_original.z};

        self.need_init = false;

    }
    pub fn transform(&mut self, transformation: &Vec4<Vec4<f32>>) {
        //TODO: SIMD can be applied here very effectively, as there are eight nodes to transform
        self.vectors_original[0].transform_to_ref(transformation,&mut self.vectors[0]);
        self.vectors_original[1].transform_to_ref(transformation,&mut self.vectors[1]);
        self.vectors_original[2].transform_to_ref(transformation,&mut self.vectors[2]);
        self.vectors_original[3].transform_to_ref(transformation,&mut self.vectors[3]);
        self.vectors_original[4].transform_to_ref(transformation,&mut self.vectors[4]);
        self.vectors_original[5].transform_to_ref(transformation,&mut self.vectors[5]);
        self.vectors_original[6].transform_to_ref(transformation,&mut self.vectors[6]);
        self.vectors_original[7].transform_to_ref(transformation,&mut self.vectors[7]);
        
        //TODO: use SIMD lanewise min and max
        for vector in self.vectors.iter() {
            if vector.x < self.min.x {
                self.min.x=vector.x;
            }
            if vector.y < self.min.y {
                self.min.y=vector.y;
            }
            if vector.z < self.min.z {
                self.min.z=vector.z;
            }
            if vector.x > self.max.x {
                self.max.x=vector.x;
            }
            if vector.y > self.max.y {
                self.max.y=vector.y;
            }
            if vector.z > self.max.z {
                self.max.z=vector.z;
            }
        }

        self.dirty=false;
    }
}
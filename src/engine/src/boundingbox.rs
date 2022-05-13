use crate::collider::Collider;
use crate::math::{Vec4, Vec3F32, Vec3};
pub use crate::mesh::Mesh;

pub struct BoundingBox {
    pub has_bounding:bool,
    pub min:Vec3F32,
    pub max:Vec3F32,
    pub min_original:Vec3<f32>,
    pub max_original:Vec3<f32>,
    pub vectors_original_simd: [Vec3<Vec4<f32>>;2],
    pub vectors_simd: [Vec3<Vec4<f32>>;2],
    pub dirty:bool,
    pub need_init:bool,
}

impl BoundingBox {
    pub fn new(has_bounding:bool) -> Self {
        BoundingBox {
            has_bounding,
            min:Vec3F32 {x:0.0,y:0.0,z:0.0},
            max:Vec3F32 {x:0.0,y:0.0,z:0.0},
            min_original:Vec3 {x:0.0,y:0.0,z:0.0},
            max_original:Vec3 {x:0.0,y:0.0,z:0.0},
            vectors_original_simd:[Vec3 { x:Vec4 {x:0.0,y:0.0,z:0.0, w:0.0},  y:Vec4 {x:0.0,y:0.0,z:0.0, w:0.0}, z: Vec4 {x:0.0,y:0.0,z:0.0, w:0.0}};2],
            vectors_simd:[Vec3 { x:Vec4 {x:0.0,y:0.0,z:0.0, w:0.0},  y:Vec4 {x:0.0,y:0.0,z:0.0, w:0.0}, z: Vec4 {x:0.0,y:0.0,z:0.0, w:0.0}};2],
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

        self.vectors_original_simd[0] = Vec3 {
            x: Vec4 { // X-lane
                x: self.min_original.x,
                y: self.min_original.x,
                z: self.min_original.x,
                w: self.min_original.x
            },
            y: Vec4 { // Y-lane
                x: self.min_original.y,
                y: self.min_original.y,
                z: self.max_original.y,
                w: self.max_original.y
            },
            z: Vec4 { // Z-lane
                x: self.min_original.z,
                y: self.max_original.z,
                z: self.max_original.z,
                w: self.min_original.z
            }
        };
        self.vectors_original_simd[1] = Vec3 {
            x: Vec4 { // X-lane
                x: self.max_original.x,
                y: self.max_original.x,
                z: self.max_original.x,
                w: self.max_original.x
            },
            y: Vec4 { // Y-lane
                x: self.max_original.y,
                y: self.max_original.y,
                z: self.min_original.y,
                w: self.min_original.y
            },
            z: Vec4 { // Z-lane
                x: self.min_original.z,
                y: self.max_original.z,
                z: self.max_original.z,
                w: self.min_original.z
            }
        };

        self.need_init = false;

    }
    pub fn transform(&mut self, transformation: &Vec4<Vec4<f32>>) {
        for (vector_original_simd, vector_simd) in self.vectors_original_simd.iter().zip(&mut self.vectors_simd.iter_mut()) {
            // X
            let rx0 = vector_original_simd.x.x * transformation.x.x + vector_original_simd.y.x * transformation.y.x + vector_original_simd.z.x * transformation.z.x + transformation.w.x;
            let rx1 = vector_original_simd.x.y * transformation.x.x + vector_original_simd.y.y * transformation.y.x + vector_original_simd.z.y * transformation.z.x + transformation.w.x;
            let rx2 = vector_original_simd.x.z * transformation.x.x + vector_original_simd.y.z * transformation.y.x + vector_original_simd.z.z * transformation.z.x + transformation.w.x;
            let rx3 = vector_original_simd.x.w * transformation.x.x + vector_original_simd.y.w * transformation.y.x + vector_original_simd.z.w * transformation.z.x + transformation.w.x;
            // Y
            let ry0 = vector_original_simd.x.x * transformation.x.y + vector_original_simd.y.x * transformation.y.y + vector_original_simd.z.x * transformation.z.y + transformation.w.y;
            let ry1 = vector_original_simd.x.y * transformation.x.y + vector_original_simd.y.y * transformation.y.y + vector_original_simd.z.y * transformation.z.y + transformation.w.y;
            let ry2 = vector_original_simd.x.z * transformation.x.y + vector_original_simd.y.z * transformation.y.y + vector_original_simd.z.z * transformation.z.y + transformation.w.y;
            let ry3 = vector_original_simd.x.w * transformation.x.y + vector_original_simd.y.w * transformation.y.y + vector_original_simd.z.w * transformation.z.y + transformation.w.y;
            // Z
            let rz0 = vector_original_simd.x.x * transformation.x.z + vector_original_simd.y.x * transformation.y.z + vector_original_simd.z.x * transformation.z.z + transformation.w.z;
            let rz1 = vector_original_simd.x.y * transformation.x.z + vector_original_simd.y.y * transformation.y.z + vector_original_simd.z.y * transformation.z.z + transformation.w.z;
            let rz2 = vector_original_simd.x.z * transformation.x.z + vector_original_simd.y.z * transformation.y.z + vector_original_simd.z.z * transformation.z.z + transformation.w.z;
            let rz3 = vector_original_simd.x.w * transformation.x.z + vector_original_simd.y.w * transformation.y.z + vector_original_simd.z.w * transformation.z.z + transformation.w.z;
            // W
            let rw0 = 1.0 / (vector_original_simd.x.x * transformation.x.w + vector_original_simd.y.x * transformation.y.w + vector_original_simd.z.x * transformation.z.w + transformation.w.w);
            let rw1 = 1.0 / (vector_original_simd.x.y * transformation.x.w + vector_original_simd.y.y * transformation.y.w + vector_original_simd.z.y * transformation.z.w + transformation.w.w);
            let rw2 = 1.0 / (vector_original_simd.x.z * transformation.x.w + vector_original_simd.y.z * transformation.y.w + vector_original_simd.z.z * transformation.z.w + transformation.w.w);
            let rw3 = 1.0 / (vector_original_simd.x.w * transformation.x.w + vector_original_simd.y.w * transformation.y.w + vector_original_simd.z.w * transformation.z.w + transformation.w.w);

            //other.x = rx * rw;
            vector_simd.x.x= rx0 * rw0;
            vector_simd.x.y= rx1 * rw1;
            vector_simd.x.z= rx2 * rw2;
            vector_simd.x.w= rx3 * rw3;
            //other.y = ry * rw;
            vector_simd.y.x= ry0 * rw0;
            vector_simd.y.y= ry1 * rw1;
            vector_simd.y.z= ry2 * rw2;
            vector_simd.y.w= ry3 * rw3;
            //other.z = rz * rw;
            vector_simd.z.x= rz0 * rw0;
            vector_simd.z.y= rz1 * rw1;
            vector_simd.z.z= rz2 * rw2;
            vector_simd.z.w= rz3 * rw3;
        }
        self.min = Vec3F32 {
            x: self.vectors_simd[0].x.min(&self.vectors_simd[1].x).get_min(),
            y: self.vectors_simd[0].y.min(&self.vectors_simd[1].y).get_min(),
            z: self.vectors_simd[0].z.min(&self.vectors_simd[1].z).get_min()
        };
        self.max = Vec3F32 {
            x: self.vectors_simd[0].x.max(&self.vectors_simd[1].x).get_max(),
            y: self.vectors_simd[0].y.max(&self.vectors_simd[1].y).get_max(),
            z: self.vectors_simd[0].z.max(&self.vectors_simd[1].z).get_max()
        };

        self.dirty=false;
    }
    pub fn intersect_box_aa_sphere(&self, collider: &Collider, radius:f32) -> bool {
        let bound=collider.speed + radius;
        if self.min.x > collider.basepoint_world[0] + bound {
            return false;
        }
    
        if collider.basepoint_world[0] - bound > self.max.x {
            return false;
        }
    
        if self.min.y > collider.basepoint_world[1] + bound {
            return false;
        }
    
        if collider.basepoint_world[1] - bound > self.max.y {
            return false;
        }
    
        if self.min.z > collider.basepoint_world[2] + bound {
            return false;
        }
    
        if collider.basepoint_world[2] - bound > self.max.z {
            return false;
        }
        return true;
    }
}
use terramath::VectorMath;

use crate::collider::Collider;
use crate::math2::{Vec3, Vec3wgslF32, Vec4};
use crate::vertices::{VertexKind, Vertices};

pub struct BoundingBox {
    pub has_bounding: bool,
    pub min: [f32; 3],
    pub max: [f32; 3],
    pub min_original: [f32; 3],
    pub max_original: [f32; 3],
    pub vectors_original_simd: [Vec3<Vec4<f32>>; 2],
    pub vectors_simd: [Vec3<[f32; 4]>; 2],
    pub dirty: bool,
    pub need_init: bool,
}

#[cfg(test)]
#[test]
fn test_bounding_box() {
    use crate::{
        engine::init_engine,
        mesh::{get_mesh_by_id_mut, Mesh, ENGINE},
        meshes::r#box::{create_box_vertices, BOX_INDICES},
        vertices::VertexKind,
        Geometry,
    };
    unsafe {
        init_engine();
        let engine2 = ENGINE.physic_engine_mut();
        let len = engine2.meshes.len();
        Mesh::new(0.0, 0.0, 0.0, 0, String::from("box"));
        let m = &mut engine2.meshes[len];
        let mut geometry = Geometry::new(true, false, false, false, "bounding box".to_string());
        let vertices = VertexKind::PositionAndNormal(create_box_vertices());
        geometry.set_vertices(vertices, 8);
        geometry.indices = BOX_INDICES.to_vec();
        m.geometry = Some(Box::new(geometry));

        m.scaling[0] = 500.0;
        m.scaling[1] = 500.0;
        m.scaling[2] = 500.0;
        m.set_translation(123.0, 1000.0, 123.0);
        m.rotation.i = (1.1f32).sin();
        m.rotation.j = 0.0;
        m.rotation.k = 0.0;
        m.rotation.w = (1.1f32).cos();
        let m2 = get_mesh_by_id_mut(m.id);

        let geo = m.get_geometry_mut();

        geo.update_bounding_box(m2.get_transformation());

        assert_eq!(geo.bounding_box.min[0], -377.0);
        assert_eq!(geo.bounding_box.min[1], 301.50122);
        assert_eq!(geo.bounding_box.min[2], -575.4988);

        assert_eq!(geo.bounding_box.max[0], 623.0);
        assert_eq!(geo.bounding_box.max[1], 1698.498779296875);
        assert_eq!(geo.bounding_box.max[2], 821.4988);
    }
}

impl BoundingBox {
    pub fn new(has_bounding: bool) -> Self {
        BoundingBox {
            has_bounding,
            min: [0.0, 0.0, 0.0],
            max: [0.0, 0.0, 0.0],
            min_original: [0.0, 0.0, 0.0],
            max_original: [0.0, 0.0, 0.0],
            vectors_original_simd: [Vec3 {
                x: Vec4 {
                    x: 0.0,
                    y: 0.0,
                    z: 0.0,
                    w: 0.0,
                },
                y: Vec4 {
                    x: 0.0,
                    y: 0.0,
                    z: 0.0,
                    w: 0.0,
                },
                z: Vec4 {
                    x: 0.0,
                    y: 0.0,
                    z: 0.0,
                    w: 0.0,
                },
            }; 2],
            vectors_simd: [Vec3 {
                x: [0.0, 0.0, 0.0, 0.0],
                y: [0.0, 0.0, 0.0, 0.0],
                z: [0.0, 0.0, 0.0, 0.0],
            }; 2],
            dirty: true,
            need_init: true,
        }
    }
    pub fn init(&mut self, vertices: &Vertices<VertexKind>) {
        //TODO: use macro

        let mut positions: Box<dyn Iterator<Item = &Vec3wgslF32>> = vertices.get_positions();

        let first_vertice = positions.next().unwrap();
        self.min_original[0] = first_vertice.vec[0];
        self.min_original[1] = first_vertice.vec[1];
        self.min_original[2] = first_vertice.vec[2];
        self.max_original[0] = first_vertice.vec[0];
        self.max_original[1] = first_vertice.vec[1];
        self.max_original[2] = first_vertice.vec[2];

        for position in positions {
            if position.vec[0] < self.min_original[0] {
                self.min_original[0] = position.vec[0]
            } else if position.vec[0] > self.max_original[0] {
                self.max_original[0] = position.vec[0]
            }
            if position.vec[1] < self.min_original[1] {
                self.min_original[1] = position.vec[1]
            } else if position.vec[1] > self.max_original[1] {
                self.max_original[1] = position.vec[1]
            }
            if position.vec[2] < self.min_original[2] {
                self.min_original[2] = position.vec[2]
            } else if position.vec[2] > self.max_original[2] {
                self.max_original[2] = position.vec[2]
            }
        }

        self.vectors_original_simd[0] = Vec3 {
            x: Vec4 {
                // X-lane
                x: self.min_original[0],
                y: self.min_original[0],
                z: self.min_original[0],
                w: self.min_original[0],
            },
            y: Vec4 {
                // Y-lane
                x: self.min_original[1],
                y: self.min_original[1],
                z: self.max_original[1],
                w: self.max_original[1],
            },
            z: Vec4 {
                // Z-lane
                x: self.min_original[2],
                y: self.max_original[2],
                z: self.max_original[2],
                w: self.min_original[2],
            },
        };
        self.vectors_original_simd[1] = Vec3 {
            x: Vec4 {
                // X-lane
                x: self.max_original[0],
                y: self.max_original[0],
                z: self.max_original[0],
                w: self.max_original[0],
            },
            y: Vec4 {
                // Y-lane
                x: self.max_original[1],
                y: self.max_original[1],
                z: self.min_original[1],
                w: self.min_original[1],
            },
            z: Vec4 {
                // Z-lane
                x: self.min_original[2],
                y: self.max_original[2],
                z: self.max_original[2],
                w: self.min_original[2],
            },
        };

        self.need_init = false;
    }
    pub fn transform(&mut self, transformation: &Vec4<Vec4<f32>>) {
        for (vector_original_simd, vector_simd) in self
            .vectors_original_simd
            .iter()
            .zip(&mut self.vectors_simd.iter_mut())
        {
            // X
            let rx0 = vector_original_simd.x.x * transformation.x.x
                + vector_original_simd.y.x * transformation.y.x
                + vector_original_simd.z.x * transformation.z.x
                + transformation.w.x;
            let rx1 = vector_original_simd.x.y * transformation.x.x
                + vector_original_simd.y.y * transformation.y.x
                + vector_original_simd.z.y * transformation.z.x
                + transformation.w.x;
            let rx2 = vector_original_simd.x.z * transformation.x.x
                + vector_original_simd.y.z * transformation.y.x
                + vector_original_simd.z.z * transformation.z.x
                + transformation.w.x;
            let rx3 = vector_original_simd.x.w * transformation.x.x
                + vector_original_simd.y.w * transformation.y.x
                + vector_original_simd.z.w * transformation.z.x
                + transformation.w.x;
            // Y
            let ry0 = vector_original_simd.x.x * transformation.x.y
                + vector_original_simd.y.x * transformation.y.y
                + vector_original_simd.z.x * transformation.z.y
                + transformation.w.y;
            let ry1 = vector_original_simd.x.y * transformation.x.y
                + vector_original_simd.y.y * transformation.y.y
                + vector_original_simd.z.y * transformation.z.y
                + transformation.w.y;
            let ry2 = vector_original_simd.x.z * transformation.x.y
                + vector_original_simd.y.z * transformation.y.y
                + vector_original_simd.z.z * transformation.z.y
                + transformation.w.y;
            let ry3 = vector_original_simd.x.w * transformation.x.y
                + vector_original_simd.y.w * transformation.y.y
                + vector_original_simd.z.w * transformation.z.y
                + transformation.w.y;
            // Z
            let rz0 = vector_original_simd.x.x * transformation.x.z
                + vector_original_simd.y.x * transformation.y.z
                + vector_original_simd.z.x * transformation.z.z
                + transformation.w.z;
            let rz1 = vector_original_simd.x.y * transformation.x.z
                + vector_original_simd.y.y * transformation.y.z
                + vector_original_simd.z.y * transformation.z.z
                + transformation.w.z;
            let rz2 = vector_original_simd.x.z * transformation.x.z
                + vector_original_simd.y.z * transformation.y.z
                + vector_original_simd.z.z * transformation.z.z
                + transformation.w.z;
            let rz3 = vector_original_simd.x.w * transformation.x.z
                + vector_original_simd.y.w * transformation.y.z
                + vector_original_simd.z.w * transformation.z.z
                + transformation.w.z;
            // W
            let rw0 = 1.0
                / (vector_original_simd.x.x * transformation.x.w
                    + vector_original_simd.y.x * transformation.y.w
                    + vector_original_simd.z.x * transformation.z.w
                    + transformation.w.w);
            let rw1 = 1.0
                / (vector_original_simd.x.y * transformation.x.w
                    + vector_original_simd.y.y * transformation.y.w
                    + vector_original_simd.z.y * transformation.z.w
                    + transformation.w.w);
            let rw2 = 1.0
                / (vector_original_simd.x.z * transformation.x.w
                    + vector_original_simd.y.z * transformation.y.w
                    + vector_original_simd.z.z * transformation.z.w
                    + transformation.w.w);
            let rw3 = 1.0
                / (vector_original_simd.x.w * transformation.x.w
                    + vector_original_simd.y.w * transformation.y.w
                    + vector_original_simd.z.w * transformation.z.w
                    + transformation.w.w);

            //other.x = rx * rw;
            vector_simd.x[0] = rx0 * rw0;
            vector_simd.x[1] = rx1 * rw1;
            vector_simd.x[2] = rx2 * rw2;
            vector_simd.x[3] = rx3 * rw3;
            //other.y = ry * rw;
            vector_simd.y[0] = ry0 * rw0;
            vector_simd.y[1] = ry1 * rw1;
            vector_simd.y[2] = ry2 * rw2;
            vector_simd.y[3] = ry3 * rw3;
            //other.z = rz * rw;
            vector_simd.z[0] = rz0 * rw0;
            vector_simd.z[1] = rz1 * rw1;
            vector_simd.z[2] = rz2 * rw2;
            vector_simd.z[3] = rz3 * rw3;
        }
        self.min = [
            self.vectors_simd[0]
                .x
                .min(&self.vectors_simd[1].x)
                .get_min(),
            self.vectors_simd[0]
                .y
                .min(&self.vectors_simd[1].y)
                .get_min(),
            self.vectors_simd[0]
                .z
                .min(&self.vectors_simd[1].z)
                .get_min(),
        ];
        self.max = [
            self.vectors_simd[0]
                .x
                .max(&self.vectors_simd[1].x)
                .get_max(),
            self.vectors_simd[0]
                .y
                .max(&self.vectors_simd[1].y)
                .get_max(),
            self.vectors_simd[0]
                .z
                .max(&self.vectors_simd[1].z)
                .get_max(),
        ];

        self.dirty = false;
    }
    pub fn intersect_box_aa_sphere(&self, collider: &Collider, radius: f32) -> bool {
        let bound = collider.speed + radius;
        if self.min[0] > collider.basepoint_world[0] + bound {
            return false;
        }

        if collider.basepoint_world[0] - bound > self.max[0] {
            return false;
        }

        if self.min[1] > collider.basepoint_world[1] + bound {
            return false;
        }

        if collider.basepoint_world[1] - bound > self.max[1] {
            return false;
        }

        if self.min[2] > collider.basepoint_world[2] + bound {
            return false;
        }

        if collider.basepoint_world[2] - bound > self.max[2] {
            return false;
        }
        return true;
    }
}

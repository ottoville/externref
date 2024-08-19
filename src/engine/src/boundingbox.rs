use terramath::VectorMath;

use crate::collider::Collider;
use crate::math2::Vec3wgslF32;
use crate::vertices::Vertices;

pub struct BoundingBox {
    pub has_bounding: bool,
    pub min: [f32; 3],
    pub max: [f32; 3],
    pub min_original: [f32; 3],
    pub max_original: [f32; 3],
    pub vectors_original_simd: [[[f32; 4]; 3]; 2],
    pub vectors_simd: [[[f32; 4]; 3]; 2],
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
        geometry.scaling[0] = 500.0;
        geometry.scaling[1] = 500.0;
        geometry.scaling[2] = 500.0;

        m.geometry = Some(Box::new(geometry));

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
            vectors_original_simd: [[[0.0; 4], [0.0; 4], [0.0; 4]]; 2],
            vectors_simd: [[[0.0; 4], [0.0; 4], [0.0; 4]]; 2],
            dirty: true,
            need_init: true,
        }
    }
    pub fn init(&mut self, vertices: &Vertices) {
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

        self.vectors_original_simd[0] = [
            [
                // X-lane
                self.min_original[0];4
            ],
            [
                // Y-lane
                self.min_original[1],
                self.min_original[1],
                self.max_original[1],
                self.max_original[1],
            ],
            [
                // Z-lane
                self.min_original[2],
                self.max_original[2],
                self.max_original[2],
                self.min_original[2],
            ],
        ];
        self.vectors_original_simd[1] = [
            [
                // X-lane
                self.max_original[0];4
            ],
            [
                // Y-lane
                self.max_original[1],
                self.max_original[1],
                self.min_original[1],
                self.min_original[1],
            ],
            [
                // Z-lane
                self.min_original[2],
                self.max_original[2],
                self.max_original[2],
                self.min_original[2],
            ],
        ];

        self.need_init = false;
    }
    pub fn transform(&mut self, transformation: &[[f32; 4]; 4]) {
        for (vector_original_simd, vector_simd) in self
            .vectors_original_simd
            .iter()
            .zip(&mut self.vectors_simd.iter_mut())
        {
            // X
            let rx0 = vector_original_simd[0][0] * transformation[0][0]
                + vector_original_simd[1][0] * transformation[1][0]
                + vector_original_simd[2][0] * transformation[2][0]
                + transformation[3][0];
            let rx1 = vector_original_simd[0][1] * transformation[0][0]
                + vector_original_simd[1][1] * transformation[1][0]
                + vector_original_simd[2][1] * transformation[2][0]
                + transformation[3][0];
            let rx2 = vector_original_simd[0][2] * transformation[0][0]
                + vector_original_simd[1][2] * transformation[1][0]
                + vector_original_simd[2][2] * transformation[2][0]
                + transformation[3][0];
            let rx3 = vector_original_simd[0][3] * transformation[0][0]
                + vector_original_simd[1][3] * transformation[1][0]
                + vector_original_simd[2][3] * transformation[2][0]
                + transformation[3][0];
            // Y
            let ry0 = vector_original_simd[0][0] * transformation[0][1]
                + vector_original_simd[1][0] * transformation[1][1]
                + vector_original_simd[2][0] * transformation[2][1]
                + transformation[3][1];
            let ry1 = vector_original_simd[0][1] * transformation[0][1]
                + vector_original_simd[1][1] * transformation[1][1]
                + vector_original_simd[2][1] * transformation[2][1]
                + transformation[3][1];
            let ry2 = vector_original_simd[0][2] * transformation[0][1]
                + vector_original_simd[1][2] * transformation[1][1]
                + vector_original_simd[2][2] * transformation[2][1]
                + transformation[3][1];
            let ry3 = vector_original_simd[0][3] * transformation[0][1]
                + vector_original_simd[1][3] * transformation[1][1]
                + vector_original_simd[2][3] * transformation[2][1]
                + transformation[3][1];
            // Z
            let rz0 = vector_original_simd[0][0] * transformation[0][2]
                + vector_original_simd[1][0] * transformation[1][2]
                + vector_original_simd[2][0] * transformation[2][2]
                + transformation[3][2];
            let rz1 = vector_original_simd[0][1] * transformation[0][2]
                + vector_original_simd[1][1] * transformation[1][2]
                + vector_original_simd[2][1] * transformation[2][2]
                + transformation[3][2];
            let rz2 = vector_original_simd[0][2] * transformation[0][2]
                + vector_original_simd[1][2] * transformation[1][2]
                + vector_original_simd[2][2] * transformation[2][2]
                + transformation[3][2];
            let rz3 = vector_original_simd[0][3] * transformation[0][2]
                + vector_original_simd[1][3] * transformation[1][2]
                + vector_original_simd[2][3] * transformation[2][2]
                + transformation[3][2];
            // W
            let rw0 = 1.0
                / (vector_original_simd[0][0] * transformation[0][3]
                    + vector_original_simd[1][0] * transformation[1][3]
                    + vector_original_simd[2][0] * transformation[2][3]
                    + transformation[3][3]);
            let rw1 = 1.0
                / (vector_original_simd[0][1] * transformation[0][3]
                    + vector_original_simd[1][1] * transformation[1][3]
                    + vector_original_simd[2][1] * transformation[2][3]
                    + transformation[3][3]);
            let rw2 = 1.0
                / (vector_original_simd[0][2] * transformation[0][3]
                    + vector_original_simd[1][2] * transformation[1][3]
                    + vector_original_simd[2][2] * transformation[2][3]
                    + transformation[3][3]);
            let rw3 = 1.0
                / (vector_original_simd[0][3] * transformation[0][3]
                    + vector_original_simd[1][3] * transformation[1][3]
                    + vector_original_simd[2][3] * transformation[2][3]
                    + transformation[3][3]);

            //other.x = rx * rw;
            vector_simd[0][0] = rx0 * rw0;
            vector_simd[0][1] = rx1 * rw1;
            vector_simd[0][2] = rx2 * rw2;
            vector_simd[0][3] = rx3 * rw3;
            //other.y = ry * rw;
            vector_simd[1][0] = ry0 * rw0;
            vector_simd[1][1] = ry1 * rw1;
            vector_simd[1][2] = ry2 * rw2;
            vector_simd[1][3] = ry3 * rw3;
            //other.z = rz * rw;
            vector_simd[2][0] = rz0 * rw0;
            vector_simd[2][1] = rz1 * rw1;
            vector_simd[2][2] = rz2 * rw2;
            vector_simd[2][3] = rz3 * rw3;
        }
        self.min = [
            self.vectors_simd[0][0]
                .min(&self.vectors_simd[1][0])
                .get_min(),
            self.vectors_simd[0][1]
                .min(&self.vectors_simd[1][1])
                .get_min(),
            self.vectors_simd[0][2]
                .min(&self.vectors_simd[1][2])
                .get_min(),
        ];
        self.max = [
            self.vectors_simd[0][0]
                .max(&self.vectors_simd[1][0])
                .get_max(),
            self.vectors_simd[0][1]
                .max(&self.vectors_simd[1][1])
                .get_max(),
            self.vectors_simd[0][2]
                .max(&self.vectors_simd[1][2])
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

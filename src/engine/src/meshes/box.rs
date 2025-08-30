use terramath::Vec3wgslF32;

use crate::{
    allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex,
    mesh::{Mesh, ENGINE},
    vertices::{PositionAndNormal, VertexKind},
    Geometry,
};

pub fn create_box_vertices() -> Vec<PositionAndNormal> {
    vec![
        // Left face
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([-1.0, 0.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, 1.0, 1.0]),
            normal: Vec3wgslF32([-1.0, 0.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([-1.0, 0.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([-1.0, 0.0, 0.0]),
        },
        // Right face
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([1.0, 0.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, 1.0, 1.0]),
            normal: Vec3wgslF32([1.0, 0.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([1.0, 0.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([1.0, 0.0, 0.0]),
        },
        // Bottom face
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([0.0, -1.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([0.0, -1.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([0.0, -1.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([0.0, -1.0, 0.0]),
        },
        // Top face
        PositionAndNormal {
            position: Vec3wgslF32([1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 1.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, 1.0, 1.0]),
            normal: Vec3wgslF32([0.0, 1.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, 1.0, 1.0]),
            normal: Vec3wgslF32([0.0, 1.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 1.0, 0.0]),
        },
        // Back face
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 0.0, -1.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 0.0, -1.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 0.0, -1.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 0.0, -1.0]),
        },
        // Last face
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, 1.0, 1.0]),
            normal: Vec3wgslF32([0.0, 0.0, 1.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, 1.0, 1.0]),
            normal: Vec3wgslF32([0.0, 0.0, 1.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([0.0, 0.0, 1.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([0.0, 0.0, 1.0]),
        },
    ]
}

pub const BOX_INDICES: [usize; 36] = [
    0, 1, 2, 0, 2, 3, // front
    4, 5, 6, 4, 6, 7, // back
    8, 9, 10, 8, 10, 11, // top
    12, 13, 14, 12, 14, 15, // bottom
    16, 17, 18, 16, 18, 19, // right
    20, 21, 22, 20, 22, 23, // left
];
#[no_mangle]
pub unsafe extern "C" fn create_box_mesh(
    point_light: f32,
    directional_light: f32,
    scenes: f32,
    rigid_body: u32,
    camera_can_collide_to: bool,
) -> *mut ExplicitGenerationalFreeListIndex<Mesh> {
    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id: ExplicitGenerationalFreeListIndex<Mesh> = Mesh::new(
        point_light,
        directional_light,
        scenes,
        rigid_body,
        String::from("Box"),
        None,
        None,
        &mut meshes,
        camera_can_collide_to,
    );
    let geometry = create_box_geometry();
    let mesh = &mut meshes[&mesh_id];
    mesh.geometry = Some(Box::new(geometry));
    Box::into_raw(Box::new(mesh_id))
}
pub fn create_box_geometry() -> Geometry {
    let mut geometry = Geometry::new(true, false, false, "box_geometry".to_string());
    geometry.set_indices(BOX_INDICES.to_vec());
    geometry.set_vertices(VertexKind::PositionAndNormal(create_box_vertices()));
    return geometry;
}

#[cfg(test)]
#[test]
fn test_calculate_normals() {
    use crate::gpu::gpu::init_gpu;
    use externref::ExternRef;
    use externref::Resource;

    unsafe {
        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            true,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(4)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(4)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(4)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(4)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(4)),
        )
    };
    let mut geometry = Geometry::new(true, false, false, "box_geometry".to_string());
    geometry.set_indices(BOX_INDICES.to_vec());
    let vertices = create_box_vertices();
    let vertices2 = create_box_vertices();
    geometry.set_vertices(VertexKind::PositionAndNormal(vertices));
    geometry.calculate_normals();
    if let Some(verts) = geometry.vertices {
        if let VertexKind::PositionAndNormal(vertices) = verts {
            for n in 0..vertices.len() {
                assert_eq!(vertices[n].normal.0, vertices2[n].normal.0);
            }
        } else {
            panic!("Vertices are bad format")
        }
    }
}

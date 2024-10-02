use crate::{
    mesh::{get_mesh_by_id, get_mesh_by_id_mut, Mesh},
    vertices::{PositionAndNormal, VertexKind},
    Geometry,
};

#[no_mangle]
pub unsafe extern "C" fn create_debug_mesh_wireframe(
    target_mesh_id: usize,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> usize {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    let target = get_mesh_by_id(target_mesh_id);
    let mesh_id = Mesh::new(
        0.0,
        0.0,
        1.0,
        0,
        label,
        None,
        Some(target.mesh_property.clone()),
    );
    let mesh = get_mesh_by_id_mut(mesh_id);
    let mut geometry = Geometry::new(
        false,
        false,
        false,
        false,
        String::from("debugmesh_geometry_wireframe"),
    );
    let target_indices = &target.get_geometry().indices;
    let mut indices: Vec<usize> = vec![0; target_indices.indices.len() * 2];

    for (i, target_triangle) in target_indices.indices.chunks_exact(3).enumerate() {
        indices[i * 6] = target_triangle[0];
        indices[i * 6 + 1] = target_triangle[1];
        indices[i * 6 + 2] = target_triangle[1];
        indices[i * 6 + 3] = target_triangle[2];
        indices[i * 6 + 4] = target_triangle[2];
        indices[i * 6 + 5] = target_triangle[0];
    }
    geometry.set_indices(indices);
    mesh.geometry = Some(Box::new(geometry));
    return mesh_id;
}

#[no_mangle]
pub unsafe extern "C" fn create_debug_mesh_normals(
    target_mesh_id: usize,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> usize {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    let target = get_mesh_by_id(target_mesh_id);
    let mesh_id = Mesh::new(
        0.0,
        0.0,
        1.0,
        0,
        label,
        None,
        Some(target.mesh_property.clone()),
    );
    let mesh = get_mesh_by_id_mut(mesh_id);

    let mut geometry = Geometry::new(
        false,
        false,
        false,
        false,
        String::from("debugmesh_geometry_normals"),
    );
    let target_vertices = &target.get_geometry().vertices;
    let mut vertices: Vec<PositionAndNormal> = Vec::with_capacity(target_vertices.length() * 2);
    match &target_vertices {
        VertexKind::PositionAndNormalAndUV(vector) => {
            for position in vector {
                let pos = PositionAndNormal {
                    position: position.position.clone(),
                    normal: position.normal.clone(),
                };
                vertices.push(pos.clone());
                vertices.push(pos.clone());
            }
        }
        VertexKind::PositionAndNormal(vector) => {
            for position in vector {
                let pos = PositionAndNormal {
                    position: position.position.clone(),
                    normal: position.normal.clone(),
                };
                vertices.push(pos.clone());
                vertices.push(pos.clone());
            }
        }
        VertexKind::PositionAndNormalAndColor(vector) => {
            for position in vector {
                let pos = PositionAndNormal {
                    position: position.position.clone(),
                    normal: position.normal.clone(),
                };
                vertices.push(pos.clone());
                vertices.push(pos.clone());
            }
        }
        _ => panic!("Vertices has no normals"),
    };
    geometry.set_vertices(VertexKind::PositionAndNormal(vertices));
    mesh.geometry = Some(Box::new(geometry));
    return mesh_id;
}

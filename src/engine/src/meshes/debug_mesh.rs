use crate::{
    mesh::{Mesh, ENGINE},
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
    let meshes= ENGINE.meshes.lock().unwrap();

    let target = &meshes[target_mesh_id];

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

    let mesh_id = Mesh::new(
        0.0,
        0.0,
        1.0,
        0,
        label,
        None,
        Some(target.mesh_property.clone()),
        meshes
    );
    let mesh = &mut ENGINE.meshes.lock().unwrap()[mesh_id];
    let mut geometry = Geometry::new(
        false,
        false,
        false,
        false,
        String::from("debugmesh_geometry_wireframe"),
    );
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
    let meshes= ENGINE.meshes.lock().unwrap();
    let target = &meshes[target_mesh_id];

    let target_vertices = &target.get_geometry().vertices;
    let positions_count = target_vertices.length() * 2;
    let mesh_id = Mesh::new(
        0.0,
        0.0,
        1.0,
        0,
        label,
        None,
        Some(target.mesh_property.clone()),
        meshes
    );
    let mut meshes= ENGINE.meshes.lock().unwrap();

    let mesh = &mut meshes[mesh_id];

    mesh.positions_count = Some(positions_count);
    let geometry = Geometry::new(
        false,
        false,
        false,
        false,
        String::from("debugmesh_geometry_normals"),
    );
    mesh.geometry = Some(Box::new(geometry));
    return mesh_id;
}

use crate::{
    mesh::{get_mesh_by_id, get_mesh_by_id_mut, Mesh},
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
    let mut indices: Vec<usize> = vec![0; target_indices.len() * 2];

    for (i, target_triangle) in target_indices.chunks_exact(3).enumerate() {
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
pub unsafe extern "C" fn create_debug_mesh(
    target_mesh_id: usize,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> usize {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    let target = get_mesh_by_id(target_mesh_id);
    Mesh::new(
        0.0,
        0.0,
        1.0,
        0,
        label,
        None,
        Some(target.mesh_property.clone()),
    )
}

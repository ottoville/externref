use crate::mesh::{get_mesh_by_id, Mesh};

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

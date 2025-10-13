use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;

use crate::mesh::{Mesh, ENGINE};

#[no_mangle]
pub unsafe extern "C" fn create_terraintool_mesh(
) -> *mut ExplicitGenerationalFreeListIndex<fn() -> Mesh> {
    let label = String::from("TerrainTool");
    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id = Mesh::new(0.0, 0.0, 1.0, 0, label, None, None, &mut meshes, false);
    Box::into_raw(Box::new(mesh_id))
}

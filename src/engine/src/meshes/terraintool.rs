use std::sync::atomic::AtomicU32;

use crate::{
    allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex,
    mesh::{Mesh, ENGINE},
};

#[no_mangle]
pub unsafe extern "C" fn create_terraintool_mesh() -> *mut ExplicitGenerationalFreeListIndex<Mesh> {
    let label = String::from("TerrainTool");
    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id: ExplicitGenerationalFreeListIndex<Mesh> =
        Mesh::new(0.0, 0.0, 1.0, 0, label, None, None, &mut meshes, false);
    Box::into_raw(Box::new(mesh_id))
}

use std::sync::atomic::AtomicU32;

use crate::{
    allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex,
    mesh::{Mesh, ENGINE},
};
static ID: AtomicU32 = AtomicU32::new(0);

#[no_mangle]
pub unsafe extern "C" fn create_plants_mesh() -> *mut ExplicitGenerationalFreeListIndex<Mesh> {
    let mut label = String::from("Plants");
    label.push_str(
        &ID.fetch_add(1, std::sync::atomic::Ordering::Release)
            .to_string(),
    );
    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id: ExplicitGenerationalFreeListIndex<Mesh> =
        Mesh::new(0.0, 0.0, 1.0, 0, label, None, None, &mut meshes, false);
    Box::into_raw(Box::new(mesh_id))
}

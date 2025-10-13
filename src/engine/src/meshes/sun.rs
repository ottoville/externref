use crate::mesh::{Mesh, ENGINE};
use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;

#[no_mangle]
pub unsafe extern "C" fn create_sun_mesh(
    scenes: f32,
) -> *mut ExplicitGenerationalFreeListIndex<fn() -> Mesh> {
    let label = String::from("Sun");
    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id = Mesh::new(0.0, 1.0, scenes, 0, label, None, None, &mut meshes, false);
    Box::into_raw(Box::new(mesh_id))
}

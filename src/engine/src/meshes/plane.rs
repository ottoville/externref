use crate::{
    allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex,
    mesh::{Mesh, ENGINE}, meshes::quad_mesh::create_tiled_mesh_geometry,
};

#[no_mangle]
pub unsafe extern "C" fn create_plane_mesh() -> *mut ExplicitGenerationalFreeListIndex<Mesh> {
    let label = String::from("Plane");
    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id: ExplicitGenerationalFreeListIndex<Mesh> = Mesh::new(
        0.0,
        0.0,
        1.0,
        0,
        label,
        None,
        None,
        &mut meshes,
        false,
    );
    let geometry = create_tiled_mesh_geometry(100, 100, false);
    let mesh = &mut meshes[&mesh_id];
    mesh.geometry = Some(Box::from_raw(geometry));
    Box::into_raw(Box::new(mesh_id))
}

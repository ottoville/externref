use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;

use crate::{
    mesh::{Mesh, ENGINE},
    meshes::quad_mesh::create_tiled_mesh,
    vertices::VertexKind,
    Geometry,
};

#[no_mangle]
pub unsafe extern "C" fn create_plane_mesh() -> *mut ExplicitGenerationalFreeListIndex<Mesh> {
    let label = String::from("Plane");
    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id: ExplicitGenerationalFreeListIndex<Mesh> =
        Mesh::new(0.0, 0.0, 1.0, 0, label, None, None, &mut meshes, false);
    let (positions, indices) = create_tiled_mesh(100, 100);
    let mut geometry = Geometry::new(false, false, false, "plane_mesh_geometry".to_string());
    geometry.set_indices(indices.to_vec());
    geometry.set_vertices(VertexKind::PositionAndNormalAndUV(positions));

    let mesh = &mut meshes[&mesh_id];
    mesh.geometry = Some(Box::new(geometry));
    Box::into_raw(Box::new(mesh_id))
}

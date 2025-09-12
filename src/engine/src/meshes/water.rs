use crate::{
    mesh::{Mesh, ENGINE},
    vertices::{Position, VertexKind},
    Geometry,
};
use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;

#[no_mangle]
pub unsafe extern "C" fn create_water_mesh(
    scenes: f32,
) -> *mut ExplicitGenerationalFreeListIndex<Mesh> {
    let label = String::from("Water");

    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id: ExplicitGenerationalFreeListIndex<Mesh> =
        Mesh::new(0.0, 0.0, scenes, 0, label, None, None, &mut meshes, false);
    let geometry = create_water_geometry();
    let mesh = &mut meshes[&mesh_id];
    mesh.geometry = Some(Box::new(geometry));
    Box::into_raw(Box::new(mesh_id))
}
pub fn create_water_geometry() -> Geometry {
    let vertices: Vec<Position> = vec![
        Position::new([-50000.0, 3.0, -50000.0]),
        Position::new([50000.0, 3.0, -50000.0]),
        Position::new([-50000.0, 3.0, 50000.0]),
        Position::new([50000.0, 3.0, 50000.0]),
    ];
    let mut geometry = Geometry::new(false, false, true, "water".to_string());
    geometry.set_vertices(VertexKind::Position(vertices));
    geometry
}

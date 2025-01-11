use externref::{externref, Resource};
use crate::{
    mesh::{JSMesh, Mesh, ENGINE},
    meshes::r#box::create_box_geometry,
};

#[externref]
#[no_mangle]
pub unsafe extern "C" fn set_mesh_externref(mesh_id: usize, externref: Resource<JSMesh>) {
    ENGINE
        .engine2
        .lock()
        .unwrap()
        .find_mesh_by_id_mut(mesh_id)
        .externref = Some(externref);
}

#[externref]
#[no_mangle]
pub unsafe extern "C" fn new_character_mesh(
    scenes: f32,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> usize {
    let geometry = create_box_geometry();
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    let mesh_id = Mesh::new(0.0, 0.0, scenes, 0, label, None, None);
    let mut engine = ENGINE.engine2.lock().unwrap();
    let mesh = engine.find_mesh_by_id_mut(mesh_id);
    mesh.geometry = Some(Box::from_raw(geometry));
    {
        let mut mesh_property = mesh.mesh_property.lock().unwrap();
        mesh_property.update_color(0.0, 0.9, 1.0, 0.0);
    }
    return mesh_id;
}

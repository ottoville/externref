use crate::engine::Engine2;
use std::sync::atomic::Ordering;
use std::sync::MutexGuard;

use crate::{
    mesh::{JSMesh, Mesh, ENGINE},
    meshes::r#box::create_box_geometry,
};
use externref::{externref, Resource};

#[externref]
#[no_mangle]
pub unsafe extern "C" fn set_mesh_externref(mesh_id: usize, externref: Resource<JSMesh>) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[mesh_id];

    mesh.externref = Some(externref);
}
#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub unsafe extern "C" fn move_character(
    dt: f32,
    x: f32,
    y: f32,
    z: f32,
) {
    ENGINE.engine2.lock().unwrap().move_character(dt, x, y, z);
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
    let mesh_id = Mesh::new(0.0, 0.0, scenes, 0, label, None, None, ENGINE.meshes.lock().unwrap());
    ENGINE.character_mesh_id.store(mesh_id, Ordering::Relaxed);
    let mesh = &mut ENGINE.meshes.lock().unwrap()[mesh_id];
    mesh.geometry = Some(Box::from_raw(geometry));
    {
        let mut mesh_property = mesh.mesh_property.lock().unwrap();
        mesh_property.update_color(0.0, 0.9, 1.0, 0.0);
    }
    return mesh_id;
}

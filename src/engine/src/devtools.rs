use std::sync::{LazyLock, RwLock};

use crate::mesh::ENGINE;

#[no_mangle]
pub unsafe extern "C" fn devtools_pointer() -> *const f32 {
    DEVTOOLS.read().unwrap().euler_angles.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn get_directional_lights_count() -> usize {
    match ENGINE
        .gpu
        .lock()
        .unwrap()
        .as_ref()
        .unwrap()
        .directional_lights
        .lights
        .first()
    {
        Some(len) => len.0,
        None => 0,
    }
}
#[no_mangle]
pub unsafe extern "C" fn get_point_lights_count() -> usize {
    match ENGINE
        .gpu
        .lock()
        .unwrap()
        .as_ref()
        .unwrap()
        .point_lights
        .lights
        .first()
    {
        Some(len) => len.0,
        None => 0,
    }
}
#[no_mangle]
pub extern "C" fn get_mesh_directional_light(mesh_id: usize) -> f32 {
    let meshes = &ENGINE.meshes.lock().unwrap();
    let mesh = &meshes[mesh_id];
    let mesh_property = mesh.mesh_property.lock().unwrap();
    mesh_property.gpu_memory.directional_light
}
#[no_mangle]
pub extern "C" fn get_mesh_point_light(mesh_id: usize) -> f32 {
    let meshes = &ENGINE.meshes.lock().unwrap();
    let mesh = &meshes[mesh_id];
    let mesh_property = mesh.mesh_property.lock().unwrap();

    mesh_property.gpu_memory.point_light_squared
}
#[no_mangle]
pub extern "C" fn set_mesh_directional_light(mesh_id: usize, light: f32) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[mesh_id];
    let mut mesh_property = mesh.mesh_property.lock().unwrap();

    mesh_property.set_directional_light(light);
}
#[no_mangle]
pub extern "C" fn set_mesh_point_light(mesh_id: usize, light: f32) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[mesh_id];
    let mut mesh_property = mesh.mesh_property.lock().unwrap();

    mesh_property.set_point_light(light);
}
pub struct DevTools {
    pub euler_angles: [f32; 3],
    pub translation: [f32; 3],
    pub scale: [f32; 3],
}

pub static DEVTOOLS: LazyLock<RwLock<DevTools>> = LazyLock::new(|| {
    return RwLock::new(DevTools {
        euler_angles: [0.0; 3],
        translation: [0.0; 3],
        scale: [0.0; 3],
    });
});

use std::sync::{LazyLock, RwLock};

use crate::mesh::ENGINE;

#[no_mangle]
pub unsafe extern "C" fn devtools_pointer() -> *const f32 {
    DEVTOOLS.read().unwrap().euler_angles.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn get_directional_lights_count() -> usize {
    match ENGINE.engine2.as_ref().unwrap().gpu.as_ref().unwrap().directional_lights.lights.first() {
        Some(len) => len.0,
        None => 0,
    }}
#[no_mangle]
pub unsafe extern "C" fn get_point_lights_count() -> usize {
    match ENGINE.engine2.as_ref().unwrap().gpu.as_ref().unwrap().point_lights.lights.first() {
        Some(len) => len.0,
        None => 0,
    }
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

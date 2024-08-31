use std::sync::{LazyLock, RwLock};

#[no_mangle]
pub unsafe extern "C" fn devtools_pointer() -> *const f32 {
    DEVTOOLS.read().unwrap().euler_angles.as_ptr()
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

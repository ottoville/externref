use externref::{externref, Resource};

use crate::{
    gpu::{
        command_encoder::{GPUCommandEncoder, JSCommandEncoder},
        compute_pass_encoder::JSBindGroup,
    },
    mesh::ENGINE,
    MULTIVALUE_USIZE,
};
#[no_mangle]
pub unsafe extern "C" fn get_cameras_count() -> usize {
    ENGINE.physic_engine_mut().cameras.len()
}

#[no_mangle]
#[externref]
pub unsafe extern "C" fn get_camera_externref(camera_id: usize) -> &'static Resource<JSCamera> {
    &ENGINE.physic_engine().cameras[camera_id].externref
}
#[no_mangle]
pub unsafe extern "C" fn get_camera_label(camera_id: usize) -> *const usize {
    let label = &ENGINE.physic_engine().cameras[camera_id].label;
    MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = label.len();
    MULTIVALUE_USIZE[2] = label.capacity();
    MULTIVALUE_USIZE.as_ptr()
}
pub struct JSCamera(());

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "camera")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn update_view(
        externref: &Resource<JSCamera>,
        command_encoder: &Resource<JSCommandEncoder>,
    ) -> bool;
    pub fn get_update_view_bindgroup(externref: &Resource<JSCamera>) -> Resource<JSBindGroup>;
}

#[externref]
#[no_mangle]
pub unsafe extern "C" fn add_camera(
    camera: Resource<JSCamera>,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> usize {
    let cameras = &mut ENGINE.physic_engine_mut().cameras;
    let id = cameras.len();
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);

    cameras.push(Camera {
        externref: camera,
        updated: false,
        label,
    });
    return id;
}
pub struct Camera {
    pub externref: Resource<JSCamera>,
    pub updated: bool,
    pub label: String,
}
impl Camera {
    pub fn update_view(&mut self, command_encoder: &GPUCommandEncoder) {
        #[cfg(feature = "webgpu")]
        unsafe { self.updated = update_view(&self.externref, &command_encoder.externref) }
    }
    #[cfg(feature = "webgpu")]
    pub fn get_update_view_bindgroup(&self) -> Resource<JSBindGroup> {
        unsafe { get_update_view_bindgroup(&self.externref) }
    }
    #[cfg(test)]
    pub fn get_update_view_bindgroup(&self) -> Resource<JSBindGroup> {
        use externref::ExternRef;
        unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)) }
    }

}

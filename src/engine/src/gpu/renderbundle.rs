use std::{
    cell::LazyCell,
    sync::{Arc, Mutex},
};

use externref::{externref, Resource};

use crate::{
    allocators::explicit_generational_freelist::ExplicitGenerationalFreeList,
    cameras::{camera::Camera, camera_group::CameraGroup},
    MULTIVALUE_USIZE,
};

use super::{
    bindgroup::{BindGroup, BindGroupResources},
    binding_commands::BindingCommands,
    gpu::JSDevice,
};

pub struct JSRenderBundleEncoder(());
pub struct JSFunction(());
pub struct JSRenderBundleDescriptor(());
pub struct JSRenderBundle(());

#[cfg(test)]
unsafe fn create_renderbundle_encoder(
    _device: &Resource<JSDevice>,
    _descriptor: &Resource<JSRenderBundleDescriptor>,
    _label: *const usize,
) -> Resource<JSRenderBundleEncoder> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(test)]
unsafe fn do_record(
    _record: &Resource<JSFunction>,
    _encoder: &Resource<JSRenderBundleEncoder>,
    _gpu_buffer_externref: usize,
    _bind_group_position: *const Arc<BindGroup>,
    _bindgroup_start_index: u32,
) {
}
#[cfg(test)]
fn finish(
    _encoder: &Resource<JSRenderBundleEncoder>,
    _label: *const usize,
) -> Resource<JSRenderBundle> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "renderbundleencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn create_renderbundle_encoder(
        device: &Resource<JSDevice>,
        descriptor: &Resource<JSRenderBundleDescriptor>,
        label: *const usize,
    ) -> Resource<JSRenderBundleEncoder>;
    fn finish(
        //TODO: take ownership of encoder
        encoder: &Resource<JSRenderBundleEncoder>,
        label: *const usize,
    ) -> Resource<JSRenderBundle>;
    fn do_record(
        record: &Resource<JSFunction>,
        encoder: &Resource<JSRenderBundleEncoder>,
        gpu_buffer_externref: usize,
        bind_group_position: *const Arc<BindGroup>,
        bindgroup_start_index: u32,
    );
}
pub fn get_camera_by_id(cameras: &ExplicitGenerationalFreeList<Camera>, camera_id: usize) -> &Camera {
    for camera in cameras.iter() {
        if camera.id == camera_id {
            return camera;
        } else {
            if let Some(child_camera) = camera.find_child(camera_id) {
                return child_camera;
            }
        }
    }
    panic!("Camera not found");
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn renderbundle_set_bindgroup(
    renderbundle: *mut RenderBundleEncoder,
    index: u32,
    bindgroup: *const Arc<BindGroup>,
    device: &Resource<JSDevice>,
) {
    (*renderbundle).set_bindgroup(&*device, index, &(*bindgroup), &[]);
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn renderbundle_set_bindgroup_1(
    renderbundle: *mut RenderBundleEncoder,
    index: u32,
    bindgroup: *const Arc<BindGroup>,
    device: &Resource<JSDevice>,
    dynamic_offset: u32,
) {
    (*renderbundle).set_bindgroup(&*device, index, &(*bindgroup), &[dynamic_offset]);
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn renderbundle_set_bindgroup_2(
    renderbundle: *mut RenderBundleEncoder,
    index: u32,
    bindgroup: *const Arc<BindGroup>,
    device: &Resource<JSDevice>,
    dynamic_offset1: u32,
    dynamic_offset2: u32,
) {
    (*renderbundle).set_bindgroup(
        &*device,
        index,
        &(*bindgroup),
        &[dynamic_offset1, dynamic_offset2],
    );
}
#[no_mangle]
pub unsafe extern "C" fn renderbundle_make_dirty(renderbundle: *mut RenderBundleEncoder) {
    (*renderbundle).make_dirty();
}
pub struct RenderBundleEncoder {
    pub externref: Arc<Resource<JSRenderBundleEncoder>>,
    pub renderbundle: Arc<Mutex<Option<RenderBundle>>>,
    descriptor: Resource<JSRenderBundleDescriptor>,
    pub bindgroups: Vec<Arc<BindGroupResources>>,
    label: String,
    record: Resource<JSFunction>,
}
pub struct RenderBundle {
    pub bindgroups: Vec<Arc<BindGroupResources>>,
    pub externref: Resource<JSRenderBundle>,
}
thread_local! {
    static FINISH_LABEL:LazyCell<String> = const { LazyCell::new(||String::from("finish_record_renderbundle")) };
}
impl RenderBundleEncoder {
    pub fn new(
        label: String,
        device: &Resource<JSDevice>,
        descriptor: Resource<JSRenderBundleDescriptor>,
        record: Resource<JSFunction>,
    ) -> Self {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();
        }
        let externref = unsafe {
            Arc::new(create_renderbundle_encoder(
                &device,
                &descriptor,
                MULTIVALUE_USIZE.as_ptr(),
            ))
        };
        RenderBundleEncoder {
            externref,
            renderbundle: Arc::new(Mutex::new(None)),
            descriptor,
            bindgroups: Vec::new(),
            label,
            record,
        }
    }
    pub fn record_renderbundle<F>(
        &mut self,
        cameragroups: &Vec<CameraGroup>,
        device: &Resource<JSDevice>,
        cameras: &ExplicitGenerationalFreeList<Camera>,
        gpu_buffer: usize,
        bind_group_position: &Arc<BindGroup>,
        cb: F,
    ) where
        F: FnOnce(&RenderBundle),
    {
        {
            let renderbundle_m = self.renderbundle.lock();
            if let Some(renderbundle) = renderbundle_m.as_ref().unwrap().as_ref() {
                cb(renderbundle);
                return;
            };
        };
        // There is possible race condition because lock to renderbundle is not hold between check and set
        if cameragroups.len() > 0 {
            for camera_group in cameragroups {
                if let Some(bind_group) = &camera_group.bind_group {
                    self.set_bindgroup(device, 0, bind_group, &[]);
                }
                for camera_id in &camera_group.cameras {
                    let camera = get_camera_by_id(cameras, *camera_id);
                    self.set_bindgroup(device, 1, &camera.uniform_bindgroup, &[]);
                    unsafe {
                        do_record(
                            &self.record,
                            &*self.externref,
                            gpu_buffer,
                            bind_group_position,
                            2,
                        );
                    }
                }
            }
        } else {
            // Draw UI
            unsafe {
                do_record(
                    &self.record,
                    &*self.externref,
                    gpu_buffer,
                    bind_group_position,
                    0,
                );
            }
        }
        unsafe {
            FINISH_LABEL.with(|label| {
                MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
                MULTIVALUE_USIZE[1] = label.len();
                MULTIVALUE_USIZE[2] = label.capacity();
            });
        }

        let externref = unsafe { finish(&*self.externref, MULTIVALUE_USIZE.as_ptr()) };
        let renderbundle = RenderBundle {
            bindgroups: Vec::from_iter(self.bindgroups.drain(..)),
            externref,
        };
        cb(&renderbundle);
        let _ = self.renderbundle.lock().unwrap().insert(renderbundle);
        // Create bundeEncoder ready for next time it is called
        // As writing of this code, resetting renderBundleEncoder is still TODO in webgpu specs.
        unsafe {
            self.externref = Arc::new(create_renderbundle_encoder(
                device,
                &self.descriptor,
                &self.label as *const String as *const usize,
            ));
        }
    }
    // Only from legacy JS objects
    fn make_dirty(&mut self) {
        self.renderbundle.lock().unwrap().take();
    }
}
impl BindingCommands<JSRenderBundleEncoder> for RenderBundleEncoder {
    fn externref(&self) -> &Resource<JSRenderBundleEncoder> {
        &self.externref
    }

    fn after_set_bindgroup(&mut self, bindgroup: &BindGroup) {
        bindgroup
            .renderbundles
            .lock()
            .unwrap()
            .push(Arc::downgrade(&self.renderbundle));
    }

    fn bindgroups(&mut self) -> &mut Vec<Arc<BindGroupResources>> {
        &mut self.bindgroups
    }
}

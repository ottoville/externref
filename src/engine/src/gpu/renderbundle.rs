use std::{
    ptr,
    sync::{Arc, Mutex},
};

use externref::{externref, Resource};

use crate::{mesh::ENGINE, MULTIVALUE_USIZE};

use super::{
    bindgroup::BindGroup,
    binding_commands::BindingCommands,
    gpu::{JSDevice, GPU},
};

pub struct JSRenderBundleEncoder(());
pub struct JSFunction(());
pub struct JSRenderBundleDescriptor(());
pub struct JSRenderBundle(());

#[cfg(test)]
fn create_renderbundle_encoder(
    _device: &Resource<JSDevice>,
    _descriptor: &Resource<JSRenderBundleDescriptor>,
) -> Resource<JSRenderBundleEncoder> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(test)]
fn do_record(_record: &Resource<JSFunction>, _encoder: &Resource<JSRenderBundleEncoder>) {}
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
    ) -> Resource<JSRenderBundleEncoder>;
    fn finish(
        //TODO: take ownership of encoder
        encoder: &Resource<JSRenderBundleEncoder>,
        label: *const usize,
    ) -> Resource<JSRenderBundle>;
    fn do_record(record: &Resource<JSFunction>, encoder: &Resource<JSRenderBundleEncoder>);
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn new_renderbundle(
    descriptor: Resource<JSRenderBundleDescriptor>,
) -> *mut RenderBundleEncoder {
    let gpuopt = ENGINE.gpu.lock().unwrap();
    let externref = Arc::new(create_renderbundle_encoder(
        &gpuopt.as_ref().unwrap().device,
        &descriptor,
    ));
    Box::into_raw(Box::new(RenderBundleEncoder {
        externref,
        renderbundle: Arc::new(Mutex::new(None)),
        descriptor,
    }))
}
#[no_mangle]
pub unsafe extern "C" fn renderbundle_set_bindgroup(
    renderbundle: *mut RenderBundleEncoder,
    index: u32,
    gpu_lock: *mut &'static mut GPU,
    camera_id: u32,
) {
    let camera = (*gpu_lock).get_camera_by_id(camera_id);
    (*renderbundle).set_bindgroup(
        &(*gpu_lock).device,
        index,
        &mut *camera.uniform_bindgroup.lock().unwrap(),
    );
}
#[no_mangle]
pub unsafe extern "C" fn renderbundle_make_dirty(renderbundle: *mut RenderBundleEncoder) {
    (*renderbundle).make_dirty();
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn record_renderbundle(
    renderbundle: *mut RenderBundleEncoder,
    gpu_lock: *mut &'static mut GPU,
    record: Resource<JSFunction>,
) -> usize {
    let rb = (*renderbundle).record_renderbundle(gpu_lock, record);
    let m = rb.lock();
    let externref = m.as_ref().unwrap().as_ref().unwrap();
    ptr::read(externref as *const Resource<JSRenderBundle> as *const usize)
}
pub struct RenderBundleEncoder {
    pub externref: Arc<Resource<JSRenderBundleEncoder>>,
    renderbundle: Arc<Mutex<Option<Resource<JSRenderBundle>>>>,
    descriptor: Resource<JSRenderBundleDescriptor>,
}
impl RenderBundleEncoder {
    pub fn record_renderbundle(
        &mut self,
        gpu_lock: *mut &'static mut GPU,
        record: Resource<JSFunction>,
    ) -> Arc<Mutex<Option<Resource<JSRenderBundle>>>> {
        let mut renderbundle = self.renderbundle.lock().unwrap();
        if Option::is_none(&renderbundle) {
            let label = String::from("TODO");
            unsafe {
                do_record(&record, &*self.externref);
                MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
                MULTIVALUE_USIZE[1] = label.len();
                MULTIVALUE_USIZE[2] = label.capacity();

                let b = finish(&*self.externref, MULTIVALUE_USIZE.as_ptr());
                let _ = renderbundle.insert(b);
                // Create bundeEncoder ready for next time it is called
                // As writing of this code, resetting renderBundleEncoder is still TODO in webgpu specs.
                self.externref = Arc::new(create_renderbundle_encoder(
                    &(*gpu_lock).device,
                    &self.descriptor,
                ));
            }
        }
        return Arc::clone(&self.renderbundle);
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

    fn after_set_bindgroup(&mut self, bindgroup: &mut BindGroup) {
        bindgroup
            .renderbundles
            .push(Arc::downgrade(&self.renderbundle));
    }
}

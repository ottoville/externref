use std::{
    cell::{LazyCell, RefCell},
    mem::replace,
    rc::Rc,
    sync::Arc,
};

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeList;
use externref::{externref, Resource};
use webgpu::{
    bindgroup::{bindgroup::BindGroup, bindgroup_resources::BindGroupResources},
    binding_commands::BindingCommands,
    buffer::buffer::{BufferRef, GPUBuffer},
    device::JSDevice,
    externref_trait::HaveExternref,
    render_commands::RenderCommands,
    renderbundle::{JSFunction, JSRenderBundle, JSRenderBundleDescriptor, RenderBundle},
};

use crate::cameras::{
    camera::{get_camera_by_id, Camera},
    camera_group::CameraGroup,
};

#[no_mangle]
pub unsafe extern "C" fn renderbundle_make_dirty(renderbundle: *mut RenderBundleEncoder) {
    (*renderbundle).make_dirty();
}
type BindGroupType = *const Rc<BindGroup<1>>;
#[no_mangle]
#[externref]
pub unsafe extern "C" fn renderbundle_set_bindgroup(
    renderbundle: *mut RenderBundleEncoder,
    index: u32,
    bindgroup: BindGroupType,
    device: &Resource<JSDevice>,
) {
    (*renderbundle).set_bindgroup(device, index, &(*bindgroup), &[]);
}

#[no_mangle]
#[externref]
pub unsafe extern "C" fn renderbundle_set_bindgroup_1(
    renderbundle: *mut RenderBundleEncoder,
    index: u32,
    bindgroup: BindGroupType,
    device: &Resource<JSDevice>,
    dynamic_offset: u32,
) {
    (*renderbundle).set_bindgroup(device, index, &(*bindgroup), &[dynamic_offset]);
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn renderbundle_set_bindgroup_2(
    renderbundle: *mut RenderBundleEncoder,
    index: u32,
    bindgroup: BindGroupType,
    device: &Resource<JSDevice>,
    dynamic_offset1: u32,
    dynamic_offset2: u32,
) {
    (*renderbundle).set_bindgroup(
        device,
        index,
        &(*bindgroup),
        &[dynamic_offset1, dynamic_offset2],
    );
}

#[cfg(test)]
unsafe fn create_renderbundle_encoder_descriptor(
    _color_formats_ptr: usize,
    _color_formats_len: usize,
    _label_ptr: usize,
    _label_len: usize,
    _samplecount: u32,
    _depth_read_only: bool,
    _stencil_read_only: bool,
    _depth_stencil_format: i32,
) -> Resource<JSRenderBundleDescriptor> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(test)]
unsafe fn create_renderbundle_encoder(
    _device: &Resource<JSDevice>,
    _descriptor: &Resource<JSRenderBundleDescriptor>,
) -> Resource<JSRenderBundleEncoder> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(test)]
unsafe fn do_record(
    _record: &Resource<JSFunction>,
    _encoder: &Resource<JSRenderBundleEncoder>,
    _gpu_buffer_externref: usize,
    _bind_group_position: BindGroupType,
    _bindgroup_start_index: u32,
) {
}
#[cfg(test)]
unsafe fn finish(
    _encoder: &Resource<JSRenderBundleEncoder>,
    _label_ptr: usize,
    _label_len: usize,
) -> Resource<JSRenderBundle> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "renderbundleencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn create_renderbundle_encoder_descriptor(
        color_formats_ptr: usize,
        color_formats_len: usize,
        label_ptr: usize,
        label_len: usize,
        samplecount: u32,
        depth_read_only: bool,
        stencil_read_only: bool,
        depth_stencil_format: i32,
    ) -> Resource<JSRenderBundleDescriptor>;
    fn create_renderbundle_encoder(
        device: &Resource<JSDevice>,
        descriptor: &Resource<JSRenderBundleDescriptor>,
    ) -> Resource<JSRenderBundleEncoder>;
    fn finish(
        //TODO: take ownership of encoder
        encoder: &Resource<JSRenderBundleEncoder>,
        label_ptr: usize,
        label_len: usize,
    ) -> Resource<JSRenderBundle>;
    fn do_record(
        record: &Resource<JSFunction>,
        encoder: &Resource<JSRenderBundleEncoder>,
        gpu_buffer_externref: usize,
        bind_group_position: BindGroupType,
        bindgroup_start_index: u32,
    );
}
thread_local! {
    static FINISH_LABEL:LazyCell<String> = const { LazyCell::new(||String::from("finish_record_renderbundle")) };
}

pub struct JSRenderBundleEncoder(());

pub struct RenderBundleEncoder {
    pub externref: Arc<Resource<JSRenderBundleEncoder>>,
    pub renderbundle: Rc<RefCell<Option<RenderBundle>>>,
    descriptor: Resource<JSRenderBundleDescriptor>,
    pub bindgroups: Vec<Rc<BindGroupResources>>,
    pub buffers: Vec<Rc<BufferRef>>,
    record: Resource<JSFunction>,
}
impl RenderBundleEncoder {
    pub fn new(
        label: String,
        device: &Resource<JSDevice>,
        color_formats: &Vec<u32>,
        record: Resource<JSFunction>,
        samplecount: u32,
        depth_read_only: bool,
        stencil_read_only: bool,
        depth_stencil_format: Option<u32>,
    ) -> Self {
        let descriptor = unsafe {
            create_renderbundle_encoder_descriptor(
                color_formats.as_ptr() as usize,
                color_formats.len(),
                label.as_ptr() as usize,
                label.len(),
                samplecount,
                depth_read_only,
                stencil_read_only,
                match depth_stencil_format {
                    Some(format) => format as i32,
                    None => -1,
                },
            )
        };
        let externref = unsafe { Arc::new(create_renderbundle_encoder(&device, &descriptor)) };
        RenderBundleEncoder {
            externref,
            renderbundle: Rc::new(RefCell::new(None)),
            descriptor,
            bindgroups: Vec::new(),
            buffers: Vec::new(),
            record,
        }
    }
    pub fn record_renderbundle<F>(
        &mut self,
        cameragroups: &Vec<CameraGroup>,
        device: &Resource<JSDevice>,
        cameras: &ExplicitGenerationalFreeList<Camera>,
        gpu_buffer: usize,
        bind_group_position: &Rc<BindGroup<1>>,
        cb: F,
    ) where
        F: FnOnce(&RenderBundle),
    {
        {
            let renderbundle_m = self.renderbundle.borrow();
            if let Some(renderbundle) = renderbundle_m.as_ref() {
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
        let externref = unsafe {
            FINISH_LABEL
                .with(|label| finish(&*self.externref, label.as_ptr() as usize, label.len()))
        };

        let renderbundle = RenderBundle {
            // TODO: reuse allocation from previous renderbundle?
            bindgroups: replace(&mut self.bindgroups, Vec::new()),
            buffers: replace(&mut self.buffers, Vec::new()),
            externref,
        };
        cb(&renderbundle);
        let _ = self.renderbundle.borrow_mut().insert(renderbundle);
        // Create bundeEncoder ready for next time it is called
        // As writing of this code, resetting renderBundleEncoder is still TODO in webgpu specs.
        unsafe {
            self.externref = Arc::new(create_renderbundle_encoder(device, &self.descriptor));
        }
    }
    // Only from legacy JS objects
    fn make_dirty(&mut self) {
        self.renderbundle.borrow_mut().take();
    }
}
impl HaveExternref<JSRenderBundleEncoder> for RenderBundleEncoder {
    fn externref(&self) -> &Resource<JSRenderBundleEncoder> {
        &self.externref
    }
}
impl BindingCommands<JSRenderBundleEncoder> for RenderBundleEncoder {
    fn after_set_bindgroup<const N: usize>(&mut self, bindgroup: &BindGroup<N>) {
        bindgroup
            .renderbundles
            .borrow_mut()
            .push(Rc::downgrade(&self.renderbundle));
    }

    fn bindgroups(&mut self) -> &mut Vec<Rc<BindGroupResources>> {
        &mut self.bindgroups
    }
}
impl RenderCommands<JSRenderBundleEncoder> for RenderBundleEncoder {
    fn buffers(&mut self) -> &mut Vec<Rc<BufferRef>> {
        &mut self.buffers
    }

    fn after_set_buffer(&mut self, buffer: &mut GPUBuffer<false, false, false, false, true>) {
        buffer.renderbundles.push(Rc::downgrade(&self.renderbundle));
    }
}

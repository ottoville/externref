use std::{cell::Cell, sync::Arc};

use crate::{
    buffer::buffer::JSBuffer,
    color_attachment::color_attachment::JSRenderPassColorAttachment,
    command_buffer::{CommandBuffer, JSCommandBuffer},
    compute_pass_encoder::{ComputePassEncoder, JSComputePassEncoder},
    device::{create_gpu_command_encoder, JSDevice},
    renderpass::{
        render_pass_encoder::{JSRenderPassEncoder, RenderPassEncoder},
        renderpass_descriptor::JSRenderPassDescriptor,
    },
};
use externref::{externref, Resource};

use crate::{bindgroup::bindgroup_resources::BindGroupResources, buffer::buffer::GPUBuffer};

pub struct JSCommandEncoder(());

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn copy_buffer_to_buffer(
    _command_encoder: &Resource<JSCommandEncoder>,
    _source: &Resource<JSBuffer>,
    _destination: &Resource<JSBuffer>,
    _source_offset: usize,
    _destination_offset: usize,
    _copy_size: usize,
) {
}
type ColorAttachmentsPtr<'a> =
    *mut &'a mut dyn Iterator<Item = Resource<JSRenderPassColorAttachment>>;

#[cfg(not(target_arch = "wasm32"))]
unsafe fn begin_compute_pass(
    _command_encoder: &Resource<JSCommandEncoder>,
    _label_ptr: usize,
    _label_len: usize,
) -> Resource<JSComputePassEncoder> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn begin_render_pass(
    _command_encoder: &Resource<JSCommandEncoder>,
    _descriptor: &Resource<JSRenderPassDescriptor>,
    _label_ptr: usize,
    _label_len: usize,
    _views: ColorAttachmentsPtr,
) -> Resource<JSRenderPassEncoder> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn finish(
    _command_encoder: &Resource<JSCommandEncoder>,
    _label_ptr: usize,
    _label_len: usize,
) -> Resource<JSCommandBuffer> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "commandencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    // TODO share interface with renderbunde encoder
    fn finish(
        command_encoder: &Resource<JSCommandEncoder>,
        label_ptr: usize,
        label_len: usize,
    ) -> Resource<JSCommandBuffer>;
    fn begin_compute_pass(
        command_encoder: &Resource<JSCommandEncoder>,
        label_ptr: usize,
        label_len: usize,
    ) -> Resource<JSComputePassEncoder>;
    fn begin_render_pass(
        command_encoder: &Resource<JSCommandEncoder>,
        descriptor: &Resource<JSRenderPassDescriptor>,
        label_ptr: usize,
        label_len: usize,
        views: ColorAttachmentsPtr,
    ) -> Resource<JSRenderPassEncoder>;
    pub fn copy_buffer_to_buffer(
        command_encoder: &Resource<JSCommandEncoder>,
        source: &Resource<JSBuffer>,
        destination: &Resource<JSBuffer>,
        sourceOffset: usize,
        destinationOffset: usize,
        copySize: usize,
    );
}
thread_local! {
    static COLORATTACHMENT_EXTERNREF: Cell<Option<Resource<JSRenderPassColorAttachment>>> = const { Cell::new(None) };
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn iterate_colorattachments<'a>(
    iterator_ptr: ColorAttachmentsPtr,
) -> Option<&'a Resource<JSRenderPassColorAttachment>> {
    let next = (*iterator_ptr).next();
    if next.is_none() {
        drop(Box::from_raw(iterator_ptr));
    }
    COLORATTACHMENT_EXTERNREF.set(next);
    let value = COLORATTACHMENT_EXTERNREF.with(|n| {
        return n.as_ptr();
    });
    return (*value).as_ref();
}

pub struct GPUCommandEncoder {
    pub externref: Resource<JSCommandEncoder>,
    // Hold references to prevent buffer being CG't before command encoder has been executed
    pub buffers: Vec<Arc<Resource<JSBuffer>>>,
    pub bindgroups: Vec<Arc<BindGroupResources>>,
    label: String,
}
impl GPUCommandEncoder {
    pub fn new(device: &Resource<JSDevice>, label: String) -> GPUCommandEncoder {
        unsafe {
            let externref =
                create_gpu_command_encoder(device, label.as_ptr() as usize, label.len());
            return GPUCommandEncoder {
                externref,
                label,
                buffers: Vec::new(),
                bindgroups: Vec::new(),
            };
        }
    }
    pub fn finish(self, label: String) -> CommandBuffer {
        CommandBuffer {
            buffers: self.buffers,
            bindgroups: self.bindgroups,
            externref: unsafe { finish(&self.externref, label.as_ptr() as usize, label.len()) },
        }
    }
    pub fn begin_compute_pass(self, label: String) -> ComputePassEncoder {
        unsafe {
            let externref =
                begin_compute_pass(&self.externref, label.as_ptr() as usize, label.len());
            ComputePassEncoder {
                command_encoder: self,
                externref,
            }
        }
    }
    pub fn begin_render_pass<I: Iterator<Item = Resource<JSRenderPassColorAttachment>>>(
        self,
        label: &String,
        descriptor: &Resource<JSRenderPassDescriptor>,
        mut views: I,
    ) -> RenderPassEncoder {
        let b: Box<&mut dyn Iterator<Item = Resource<JSRenderPassColorAttachment>>> =
            Box::new(&mut views);

        unsafe {
            let externref = begin_render_pass(
                &self.externref,
                descriptor,
                label.as_ptr() as usize,
                label.len(),
                Box::into_raw(b),
            );
            RenderPassEncoder {
                command_encoder: self,
                externref,
            }
        }
    }
    pub fn take_externref(self) -> Resource<JSCommandEncoder> {
        self.externref
    }
    pub fn copy_buffer_to_buffer<
        const MAP_READ0: bool,
        const MAP_WRITE0: bool,
        const COPY_DST0: bool,
        const INDEX0: bool,
        const VERTEX0: bool,
        const UNIFORM0: bool,
        const STORAGE0: bool,
        const INDIRECT0: bool,
        const QUERY_RESOLVE0: bool,
        const MAP_READ1: bool,
        const MAP_WRITE1: bool,
        const COPY_SRC1: bool,
        const INDEX1: bool,
        const VERTEX1: bool,
        const UNIFORM1: bool,
        const STORAGE1: bool,
        const INDIRECT1: bool,
        const QUERY_RESOLVE1: bool,
    >(
        &mut self,
        source: &GPUBuffer<
            MAP_READ0,
            MAP_WRITE0,
            true,
            COPY_DST0,
            INDEX0,
            VERTEX0,
            UNIFORM0,
            STORAGE0,
            INDIRECT0,
            QUERY_RESOLVE0,
        >,
        destination: &GPUBuffer<
            MAP_READ1,
            MAP_WRITE1,
            COPY_SRC1,
            true,
            INDEX1,
            VERTEX1,
            UNIFORM1,
            STORAGE1,
            INDIRECT1,
            QUERY_RESOLVE1,
        >,
        source_offset: usize,
        destination_offset: usize,
        copy_size: usize,
    ) {
        self.buffers.push(source.externref.clone());
        self.buffers.push(destination.externref.clone());
        unsafe {
            copy_buffer_to_buffer(
                &self.externref,
                &source.externref,
                &destination.externref,
                source_offset,
                destination_offset,
                copy_size,
            )
        }
    }
}

use std::sync::Arc;

use externref::{externref, Resource};
use webgpu::device::JSDevice;

use crate::{
    gpu::{buffer::buffer::GPUBuffer, gpu::create_gpu_command_encoder},
    MULTIVALUE_USIZE,
};

use super::{
    bindgroup::BindGroupResources,
    buffer::buffer::JSBuffer,
    command_buffer::{CommandBuffer, JSCommandBuffer},
    compute_pass_encoder::{ComputePassEncoder, JSComputePassEncoder},
    render_pass_encoder::{JSRenderPassEncoder, RenderPassEncoder},
    renderpass::JSRenderPassDescriptor,
};

pub struct JSCommandEncoder(());

#[cfg(test)]
pub unsafe fn copy_buffer_to_buffer(
    _command_encoder: &Resource<JSCommandEncoder>,
    _source: &Resource<JSBuffer>,
    _destination: &Resource<JSBuffer>,
    _source_offset: usize,
    _destination_offset: usize,
    _copy_size: usize,
) {
}
#[cfg(test)]
unsafe fn begin_compute_pass(
    _command_encoder: &Resource<JSCommandEncoder>,
    _label: *const usize,
) -> Resource<JSComputePassEncoder> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(test)]
unsafe fn begin_render_pass(
    _command_encoder: &Resource<JSCommandEncoder>,
    _descriptor: &Resource<JSRenderPassDescriptor>,
    _label: *const usize,
) -> Resource<JSRenderPassEncoder> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(test)]
fn finish(
    _command_encoder: &Resource<JSCommandEncoder>,
    _label: *const usize,
) -> Resource<JSCommandBuffer> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "commandencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn finish(
        command_encoder: &Resource<JSCommandEncoder>,
        label: *const usize,
    ) -> Resource<JSCommandBuffer>;
    fn begin_compute_pass(
        command_encoder: &Resource<JSCommandEncoder>,
        label: *const usize,
    ) -> Resource<JSComputePassEncoder>;
    fn begin_render_pass(
        command_encoder: &Resource<JSCommandEncoder>,
        descriptor: &Resource<JSRenderPassDescriptor>,
        label: *const usize,
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

pub struct GPUCommandEncoder {
    pub externref: Resource<JSCommandEncoder>,
    // Hold references to prevent buffer being CG't before command encoder has been executed
    pub buffers: Vec<Arc<Resource<JSBuffer>>>,
    pub bindgroups: Vec<Arc<BindGroupResources>>,
    label: String,
    owned_by_js: bool,
}
impl GPUCommandEncoder {
    pub fn new(device: &Resource<JSDevice>, label: String) -> GPUCommandEncoder {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();

            let externref = create_gpu_command_encoder(device, MULTIVALUE_USIZE.as_ptr());
            return GPUCommandEncoder {
                externref,
                label,
                owned_by_js: false,
                buffers: Vec::new(),
                bindgroups: Vec::new(),
            };
        }
    }
    pub fn finish(self, label: String) -> CommandBuffer {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();
            CommandBuffer {
                buffers: self.buffers,
                bindgroups: self.bindgroups,
                externref: finish(&self.externref, MULTIVALUE_USIZE.as_ptr()),
            }
        }
    }
    pub fn begin_compute_pass(self, label: String) -> ComputePassEncoder {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();
            let externref = begin_compute_pass(&self.externref, MULTIVALUE_USIZE.as_ptr());
            ComputePassEncoder {
                command_encoder: self,
                externref,
            }
        }
    }
    pub fn begin_render_pass(
        self,
        label: &String,
        descriptor: &Resource<JSRenderPassDescriptor>,
    ) -> RenderPassEncoder {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();
            let externref =
                begin_render_pass(&self.externref, descriptor, MULTIVALUE_USIZE.as_ptr());
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

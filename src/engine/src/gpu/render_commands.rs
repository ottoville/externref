use std::num::NonZeroUsize;
use std::ptr;
use std::sync::Arc;

use crate::gpu::buffer::buffer::GPUBuffer;
use crate::gpu::buffer::buffer::JSBuffer;
use crate::gpu::externref_trait::HaveExternref;
use externref::externref;
use externref::Resource;
use logger::LoggerArray;

#[cfg(test)]
pub unsafe fn set_indexbuffer(
    _resource: usize,
    _buffer: &Resource<JSBuffer>,
    _index_format: u32,
    _offset: u32,
    _size: usize,
) {
}
#[cfg(test)]
pub unsafe fn draw_indexed(
    _resource: usize,
    _index_count: u32,
    _instance_count: u32,
    _first_index: u32,
    _base_vertex: i32,
    _first_instance: u32,
) {
}
#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "rendercommands")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn draw_indexed(
        resource: usize,
        index_count: u32,
        instance_count: u32,
        first_index: u32,
        base_vertex: i32,
        first_instance: u32,
    );
    pub fn set_indexbuffer(
        resource: usize,
        buffer: &Resource<JSBuffer>,
        index_format: u32,
        offset: u32,
        size: usize,
    );
}

pub trait RenderCommands<T>: HaveExternref<T> {
    fn buffers(&mut self) -> &mut Vec<Arc<Resource<JSBuffer>>>;
    fn after_set_buffer(&mut self, buffer: &mut GPUBuffer<false, false, false, false, true>);
    fn draw_indexed(
        &self,
        index_count: u32,
        instance_count: u32,
        first_index: u32,
        base_vertex: i32,
        first_instance: u32,
    ) {
        [
            "drawIndexed <add label here>",
            "index_count",
            &index_count.to_string(),
            "instance_count",
            &instance_count.to_string(),
            "first_index",
            &first_index.to_string(),
            "base_vertex",
            &base_vertex.to_string(),
            "first_instance",
            &first_instance.to_string(),
        ]
        .debug();

        let ptr = unsafe { ptr::read(self.externref() as *const Resource<T> as *const usize) };
        unsafe {
            draw_indexed(
                ptr,
                index_count,
                instance_count,
                first_index,
                base_vertex,
                first_instance,
            )
        };
    }
    fn set_indexbuffer(
        &mut self,
        buffer: &mut GPUBuffer<false, false, false, false, true>,
        index_format: u32,
        offset: u32,
        size: Option<NonZeroUsize>,
    ) {
        ["set indexBuffer", &buffer.label].debug();
        let ptr = unsafe { ptr::read(self.externref() as *const Resource<T> as *const usize) };
        let buffer_size = match size {
            Some(s) => s.get(),
            None => buffer.size,
        };
        unsafe { set_indexbuffer(ptr, &buffer.externref, index_format, offset, buffer_size) };
        self.buffers().push(buffer.externref.clone());
        self.after_set_buffer(buffer);
    }
}

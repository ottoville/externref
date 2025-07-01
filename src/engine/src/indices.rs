use externref::{externref, Resource};

use crate::{
    gpu::{
        buffer::{
            buffer::{GPUBuffer, JSBuffer},
            usages::INDEX_USAGE,
        },
        render_commands::RenderCommands,
        renderbundle::RenderBundleEncoder,
    },
    Geometry,
};

#[externref]
#[no_mangle]
pub unsafe extern "C" fn get_indices_gpu_buffer<'frame>(
    geometry_ptr: *mut Geometry,
) -> &'frame Resource<JSBuffer> {
    let indices = (*geometry_ptr).indices.as_ref().unwrap();
    &indices.gpu_buffer.externref
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn render_indexed(
    renderbundle: *mut RenderBundleEncoder,
    geometry_ptr: *mut Geometry,
    index_count: u32,
    instance_count: u32,
    first_index: u32,
    base_vertex: i32,
    first_instance: u32,
) {
    let indices = &mut (*geometry_ptr).indices.as_mut().unwrap();

    (*renderbundle).set_indexbuffer(&mut indices.gpu_buffer, 32, 0, None);
    (*renderbundle).draw_indexed(index_count, instance_count, first_index, base_vertex, first_instance);
}
pub struct Indices {
    pub indices: Vec<usize>,
    pub gpu_buffer: GPUBuffer<INDEX_USAGE>,
}

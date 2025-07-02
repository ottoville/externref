use externref::externref;
use logger::LoggerArray;

use crate::{
    gpu::{
        buffer::{buffer::GPUBuffer, usages::INDEX_USAGE},
        render_commands::RenderCommands,
        renderbundle::RenderBundleEncoder,
    },
    Geometry,
};

#[externref]
#[no_mangle]
pub unsafe extern "C" fn render_indexed(
    renderbundle: *mut RenderBundleEncoder,
    geometry_ptr: *mut Geometry,
    instance_count: u32,
    first_index: u32,
    base_vertex: i32,
    first_instance: u32,
) {
    let geometry = &mut (*geometry_ptr);
    let indices = &mut geometry.indices.as_mut();
    match indices {
        Some(inds) => {
            if inds.indices.len() == 0 {
                ["wont draw", &geometry.label, "zero indices"].warn()
            } else {
                (*renderbundle).set_indexbuffer(&mut inds.gpu_buffer, 32, 0, None);
                (*renderbundle).draw_indexed(
                    inds.indices.len() as u32,
                    instance_count,
                    first_index,
                    base_vertex,
                    first_instance,
                );
            }
        }
        None => ["wont draw", &geometry.label, "no indexbuffer"].warn(),
    }
}
pub struct Indices {
    pub indices: Vec<usize>,
    pub gpu_buffer: GPUBuffer<INDEX_USAGE>,
}

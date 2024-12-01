use externref::{externref, Resource};

use crate::mesh::ENGINE;

use super::{
    buffer::{buffer::GPUBuffer, usages::UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE},
    commandEncoder::JSCommandBuffer,
};
#[no_mangle]
pub unsafe extern "C" fn check_mapped_buffers() {
    let engine = ENGINE.physic_engine_mut();
    let point_lights_pendinds = &mut engine.point_lights.buffer_ring_pending;
    let point_lights_mapped = &mut engine.point_lights.buffer_ring_mapped;
    let mut i = 0;
    while i < point_lights_pendinds.len() {
        if point_lights_pendinds[i].map_state() == 2 {
            let pending_buffer = point_lights_pendinds.remove(i);
            point_lights_mapped.push(pending_buffer.into())
        } else {
            i = i + 1;
        }
    }
    let directional_lights_pendinds = &mut engine.directional_lights.buffer_ring_pending;
    let directional_lights_mapped = &mut engine.directional_lights.buffer_ring_mapped;
    let mut i = 0;
    while i < directional_lights_pendinds.len() {
        if directional_lights_pendinds[i].map_state() == 2 {
            let pending_buffer = directional_lights_pendinds.remove(i);
            directional_lights_mapped.push(pending_buffer.into())
        } else {
            i = i + 1;
        }
    }
}
#[no_mangle]
pub unsafe extern "C" fn gpu_queue_submited() {
    let engine = ENGINE.physic_engine_mut();
    for buffer in engine.point_lights.buffer_ring_onqueue.drain(..) {
        let size = buffer.size;
        let pending_buffer = buffer.map_write_async(0, size);
        engine.point_lights.buffer_ring_pending.push(pending_buffer);
    }
    for buffer in engine.directional_lights.buffer_ring_onqueue.drain(..) {
        let size = buffer.size;
        let pending_buffer = buffer.map_write_async(0, size);
        engine
            .directional_lights
            .buffer_ring_pending
            .push(pending_buffer);
    }
}

#[no_mangle]
pub unsafe extern "C" fn create_pending_command_buffers_iterator(
) -> *mut std::slice::Iter<'static, Resource<JSCommandBuffer>> {
    let iterator = ENGINE
        .physic_engine()
        .gpu
        .as_ref()
        .unwrap()
        .pending_command_buffers
        .iter();
    return Box::into_raw(Box::new(iterator));
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn iterate_pending_command_buffers(
    iterator_ptr: *mut std::slice::Iter<'static, Resource<JSCommandBuffer>>,
) -> Option<&Resource<JSCommandBuffer>> {
    let next = (*iterator_ptr).next();
    if next.is_none() {
        drop(Box::from_raw(iterator_ptr));
        let engine = ENGINE.physic_engine_mut();
        engine.gpu.as_mut().unwrap().pending_command_buffers.clear();
    }
    return next;
}

pub struct GPU {
    pub gpu_buffer: GPUBuffer<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE>,
    pub pending_command_buffers: Vec<Resource<JSCommandBuffer>>,
}

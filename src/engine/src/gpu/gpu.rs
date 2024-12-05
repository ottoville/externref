use externref::{externref, Resource};

use crate::mesh::ENGINE;

use super::{
    buffer::{buffer::GPUBuffer, usages::UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE},
    command_encoder::JSCommandBuffer,
};
#[no_mangle]
pub unsafe extern "C" fn check_mapped_buffers() {
    let engine = ENGINE.physic_engine_mut();
    engine.point_lights.check_mapped_buffers();
    engine.directional_lights.check_mapped_buffers();
}
#[no_mangle]
pub unsafe extern "C" fn gpu_queue_submited() -> bool {
    let engine = ENGINE.physic_engine_mut();
    let mut mapping = false;
    if engine.point_lights.queue_submited() {
        mapping = true
    }
    if engine.directional_lights.queue_submited() {
        mapping = true;
    }
    return mapping;
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

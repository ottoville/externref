use externref::{externref, Resource};

use crate::engine::{DEFAULT_MAX_INSTANCES, GPU_MEMORY_INDEX_SIZE};
use crate::mesh::ENGINE;

use super::queue::JSQueue;
use super::{
    buffer::{buffer::GPUBuffer, usages::UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE},
    command_encoder::JSCommandBuffer,
    queue::Queue,
};

#[no_mangle]
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
#[externref]
pub unsafe extern "C" fn init_gpu(queue: Resource<JSQueue>) {
    ENGINE.physic_engine_mut().gpu = Some(GPU {
        queue: Queue { externref: queue },
        gpu_buffer: GPUBuffer::<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE>::new(
            GPU_MEMORY_INDEX_SIZE * DEFAULT_MAX_INSTANCES,
            String::from("GPUMeshes"),
            false,
        ),
        pending_command_buffers: Vec::with_capacity(8),
    });
}

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

#[externref]
#[no_mangle]
pub unsafe extern "C" fn push_to_pending_command_buffers(
    buffer: Resource<JSCommandBuffer>,
) {
    let engine = ENGINE.physic_engine_mut();
    engine.gpu.as_mut().unwrap().pending_command_buffers.push(buffer);
}
pub struct GPU {
    pub queue: Queue,
    pub gpu_buffer: GPUBuffer<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE>,
    pub pending_command_buffers: Vec<Resource<JSCommandBuffer>>,
}

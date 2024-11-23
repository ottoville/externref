use super::buffer::{buffer::GPUBuffer, usages::UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE};

pub struct GPU {
    pub gpu_buffer: GPUBuffer<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE>,
}

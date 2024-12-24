use std::{rc::Weak, sync::Mutex};

use super::buffer::GpuBuffer;
use crate::gpu::bufferbinding::BufferBinding;

pub trait BindGroupBindable: GpuBuffer {
    fn get_binding(&mut self, bind_group: Weak<Mutex<BufferBinding>>) {
        self.add_buffer_binding(bind_group);
    }
}

use super::{buffer::usages::MAP_WRITE_COPYSRC_USAGE, commandEncoder::GPUCommandEncoder};
use crate::allocators::freeindex::FreeIndexIndex;

use super::buffer::{
    buffer::GPUBuffer, mappadle_buffer::MappadleGPUBuffer, mapped_buffer::MappedGPUBuffer,
    pending_buffer::PendingGPUBuffer, usages::STORAGE_COPYDST_USAGE,
};
const MAX_LIGHTS: usize = 63;

pub struct Lights {
    lights: Vec<FreeIndexIndex>,
    pub buffer: Option<GPUBuffer<STORAGE_COPYDST_USAGE>>,
    pub buffer_ring_pending: Vec<PendingGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>,
    pub buffer_ring_mapped: Vec<MappedGPUBuffer<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>>,
    pub buffer_ring_onqueue: Vec<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>,
    pub buffer_ring_unmapped: Vec<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>,
    label: String,
    dirty: bool,
}

impl Lights {
    pub fn new(label: String) -> Lights {
        Lights {
            lights: vec![FreeIndexIndex(0)],
            buffer: None,
            buffer_ring_pending: Vec::with_capacity(8),
            buffer_ring_mapped: Vec::with_capacity(8),
            buffer_ring_onqueue: Vec::with_capacity(8),
            buffer_ring_unmapped: Vec::with_capacity(8),
            label,
            dirty: false,
        }
    }
    pub fn init_buffer(&mut self) {
        #[cfg(feature = "webgpu")]
        #[cfg(any(not(test), rust_analyzer))]
        {
            self.buffer = Some(GPUBuffer::<STORAGE_COPYDST_USAGE>::new(
                MAX_LIGHTS * 4,
                self.label.to_string(),
                false,
            ));
        }
    }
    pub fn push(&mut self, value: FreeIndexIndex) {
        self.lights.push(value);
        self.dirty = true;
    }
    pub fn remove(&mut self, value: FreeIndexIndex) {
        let index = self.lights[1..]
            .iter()
            .position(|x| x.0 == value.0)
            .unwrap();
        //First value in buffer is used to encode its lenght
        self.lights.swap_remove(index + 1);
        self.dirty = true;
    }
    #[cfg(feature = "webgpu")]
    pub fn update_buffer(&mut self, command_encoder: &GPUCommandEncoder) -> bool{
        use crate::gpu::buffer::{mapped_buffer::MappedgpuBuffer, usages::MAP_WRITE_COPYSRC_USAGE};

        use super::buffer::copy_dst::CopyDst;
        if !self.dirty {
            return false;
        }
        self.dirty = false;
        self.lights[0] = FreeIndexIndex(self.lights.len() - 1);

        let size = self.buffer.as_ref().unwrap().size;
        let buffer = self.buffer_ring_mapped.pop().unwrap_or_else(|| {
            MappedGPUBuffer::<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>::new_mappadle_gpubuffer(
                size,
                String::from(self.label.to_string() + "_swap_buffer"),
                false,
            )
        });
        //TODO: Potential buffer overflow
        buffer.set_mapped_range(
            self.lights.as_ptr() as usize,
            self.lights.len() * 4,
            0,
            size,
        );
        let unmapped_buffer = buffer.unmap();
        self.buffer
            .as_ref()
            .unwrap()
            .copy_from(&command_encoder, &*unmapped_buffer, 0, 0, size);
        self.buffer_ring_onqueue.push(unmapped_buffer);
        return true;
    }
}

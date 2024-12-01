#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
use super::buffer::map_state;
use super::{mappadle_buffer::MappadleGPUBuffer, mapped_buffer::MappedGPUBuffer};

pub struct PendingGPUBuffer<const U: u32>(MappadleGPUBuffer<U>);
impl<const U: u32> PendingGPUBuffer<U> {
    pub fn new(buffer: MappadleGPUBuffer<U>) -> PendingGPUBuffer<U> {
        PendingGPUBuffer { 0: buffer }
    }
    /**
     * 0: unmapped, 1: pending: 2: mapped;
     */
    pub fn map_state(&self) -> u32 {
        #[cfg(feature = "webgpu")]
        #[cfg(any(not(test), rust_analyzer))]
        unsafe {
            map_state(&self.0.externref)
        }

        #[cfg(test)]
        return 2;
    }
}

impl<const U: u32> Into<MappedGPUBuffer<MappadleGPUBuffer<U>>> for PendingGPUBuffer<U> {
    fn into(self) -> MappedGPUBuffer<MappadleGPUBuffer<U>> {
        MappedGPUBuffer(self.0)
    }
}

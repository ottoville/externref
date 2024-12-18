use externref::Resource;

use super::buffer::mappadle_buffer::MappadleGPUBuffer;
use super::gpu::JSDevice;
use super::{buffer::usages::MAP_WRITE_COPYSRC_USAGE, command_encoder::GPUCommandEncoder};
use crate::allocators::freeindex::FreeIndexIndex;

use super::buffer::copy_dst::CopyDst;
use super::buffer::{
    buffer::GPUBuffer, mapped_buffer::MappedGPUBuffer, pending_buffer::PendingGPUBuffer,
    usages::STORAGE_COPYDST_USAGE,
};

pub struct Lights {
    lights: Vec<FreeIndexIndex>,
    pub buffer: Option<GPUBuffer<STORAGE_COPYDST_USAGE>>,
    buffer_ring_pending: Vec<PendingGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>,
    buffer_ring_mapped: Vec<MappedGPUBuffer<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>>,
    buffer_ring_onqueue: Vec<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>,
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
            label,
            dirty: false,
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
    pub fn update_buffer(
        &mut self,
        device: &Resource<JSDevice>,
        command_encoder: &GPUCommandEncoder,
    ) {
        if !self.dirty {
            return;
        }
        self.dirty = false;
        self.lights[0] = FreeIndexIndex(self.lights.len() - 1);
        let size = if let Some(gpu_buffer) = self.buffer.as_ref() {
            gpu_buffer.size
        } else {
            0
        };
        if self.lights.capacity() * 4 > size {
            self.buffer = Some(GPUBuffer::<STORAGE_COPYDST_USAGE>::new(
                device,
                self.lights.capacity() * 4,
                self.label.to_string(),
                false,
            ));
            self.buffer_ring_mapped.clear();
            self.buffer_ring_onqueue.clear();
            self.buffer_ring_pending.clear();
        }
        let buffer = self.buffer_ring_mapped.pop().unwrap_or_else(|| {
            MappadleGPUBuffer::new_mapped(
                device,
                self.lights.capacity() * 4,
                String::from(self.label.to_string() + "_swap_buffer"),
                false,
            )
        });
        buffer.set_mapped_range(
            self.lights.as_ptr() as usize,
            self.lights.len() * 4,
            0,
            self.lights.len() * 4,
        );
        let unmapped_buffer = buffer.unmap();
        self.buffer.as_ref().unwrap().copy_from(
            &command_encoder,
            &unmapped_buffer,
            0,
            0,
            self.lights.len() * 4,
        );
        self.buffer_ring_onqueue.push(unmapped_buffer);
    }
    pub fn queue_submited(&mut self) -> bool {
        if self.buffer_ring_onqueue.len() == 0 {
            return false;
        }
        for buffer in self.buffer_ring_onqueue.drain(..) {
            let size = buffer.size;
            let pending_buffer = buffer.map_write_async(0, size);
            self.buffer_ring_pending.push(pending_buffer);
        }
        return true;
    }
    pub fn check_mapped_buffers(&mut self) {
        let mut i = 0;
        while i < self.buffer_ring_pending.len() {
            if self.buffer_ring_pending[i].map_state() == 2 {
                let pending_buffer = self.buffer_ring_pending.remove(i);
                self.buffer_ring_mapped.push(pending_buffer.into())
            } else {
                i = i + 1;
            }
        }
    }
}
#[cfg(test)]
#[test]
fn test_lights() {
    use externref::ExternRef;
    unsafe {
        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0));
        let mut lights = Lights::new(String::from("GPUPointLights"));
        assert_eq!(lights.queue_submited(), false);
        lights.push(FreeIndexIndex(1));
        let command_encoder = GPUCommandEncoder::new(String::from("handle_gpu_queue_encoder"));
        assert_eq!(lights.dirty, true);
        lights.update_buffer(&device, &command_encoder);
        assert_eq!(lights.dirty, false);
        let update_needed = lights.update_buffer(&device, &command_encoder);
        assert_eq!(lights.dirty, false);
        assert_eq!(
            lights.buffer.as_ref().unwrap().size,
            lights.lights.capacity() * 4
        );
        lights.push(FreeIndexIndex(2));
        lights.push(FreeIndexIndex(3));
        lights.push(FreeIndexIndex(4));
        lights.update_buffer(&device, &command_encoder);
        assert_eq!(lights.buffer.as_ref().unwrap().size, 32);

        assert_eq!(lights.queue_submited(), true);
        assert_eq!(lights.queue_submited(), false);
    }
}

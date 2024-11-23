use crate::allocators::freeindex::FreeIndexIndex;

use super::buffer::{buffer::GPUBuffer, usages::STORAGE_COPYDST_USAGE};
const MAX_LIGHTS: usize = 63;

pub struct Lights {
    lights: Vec<FreeIndexIndex>,
    pub buffer: Option<GPUBuffer<STORAGE_COPYDST_USAGE>>,
    label: String,
    dirty: bool,
}

impl Lights {
    pub fn new(label: String) -> Lights {
        Lights {
            lights: vec![FreeIndexIndex(0)],
            buffer: None,
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
    pub fn update_buffer(&mut self) {
        // TODO: use shared command encoder and swap buffer rings
        if !self.dirty {
            return;
        }
        self.dirty = false;
        use crate::gpu::buffer::copy_dst::CopyDst;
        self.lights[0] = FreeIndexIndex(self.lights.len() - 1);
        //TODO: Potential buffer overflow
        self.buffer.as_ref().unwrap().write(
            self.lights.as_ptr() as usize,
            self.lights.len() * 4,
            0,
        );
    }
}

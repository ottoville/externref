use super::buffer::write;
use super::buffer::GpuBuffer;
pub trait CopyDst: GpuBuffer {
    fn write(&self, ptr: usize, size: usize, buffer_offset: usize) {
        unsafe {
            write(&self.externref(), ptr, size, buffer_offset);
        }
    }
}

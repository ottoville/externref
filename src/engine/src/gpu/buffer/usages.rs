use super::{mappadle_buffer::MappadleGPUBuffer, mapped_buffer::{MappedGPUBuffer, MappedgpuBuffer}};
use super::{buffer::GPUBuffer, copy_dst::CopyDst, copy_src::CopySrc};


/////////////////////////////////////////////////////////////////////////////////////
// MapRead
pub const MAP_READ_USAGE:u32 = 1;

/////////////////////////////////////////////////////////////////////////////////////
// MapWrite
pub const MAP_WRITE_USAGE: u32 = 2;
pub const MAP_WRITE_COPYSRC_USAGE: u32 = MAP_WRITE_USAGE | COPYSRC_USAGE;
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
impl CopySrc for GPUBuffer<MAP_WRITE_COPYSRC_USAGE> {}
impl MappedgpuBuffer<MAP_WRITE_COPYSRC_USAGE> for MappedGPUBuffer<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>> {}

/////////////////////////////////////////////////////////////////////////////////////
// CopySrc
pub const COPYSRC_USAGE: u32 = 4;
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
impl CopySrc for GPUBuffer<COPYSRC_USAGE> {}
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
impl MappedgpuBuffer<COPYSRC_USAGE> for MappedGPUBuffer<GPUBuffer<COPYSRC_USAGE>> {}
/////////////////////////////////////////////////////////////////////////////////////
// CopyDst
pub const COPYDST_USAGE:u32 = 8;
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
impl CopyDst for GPUBuffer<COPYDST_USAGE> {}

/////////////////////////////////////////////////////////////////////////////////////
// Index
pub const INDEX_USAGE:u32 = 16;

/////////////////////////////////////////////////////////////////////////////////////
// Vertex
pub const VERTEX_USAGE:u32 = 32;

/////////////////////////////////////////////////////////////////////////////////////
// Uniform
pub const UNIFORM_USAGE:u32 = 64;

/////////////////////////////////////////////////////////////////////////////////////
// Storage
pub const STORAGE_USAGE:u32 = 128;
pub const STORAGE_COPYDST_USAGE:u32 = STORAGE_USAGE | COPYDST_USAGE;
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
impl CopyDst for GPUBuffer<STORAGE_COPYDST_USAGE> {}

/////////////////////////////////////////////////////////////////////////////////////
// Indirect
pub const INDIRECT_USAGE:u32 = 256;
/////////////////////////////////////////////////////////////////////////////////////
// Query Resolve
pub const QUERY_RESOLVE_USAGE:u32 = 512;

/////////////////////////////////////////////////////////////////////////////////////
// UniformStorageCopysrcCopydst
pub const UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE: u32 = UNIFORM_USAGE | STORAGE_USAGE | COPYSRC_USAGE | COPYDST_USAGE;
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
impl CopySrc for GPUBuffer<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE> {}
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
impl CopyDst for GPUBuffer<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE> {}
/////////////////////////////////////////////////////////////////////////////////////
use super::{
    buffer::GPUBuffer, copy_dst::CopyDst, copy_src::CopySrc, mappadle_buffer::MappadleGPUBuffer,
    uniform::BindGroupBindable,
};

/////////////////////////////////////////////////////////////////////////////////////
// MapRead
pub const MAP_READ_USAGE: u32 = 1;

/////////////////////////////////////////////////////////////////////////////////////
// MapWrite
pub const MAP_WRITE_USAGE: u32 = 2;
pub const MAP_WRITE_COPYSRC_USAGE: u32 = MAP_WRITE_USAGE | COPYSRC_USAGE;
impl CopySrc for MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE> {}

/////////////////////////////////////////////////////////////////////////////////////
// CopySrc
pub const COPYSRC_USAGE: u32 = 4;
impl CopySrc for GPUBuffer<COPYSRC_USAGE> {}
/////////////////////////////////////////////////////////////////////////////////////
// CopyDst
pub const COPYDST_USAGE: u32 = 8;
impl CopyDst for GPUBuffer<COPYDST_USAGE> {}

/////////////////////////////////////////////////////////////////////////////////////
// Index
pub const INDEX_USAGE: u32 = 16;

/////////////////////////////////////////////////////////////////////////////////////
// Vertex
pub const VERTEX_USAGE: u32 = 32;
pub const VERTEX_STORAGE_COPYSRC_USAGE: u32 = VERTEX_USAGE | STORAGE_USAGE | COPYSRC_USAGE;
pub const VERTEX_STORAGE_COPYSRC_COPYDSST_USAGE: u32 = VERTEX_USAGE | STORAGE_USAGE | COPYSRC_USAGE | COPYDST_USAGE;
impl BindGroupBindable for GPUBuffer<VERTEX_STORAGE_COPYSRC_COPYDSST_USAGE> {}

/////////////////////////////////////////////////////////////////////////////////////
// Uniform
pub const UNIFORM_USAGE: u32 = 64;
pub const UNIFORM_COPYDST_USAGE: u32 = UNIFORM_USAGE | COPYDST_USAGE;
impl CopyDst for GPUBuffer<UNIFORM_COPYDST_USAGE> {}
impl BindGroupBindable for GPUBuffer<UNIFORM_COPYDST_USAGE> {}

/////////////////////////////////////////////////////////////////////////////////////
// Storage
pub const STORAGE_USAGE: u32 = 128;
impl BindGroupBindable for GPUBuffer<STORAGE_USAGE> {}

pub const STORAGE_COPYDST_USAGE: u32 = STORAGE_USAGE | COPYDST_USAGE;
impl CopyDst for GPUBuffer<STORAGE_COPYDST_USAGE> {}
impl BindGroupBindable for GPUBuffer<STORAGE_COPYDST_USAGE> {}

/////////////////////////////////////////////////////////////////////////////////////
// Indirect
pub const INDIRECT_USAGE: u32 = 256;
/////////////////////////////////////////////////////////////////////////////////////
// Query Resolve
pub const QUERY_RESOLVE_USAGE: u32 = 512;

/////////////////////////////////////////////////////////////////////////////////////
// UniformStorageCopysrcCopydst
pub const UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE: u32 =
    UNIFORM_USAGE | STORAGE_USAGE | COPYSRC_USAGE | COPYDST_USAGE;
impl CopySrc for GPUBuffer<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE> {}
impl CopyDst for GPUBuffer<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE> {}
impl BindGroupBindable for GPUBuffer<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE> {}

/////////////////////////////////////////////////////////////////////////////////////

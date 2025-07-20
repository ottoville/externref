use std::sync::{Arc, Mutex, Weak};

use externref::Resource;

use crate::gpu::{
    buffer::buffer::{GPUBuffer, JSBuffer},
    bufferbinding::BufferBinding,
};

pub trait BindGroupBindable: BindGroupBindableMarker {}
pub trait BindGroupBindableMarker {
    fn add_binding(&mut self, bind_group: Weak<Mutex<BufferBinding>>);
    fn externref(&self) -> &Resource<JSBuffer>;
    fn size(&self) -> usize;
    fn externref_arc(&self) -> Arc<Resource<JSBuffer>>;
}
impl<
        const MAP_READ: bool,
        const MAP_WRITE: bool,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const INDEX: bool,
        const VERTEX: bool,
        const UNIFORM: bool,
        const STORAGE: bool,
        const INDIRECT: bool,
        const QUERY_RESOLVE: bool,
    > BindGroupBindableMarker
    for GPUBuffer<
        MAP_READ,
        MAP_WRITE,
        COPY_SRC,
        COPY_DST,
        INDEX,
        VERTEX,
        UNIFORM,
        STORAGE,
        INDIRECT,
        QUERY_RESOLVE,
    >
{
    fn add_binding(&mut self, bind_group: Weak<Mutex<BufferBinding>>) {
        self.buffer_bindings.push(bind_group);
    }

    fn externref(&self) -> &Resource<JSBuffer> {
        &self.externref
    }

    fn size(&self) -> usize {
        self.size
    }
    fn externref_arc(&self) -> Arc<Resource<JSBuffer>> {
        self.externref.clone()
    }
}
impl<
        const MAP_READ: bool,
        const MAP_WRITE: bool,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const INDEX: bool,
        const VERTEX: bool,
        const STORAGE: bool,
        const INDIRECT: bool,
        const QUERY_RESOLVE: bool,
    > BindGroupBindable
    for GPUBuffer<
        MAP_READ,
        MAP_WRITE,
        COPY_SRC,
        COPY_DST,
        INDEX,
        VERTEX,
        true,
        STORAGE,
        INDIRECT,
        QUERY_RESOLVE,
    >
{
}
impl<
        const MAP_READ: bool,
        const MAP_WRITE: bool,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const INDEX: bool,
        const VERTEX: bool,
        const INDIRECT: bool,
        const QUERY_RESOLVE: bool,
    > BindGroupBindable
    for GPUBuffer<
        MAP_READ,
        MAP_WRITE,
        COPY_SRC,
        COPY_DST,
        INDEX,
        VERTEX,
        false,
        true,
        INDIRECT,
        QUERY_RESOLVE,
    >
{
}

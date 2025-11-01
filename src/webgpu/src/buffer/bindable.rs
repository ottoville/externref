use crate::{
    buffer::buffer::{BufferRef, GPUBuffer},
    bufferbinding::BufferBinding,
};
use std::{
    cell::RefCell, num::NonZeroUsize, rc::{Rc, Weak}
};

pub trait BindGroupBindable: BindGroupBindableMarker {}
pub trait BindGroupBindableMarker {
    fn add_binding(&mut self, bind_group: Weak<RefCell<BufferBinding>>);
    fn externref(&self) -> &BufferRef;
    fn size(&self) -> NonZeroUsize;
    fn externref_arc(&self) -> Rc<BufferRef>;
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
    fn add_binding(&mut self, bind_group: Weak<RefCell<BufferBinding>>) {
        self.buffer_bindings.push(bind_group);
    }

    fn externref(&self) -> &BufferRef {
        &self.externref
    }

    fn size(&self) -> NonZeroUsize {
        self.size
    }
    fn externref_arc(&self) -> Rc<BufferRef> {
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

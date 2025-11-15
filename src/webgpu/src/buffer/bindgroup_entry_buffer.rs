use crate::{
    bindgroup::{bindgroup::Bindable, bindgroup_entry::{BindGroupBinding, BindgroupEntry}},
    buffer::buffer::{BufferRef, GPUBuffer},
};
use std::{
    cell::RefCell,
    num::NonZeroUsize,
    rc::{Rc, Weak},
};

pub trait AbstractBindGroupEntryBuffer: BindgroupEntry {
    fn externref(&self) -> &BufferRef;
    fn externref_arc(&self) -> Rc<dyn Bindable>;
}

pub trait BindGroupEntryBuffer: AbstractBindGroupEntryBuffer {}
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
    > AbstractBindGroupEntryBuffer
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
    fn externref(&self) -> &BufferRef {
        &self.externref
    }

    fn externref_arc(&self) -> Rc<dyn Bindable> {
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
        const UNIFORM: bool,
        const STORAGE: bool,
        const INDIRECT: bool,
        const QUERY_RESOLVE: bool,
    > BindgroupEntry
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
    fn add_binding(&mut self, bind_group: Weak<RefCell<dyn BindGroupBinding>>) {
        self.bindings.push(bind_group);
    }
    fn size(&self) -> NonZeroUsize {
        self.size
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
    > BindGroupEntryBuffer
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
    > BindGroupEntryBuffer
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

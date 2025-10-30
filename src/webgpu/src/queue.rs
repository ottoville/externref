use std::{
    cell::{Cell, RefCell},
    rc::Rc,
};

use crate::{
    bindgroup::bindgroup_resources::BindGroupResources,
    buffer::buffer::{BufferRef, GPUBuffer, JSBuffer},
    command_buffer::{CommandBuffer, JSCommandBuffer},
};
use externref::{externref, Resource};

pub struct JSQueue(());

type IteratorPtr<'a> = *mut &'a mut dyn Iterator<Item = Resource<JSCommandBuffer>>;

#[cfg(not(target_arch = "wasm32"))]
unsafe fn submit(_queue: &Resource<JSQueue>, _iterator: IteratorPtr) {}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn write_buffer(
    _queue: &Resource<JSQueue>,
    _buffer: &Resource<JSBuffer>,
    _ptr: usize,
    _size: usize,
    _buffer_offset: usize,
) {
}
#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "queue")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn submit(queue: &Resource<JSQueue>, iterator: IteratorPtr);
    pub fn write_buffer(
        queue: &Resource<JSQueue>,
        buffer: &Resource<JSBuffer>,
        ptr: usize,
        size: usize,
        buffer_offset: usize,
    );

}
thread_local! {
    static COMMAND_BUFFER_EXTERNREF: Cell<Option<Resource<JSCommandBuffer>>> = const { Cell::new(None) };
    static BUFFERS_AND_BINDGROUPS: RefCell<(Vec<Vec<Rc<BufferRef>>>, Vec<Vec<Rc<BindGroupResources>>>)> = const { RefCell::new((Vec::new(),Vec::new())) };
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn drain_command_buffers<'a>(
    iterator_ptr: IteratorPtr,
) -> Option<&'a Resource<JSCommandBuffer>> {
    let next = (*iterator_ptr).next();
    if next.is_none() {
        drop(Box::from_raw(iterator_ptr));
    }
    COMMAND_BUFFER_EXTERNREF.set(next);
    let value = COMMAND_BUFFER_EXTERNREF.with(|n| {
        return n.as_ptr();
    });
    return (*value).as_ref();
}
pub struct Queue {
    pub externref: Resource<JSQueue>,
    pub pending_command_buffers: Vec<CommandBuffer>,
}
impl Queue {
    fn inner_submit<I: Iterator<Item = CommandBuffer>>(
        externref: &Resource<JSQueue>,
        command_buffers: I,
    ) {
        // Maintain reference for buffers until submit has been fully executed
        let mut mapped = command_buffers.map(|c| {
            BUFFERS_AND_BINDGROUPS.with_borrow_mut(|(buffers, bindgroups)| {
                buffers.push(c.buffers);
                bindgroups.push(c.bindgroups);
            });
            return c.externref;
        });

        let b: Box<&mut dyn Iterator<Item = Resource<JSCommandBuffer>>> = Box::new(&mut mapped);
        let boxed = Box::into_raw(b);
        unsafe {
            submit(externref, boxed);
        }
        BUFFERS_AND_BINDGROUPS.with_borrow_mut(|(buffers, bindgroups)| {
            buffers.clear();
            bindgroups.clear();
        })
    }
    pub fn drain_command_buffers(&mut self) {
        let mapped = self.pending_command_buffers.drain(..);
        Queue::inner_submit(&self.externref, mapped);
    }
    pub fn submit<const N: usize>(&self, command_buffers: [CommandBuffer; N]) {
        Queue::inner_submit(&self.externref, command_buffers.into_iter());
    }
    pub fn write_buffer<
        const MAP_READ: bool,
        const MAP_WRITE: bool,
        const COPY_SRC: bool,
        const INDEX: bool,
        const VERTEX: bool,
        const UNIFORM: bool,
        const STORAGE: bool,
        const INDIRECT: bool,
        const QUERY_RESOLVE: bool,
    >(
        &self,
        buffer: GPUBuffer<
            MAP_READ,
            MAP_WRITE,
            COPY_SRC,
            true,
            INDEX,
            VERTEX,
            UNIFORM,
            STORAGE,
            INDIRECT,
            QUERY_RESOLVE,
        >,
        ptr: usize,
        size: usize,
        buffer_offset: usize,
    ) {
        unsafe {
            write_buffer(
                &self.externref,
                &buffer.externref.0,
                ptr,
                size,
                buffer_offset,
            )
        }
    }
}

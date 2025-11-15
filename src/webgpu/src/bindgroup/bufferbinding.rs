use std::{cell::RefCell, num::NonZeroUsize, rc::Rc};

use externref::Resource;

use crate::bindgroup::bindgroup_descriptor::{create_buffer_binding, JSBufferBinding};
use crate::bindgroup::bindgroup_trait::BindGroupTrait;

use crate::buffer::bindgroup_entry_buffer::BindGroupEntryBuffer;
use crate::weakvec::WeakVec;

pub struct BufferBinding {
    pub buffer: Rc<RefCell<dyn BindGroupEntryBuffer>>,
    binding: Option<Resource<JSBufferBinding>>,
    pub offset: usize,
    pub size: Option<NonZeroUsize>,
    pub bindgroups: WeakVec<dyn BindGroupTrait>,
}
impl BufferBinding {
    pub fn new(
        buffer: Rc<RefCell<dyn BindGroupEntryBuffer>>,
        offset: usize,
        size: Option<NonZeroUsize>,
    ) -> Rc<RefCell<BufferBinding>> {
        Rc::new(RefCell::new(BufferBinding {
            buffer,
            binding: None,
            offset,
            size,
            bindgroups: WeakVec::new(),
        }))
    }
    pub fn get_binding(&mut self) -> &Resource<JSBufferBinding> {
        self.binding.get_or_insert_with(|| {
            let borrowed = self.buffer.borrow();
            unsafe {
                create_buffer_binding(
                    &borrowed.externref().0,
                    self.offset,
                    match self.size {
                        Some(s) => s.get(),
                        None => borrowed.size().get(),
                    },
                )
            }
        })
    }
    pub fn replace_buffer(&mut self, buffer: Rc<RefCell<dyn BindGroupEntryBuffer>>) {
        self.buffer = buffer;
        self.make_dirty();
    }
    pub fn make_dirty(&mut self) {
        self.bindgroups.iter_mut(|bind_group| {
            bind_group.make_dirty();
        });
        self.binding = None;
    }
}

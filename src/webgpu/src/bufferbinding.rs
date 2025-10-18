use std::{cell::RefCell, num::NonZeroUsize, rc::Rc};

use crate::bindgroup::bindgroup_trait::BindGroupTrait;

use crate::buffer::bindable::BindGroupBindable;
use crate::weakvec::WeakVec;

pub struct BufferBinding {
    pub buffer: Rc<RefCell<dyn BindGroupBindable>>,
    pub offset: usize,
    pub size: Option<NonZeroUsize>,
    pub bindgroups: WeakVec<dyn BindGroupTrait>,
}
impl BufferBinding {
    pub fn new(
        buffer: Rc<RefCell<dyn BindGroupBindable>>,
        offset: usize,
        size: Option<NonZeroUsize>,
    ) -> Rc<RefCell<BufferBinding>> {
        Rc::new(RefCell::new(BufferBinding {
            buffer,
            offset,
            size,
            bindgroups: WeakVec::new(),
        }))
    }
    pub fn replace_buffer(&mut self, buffer: Rc<RefCell<dyn BindGroupBindable>>) {
        self.buffer = buffer;
        self.make_dirty();
    }
    pub fn make_dirty(&mut self) {
        self.bindgroups.iter_mut(|bind_group| {
            bind_group.make_dirty();
        });
    }
}

use std::{cell::RefCell, num::NonZeroUsize, rc::Rc, sync::Weak};

use crate::bindgroup::bindgroup_trait::BindGroupTrait;

use crate::buffer::bindable::BindGroupBindable;

pub struct BufferBinding {
    pub buffer: Rc<RefCell<dyn BindGroupBindable>>,
    pub offset: usize,
    pub size: Option<NonZeroUsize>,
    pub bindgroups: Vec<Weak<dyn BindGroupTrait>>,
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
            bindgroups: Vec::new(),
        }))
    }
    pub fn replace_buffer(&mut self, buffer: Rc<RefCell<dyn BindGroupBindable>>) {
        self.buffer = buffer;
        self.make_dirty();
    }
    pub fn make_dirty(&mut self) {
        for somebindgroup in self.bindgroups.iter() {
            if let Some(bind_group) = somebindgroup.upgrade() {
                bind_group.make_dirty();
            }
        }
    }
}

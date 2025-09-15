use std::{
    num::NonZeroUsize,
    sync::{Arc, Mutex, Weak},
};

use crate::bindgroup::bindgroup_trait::BindGroupTrait;

use crate::buffer::bindable::BindGroupBindable;

pub struct BufferBinding {
    pub buffer: Arc<Mutex<dyn BindGroupBindable + Send>>,
    pub offset: usize,
    pub size: Option<NonZeroUsize>,
    pub bindgroups: Vec<Weak<dyn BindGroupTrait>>,
}
impl BufferBinding {
    pub fn new(
        buffer: Arc<Mutex<dyn BindGroupBindable + Send>>,
        offset: usize,
        size: Option<NonZeroUsize>,
    ) -> Arc<Mutex<BufferBinding>> {
        Arc::new(Mutex::new(BufferBinding {
            buffer,
            offset,
            size,
            bindgroups: Vec::new(),
        }))
    }
    pub fn replace_buffer(&mut self, buffer: Arc<Mutex<dyn BindGroupBindable + Send>>) {
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

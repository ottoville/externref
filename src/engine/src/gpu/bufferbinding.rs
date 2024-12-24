use std::{num::NonZeroUsize, rc::{Rc, Weak}, sync::Mutex};

use crate::gpu::buffer::uniform::BindGroupBindable;

use super::bindgroup::BindGroup;


pub struct BufferBinding {
    pub buffer: Rc<Mutex<dyn BindGroupBindable>>,
    pub offset: usize,
    pub size: Option<NonZeroUsize>,
    bindgroups: Vec<Weak<Mutex<BindGroup>>>
}
impl BufferBinding {
    pub fn new(buffer: Rc<Mutex<dyn BindGroupBindable>>, offset: usize, size: Option<NonZeroUsize>) -> Rc<Mutex<BufferBinding>>{
        Rc::new(Mutex::new(BufferBinding {
            buffer,
            offset,
            size,
            bindgroups: Vec::new()
        }))
    }
    pub fn make_dirty(&mut self) {
        for somebindgroup in self.bindgroups.iter() {
            if let Some(bind_group) = somebindgroup.upgrade() {
                bind_group.lock().unwrap().dirty = true;
            }
        }
    }
    pub fn get_binding(buffer_binding_mutex: &Rc<Mutex<Self>>, bindgroup: Weak<Mutex<BindGroup>>) {
        let mut buffer_binding = buffer_binding_mutex.lock().unwrap();
        buffer_binding.bindgroups.push(bindgroup);
        buffer_binding.buffer.lock().unwrap().add_buffer_binding(Rc::downgrade(buffer_binding_mutex));
    }
}
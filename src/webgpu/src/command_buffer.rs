use std::rc::Rc;

use externref::Resource;

use crate::{bindgroup::bindgroup_resources::BindGroupResources, buffer::buffer::BufferRef};

pub struct JSCommandBuffer(());

pub struct CommandBuffer {
    pub externref: Resource<JSCommandBuffer>,
    // Hold references to prevent buffer being CG't before command encoder has been executed
    pub buffers: Vec<Rc<BufferRef>>,
    pub bindgroups: Vec<Rc<BindGroupResources>>,
}

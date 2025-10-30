use std::rc::Rc;

use externref::Resource;

use crate::{bindgroup::bindgroup_resources::BindGroupResources, buffer::buffer::BufferRef};

pub struct JSFunction(());
pub struct JSRenderBundleDescriptor(());
pub struct JSRenderBundle(());

pub struct RenderBundle {
    pub bindgroups: Vec<Rc<BindGroupResources>>,
    pub buffers: Vec<Rc<BufferRef>>,
    pub externref: Resource<JSRenderBundle>,
}

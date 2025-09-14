use std::sync::Arc;

use externref::Resource;

use crate::gpu::buffer::buffer::JSBuffer;

use super::bindgroup::BindGroupResources;

pub struct JSFunction(());
pub struct JSRenderBundleDescriptor(());
pub struct JSRenderBundle(());

pub struct RenderBundle {
    pub bindgroups: Vec<Arc<BindGroupResources>>,
    pub buffers: Vec<Arc<Resource<JSBuffer>>>,
    pub externref: Resource<JSRenderBundle>,
}

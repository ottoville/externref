use std::sync::Arc;

use externref::Resource;

use crate::{bindgroup::bindgroup::JSBindGroup, buffer::buffer::JSBuffer};

pub struct BindGroupResources {
    pub externref: Resource<JSBindGroup>,
    pub rawbuffers: Vec<Arc<Resource<JSBuffer>>>,
}

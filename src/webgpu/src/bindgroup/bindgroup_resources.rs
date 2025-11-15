use std::rc::Rc;

use externref::Resource;

use crate::bindgroup::bindgroup::{Bindable, JSBindGroup};

pub struct BindGroupResources {
    pub externref: Resource<JSBindGroup>,
    pub rawbuffers: Vec<Rc<dyn Bindable>>,
}

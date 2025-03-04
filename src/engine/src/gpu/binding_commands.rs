use externref::Resource;

use super::{bindgroup::BindGroup, gpu::JSDevice};

pub trait BindingCommands {
    fn set_bindgroup(
        &mut self,
        device: &Resource<JSDevice>,
        index: u32,
        bindgroup: &mut BindGroup,
    );
}
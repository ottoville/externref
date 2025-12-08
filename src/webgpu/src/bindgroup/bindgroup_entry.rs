use std::{
    cell::RefCell,
    num::NonZeroUsize,
    rc::{Rc, Weak},
};

use externref::Resource;

use crate::bindgroup::bindgroup::Bindable;
use crate::bindgroup::{
    bindgroup_descriptor::JSBindGroupDescriptor, bindgroup_trait::BindGroupTrait,
};
pub trait BindgroupEntry {
    fn add_binding(&mut self, bind_group: Weak<RefCell<dyn BindGroupBinding>>);
    fn size(&self) -> NonZeroUsize;
}
pub trait BindGroupBinding {
    fn add_bindgroup(&mut self, _bindgroup: Weak<dyn BindGroupTrait>) {}
    fn push_bindgroup_entry_to_bindgroup(
        &mut self,
        descriptor: &Resource<JSBindGroupDescriptor>,
        i: u32,
    );
    fn add_binding(&'_ self, _binding_refcell: Weak<RefCell<dyn BindGroupBinding>>) {}
    fn add_bindable(&self, _vec: &mut Vec<Rc<dyn Bindable>>) {}
    fn make_dirty(&mut self) {}
}

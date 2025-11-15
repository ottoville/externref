use std::cell::{RefCell, RefMut};
use std::rc::{Rc, Weak};
use std::sync::Arc;

use crate::bindgroup::bindgroup_descriptor::{
    create_bind_group_descriptor, push_to_bind_group_descriptor, JSBindGroupDescriptor,
};

use crate::bindgroup::bindgroup_entry::{BindGroupBinding, BindgroupEntry};
use crate::bindgroup::bindgroup_trait::BindGroupTrait;
use crate::bindgroup::bufferbinding::BufferBinding;

use crate::bindgroup_layout::{BindGroupLayout, JSBindGroupLayout};
use crate::device::{create_bind_group, JSDevice};
use crate::weakvec::WeakVec;
use externref::Resource;

use crate::bindgroup::bindgroup_resources::BindGroupResources;
use crate::renderbundle::RenderBundle;
pub struct JSBindGroup(());

impl BindGroupBinding for BufferBinding {
    fn add_bindgroup(&mut self, bindgroup: Weak<dyn BindGroupTrait>) {
        self.bindgroups.push(bindgroup);
    }

    fn push_bindgroup_entry_to_bindgroup(
        &mut self,
        descriptor: &Resource<JSBindGroupDescriptor>,
        i: u32,
    ) {
        unsafe {
            push_to_bind_group_descriptor(descriptor, i, &self.get_binding().upcast_ref())
        };
    }
    fn make_dirty(&mut self) {
        self.make_dirty();
    }
    fn get_entity(&'_ self) -> RefMut<'_, dyn BindgroupEntry> {
        self.buffer.borrow_mut()
    }

    fn add_bindable(&self, vec: &mut Vec<Rc<dyn Bindable>>) {
        vec.push(self.buffer.borrow().externref_arc());
    }
}
pub struct BindGroup<const N: usize> {
    pub resources: RefCell<Option<Rc<BindGroupResources>>>,
    label: String,
    layout: Arc<Resource<JSBindGroupLayout>>,
    pub bindings: [Rc<RefCell<dyn BindGroupBinding>>; N],
    pub renderbundles: RefCell<WeakVec<RefCell<Option<RenderBundle>>>>,
}

impl<const N: usize> BindGroupTrait for BindGroup<N> {
    fn make_dirty(&self) {
        self.resources.borrow_mut().take();
        self.renderbundles.borrow_mut().iter_mut(|renderbundle| {
            renderbundle.borrow_mut().take();
        });
    }
}

pub trait Bindable {}

impl<const N: usize> BindGroup<N> {
    pub fn new(
        label: String,
        layout: &BindGroupLayout<N>,
        bindings: [Rc<RefCell<dyn BindGroupBinding>>; N],
    ) -> Rc<BindGroup<N>> {
        let bind_group = Rc::new(BindGroup {
            resources: RefCell::new(None),
            label,
            layout: layout.externref.clone(),
            bindings,
            renderbundles: RefCell::new(WeakVec::new()),
        });
        for binding_refcell in bind_group.bindings.iter() {
            let mut binding = binding_refcell.borrow_mut();
            let weak = Rc::downgrade(&bind_group);
            //buffer_binding.bindgroups.push(weak);
            binding.add_bindgroup(weak);
            // Add bind group reference to buffer
            binding
                .get_entity()
                .add_binding(Rc::downgrade(binding_refcell));
        }
        return bind_group;
    }
    pub fn get_bindgroup(&self, device: &Resource<JSDevice>) -> Rc<BindGroupResources> {
        let mut resources = self.resources.borrow_mut();
        let extenref_resources = resources.get_or_insert_with(|| {
            let mut rawbuffers = Vec::with_capacity(self.bindings.len());
            for binding in self.bindings.iter() {
                let buffer_binding = binding.borrow_mut();
                buffer_binding.add_bindable(&mut rawbuffers);
            }
            let descriptor = unsafe {
                create_bind_group_descriptor(
                    &self.layout,
                    self.label.as_ptr() as usize,
                    self.label.len(),
                )
            };
            for (i, bufferbinding) in self.bindings.iter().enumerate() {
                let mut borrowed = bufferbinding.borrow_mut();
                borrowed.push_bindgroup_entry_to_bindgroup(&descriptor, i as u32);
            }

            let externref = unsafe { create_bind_group(device, &descriptor) };
            Rc::new(BindGroupResources {
                externref,
                rawbuffers,
            })
        });
        return extenref_resources.clone();
    }
}

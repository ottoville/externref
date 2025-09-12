use std::sync::Arc;

use externref::Resource;

use crate::{
    binding_layout::BindingLayout,
    device::{create_bind_group_layout, JSDevice},
};

pub struct JSBindGroupLayout(());

pub struct BindGroupLayout<const N: usize> {
    label: String,
    pub externref: Arc<Resource<JSBindGroupLayout>>,
}

impl<const N: usize> BindGroupLayout<N> {
    pub fn new(
        device: &Resource<JSDevice>,
        label: String,
        entries: [&dyn BindingLayout; N],
    ) -> Self {
        let bindinglayout_iterator = Box::new(entries.iter());
        let externref = unsafe {
            create_bind_group_layout(
                device,
                label.as_ptr() as usize,
                label.len(),
                Box::into_raw(bindinglayout_iterator),
            )
        };
        BindGroupLayout {
            label,
            externref: Arc::new(externref),
        }
    }
}

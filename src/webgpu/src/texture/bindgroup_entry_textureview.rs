use std::{
    cell::{RefCell, RefMut},
    rc::{Rc, Weak},
};

use externref::Resource;

use crate::{
    bindgroup::{
        bindgroup::Bindable,
        bindgroup_entry::{BindGroupBinding, BindgroupEntry},
    },
    texture::texture_view::JSTextureView,
};
use crate::{
    bindgroup::{
        bindgroup_descriptor::{push_to_bind_group_descriptor, JSBindGroupDescriptor},
        bindgroup_trait::BindGroupTrait,
    },
    texture::{texture_formats::TextureFormat, texture_view::TextureView},
    weakvec::WeakVec,
};
pub trait AbstractBindGroupEntryTextureView: BindgroupEntry {
    fn externref(&self) -> &Resource<JSTextureView>;
    fn externref_arc(&self) -> Rc<dyn Bindable>;
}
pub trait BindGroupEntryTextureView: AbstractBindGroupEntryTextureView {}

struct TextureBinding {
    pub textureview: Rc<RefCell<dyn BindGroupEntryTextureView>>,
    pub bindgroups: WeakVec<dyn BindGroupTrait>,
}

impl BindGroupBinding for TextureBinding {
    fn add_bindgroup(&mut self, bindgroup: Weak<dyn BindGroupTrait>) {
        self.bindgroups.push(bindgroup);
    }

    fn push_bindgroup_entry_to_bindgroup(
        &mut self,
        descriptor: &Resource<JSBindGroupDescriptor>,
        i: u32,
    ) {
        unsafe {
            push_to_bind_group_descriptor(
                descriptor,
                i,
                &self.textureview.borrow().externref().upcast_ref(),
            )
        };
    }
    fn make_dirty(&mut self) {
        todo!()
    }
    fn get_entity(&'_ self) -> RefMut<'_, dyn BindgroupEntry> {
        self.textureview.borrow_mut()
    }

    fn add_bindable(&self, vec: &mut Vec<Rc<dyn Bindable>>) {
        vec.push(self.textureview.borrow().externref_arc());
    }
}

impl<
        F: TextureFormat,
        const SAMPLE_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const BASE_MIP_LEVEL: u32,
        const MIP_LEVEL_COUNT: u32,
        const BASE_ARRAY_LAYER: u32,
        const ARRAY_LAYER_COUNT: u32,
    > AbstractBindGroupEntryTextureView
    for TextureView<
        F,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        BASE_MIP_LEVEL,
        MIP_LEVEL_COUNT,
        BASE_ARRAY_LAYER,
        ARRAY_LAYER_COUNT,
    >
{
    fn externref(&self) -> &Resource<JSTextureView> {
        &self.externref
    }

    fn externref_arc(&self) -> Rc<dyn Bindable> {
        self.texture.clone()
    }
}
impl<
        F: TextureFormat,
        const SAMPLE_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const BASE_MIP_LEVEL: u32,
        const MIP_LEVEL_COUNT: u32,
        const BASE_ARRAY_LAYER: u32,
        const ARRAY_LAYER_COUNT: u32,
    > BindgroupEntry
    for TextureView<
        F,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        BASE_MIP_LEVEL,
        MIP_LEVEL_COUNT,
        BASE_ARRAY_LAYER,
        ARRAY_LAYER_COUNT,
    >
{
    fn add_binding(&mut self, bind_group: Weak<RefCell<dyn BindGroupBinding>>) {
        self.bindings.push(bind_group);
    }
    fn size(&self) -> std::num::NonZeroUsize {
        todo!()
    }
}

impl<
        F: TextureFormat,
        const SAMPLE_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const BASE_MIP_LEVEL: u32,
        const MIP_LEVEL_COUNT: u32,
        const BASE_ARRAY_LAYER: u32,
        const ARRAY_LAYER_COUNT: u32,
    > BindGroupEntryTextureView
    for TextureView<
        F,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        true,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        BASE_MIP_LEVEL,
        MIP_LEVEL_COUNT,
        BASE_ARRAY_LAYER,
        ARRAY_LAYER_COUNT,
    >
{
}
impl<
        F: TextureFormat,
        const SAMPLE_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const RENDER_ATTACHMENT: bool,
        const BASE_MIP_LEVEL: u32,
        const MIP_LEVEL_COUNT: u32,
        const BASE_ARRAY_LAYER: u32,
        const ARRAY_LAYER_COUNT: u32,
    > BindGroupEntryTextureView
    for TextureView<
        F,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        false,
        true,
        RENDER_ATTACHMENT,
        BASE_MIP_LEVEL,
        MIP_LEVEL_COUNT,
        BASE_ARRAY_LAYER,
        ARRAY_LAYER_COUNT,
    >
{
}

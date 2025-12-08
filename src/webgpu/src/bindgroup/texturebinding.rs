use std::{cell::RefCell, rc::Rc};

use crate::{
    bindgroup::bindgroup_trait::BindGroupTrait,
    texture::bindgroup_entry_textureview::BindGroupEntryTextureView, weakvec::WeakVec,
};

pub struct TextureBinding {
    pub textureview: Rc<RefCell<dyn BindGroupEntryTextureView>>,
    pub bindgroups: WeakVec<dyn BindGroupTrait>,
}
impl TextureBinding {
    pub fn new(view: Rc<RefCell<dyn BindGroupEntryTextureView>>) -> Self {
        TextureBinding {
            textureview: view,
            bindgroups: WeakVec::new(),
        }
    }
}
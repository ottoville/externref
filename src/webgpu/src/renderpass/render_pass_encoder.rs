use std::{rc::Rc, sync::Arc};

use externref::Resource;

use crate::{
    bindgroup::{bindgroup::BindGroup, bindgroup_resources::BindGroupResources},
    binding_commands::BindingCommands,
    buffer::buffer::{BufferRef, GPUBuffer},
    command_encoder::GPUCommandEncoder,
    externref_trait::HaveExternref,
    render_commands::RenderCommands,
    renderbundle::{JSRenderBundle, RenderBundle},
};

#[cfg(not(target_arch = "wasm32"))]
unsafe fn execute_bundles(
    _renderpassencoder: &Resource<JSRenderPassEncoder>,
    _bundle: &Resource<JSRenderBundle>,
) {
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn end(_renderpassencoder: &Resource<JSRenderPassEncoder>) {}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "renderpassencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn execute_bundles(
        renderpassencoder: &Resource<JSRenderPassEncoder>,
        bundle: &Resource<JSRenderBundle>,
    );
    fn end(renderpassencoder: &Resource<JSRenderPassEncoder>);

}

pub struct JSRenderPassEncoder(());

pub struct RenderPassEncoder {
    pub command_encoder: GPUCommandEncoder,
    pub externref: Resource<JSRenderPassEncoder>,
}

impl RenderPassEncoder {
    pub fn execute_bundles(&mut self, bundle: &RenderBundle) {
        unsafe { execute_bundles(&self.externref, &bundle.externref) };

        for bindgroup in bundle.bindgroups.iter() {
            self.command_encoder.bindgroups.push(bindgroup.clone());
        }

        for buffer in bundle.buffers.iter() {
            self.command_encoder.buffers.push(buffer.clone());
        }
    }
    //TODO combine with compute pass encoder end
    pub fn end(self) -> GPUCommandEncoder {
        unsafe {
            end(&self.externref);
        }
        return self.command_encoder;
    }
}
impl HaveExternref<JSRenderPassEncoder> for RenderPassEncoder {
    fn externref(&self) -> &Resource<JSRenderPassEncoder> {
        &self.externref
    }
}
impl BindingCommands<JSRenderPassEncoder> for RenderPassEncoder {
    fn after_set_bindgroup<const N: usize>(&mut self, _bindgroup: &BindGroup<N>) {
        todo!()
    }

    fn bindgroups(&mut self) -> &mut Vec<Rc<BindGroupResources>> {
        todo!()
    }
}
impl RenderCommands<JSRenderPassEncoder> for RenderPassEncoder {
    fn buffers(&mut self) -> &mut Vec<Arc<BufferRef>> {
        // TODO: is it really necessary to save buffer reference in renderpassencoder
        todo!()
    }
    fn after_set_buffer(&mut self, _buffer: &mut GPUBuffer<false, false, false, false, true>) {
        todo!()
    }
}

use externref::{externref, Resource};

use crate::gpu::{binding_commands::BindingCommands, buffer::usages::INDEX_USAGE, externref_trait::HaveExternref, render_commands::RenderCommands};

use super::{
    command_encoder::GPUCommandEncoder,
    renderbundle::{JSRenderBundle, RenderBundle},
};
#[cfg(test)]
unsafe fn execute_bundles(
    _renderpassencoder: &Resource<JSRenderPassEncoder>,
    _bundle: &Resource<JSRenderBundle>,
) {
}
#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
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
        #[cfg(feature = "webgpu")]
        #[cfg(any(not(test), rust_analyzer))]
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
    fn after_set_bindgroup(&mut self, bindgroup: &super::bindgroup::BindGroup) {
        todo!()
    }

    fn bindgroups(&mut self) -> &mut Vec<std::sync::Arc<super::bindgroup::BindGroupResources>> {
        todo!()
    }
}
impl RenderCommands<JSRenderPassEncoder> for RenderPassEncoder {
    fn buffers(&mut self) -> &mut Vec<std::sync::Arc<Resource<super::buffer::buffer::JSBuffer>>> {
        // TODO: is it really necessary to save buffer reference in renderpassencoder
        todo!()
    }
    fn after_set_buffer(
        &mut self,
        buffer: &mut super::buffer::buffer::GPUBuffer<INDEX_USAGE>,
    ) {
        todo!()
    }
}

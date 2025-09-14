use externref::{externref, Resource};
use webgpu::texture::texture_view::JSTextureView;

use crate::gpu::{
    bindgroup::BindGroup, binding_commands::BindingCommands, externref_trait::HaveExternref,
    render_commands::RenderCommands,
};

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
#[cfg(test)]
pub unsafe fn create_render_pass_color_attachment_clear(
    _view: &Resource<JSTextureView>,
    _depth_slice: i32,
    _resolve_target: Option<&Resource<JSTextureView>>,
    _clear_value_r: f64,
    _clear_value_g: f64,
    _clear_value_b: f64,
    _clear_value_a: f64,
    _store_opt: StoreOpt,
) -> Resource<JSRenderPassColorAttachment> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}

pub enum StoreOpt {
    Store,
    Discard,
}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "renderpassencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_render_pass_color_attachment_clear(
        view: &Resource<JSTextureView>,
        depth_slice: i32,
        resolveTarget: Option<&Resource<JSTextureView>>,
        clearValueR: f64,
        clearValueG: f64,
        clearValueB: f64,
        clearValueA: f64,
        store_opt: StoreOpt,
    ) -> Resource<JSRenderPassColorAttachment>;
    pub fn create_render_pass_color_attachment_load(
        view: &Resource<JSTextureView>,
        depth_slice: i32,
        resolveTarget: &Resource<JSTextureView>,
        store_opt: StoreOpt,
    ) -> Resource<JSRenderPassColorAttachment>;

    fn execute_bundles(
        renderpassencoder: &Resource<JSRenderPassEncoder>,
        bundle: &Resource<JSRenderBundle>,
    );
    fn end(renderpassencoder: &Resource<JSRenderPassEncoder>);

}

pub struct JSRenderPassEncoder(());
pub struct JSRenderPassColorAttachment(());

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
    fn after_set_bindgroup<const N: usize>(&mut self, bindgroup: &BindGroup<N>) {
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
        buffer: &mut super::buffer::buffer::GPUBuffer<false, false, false, false, true>,
    ) {
        todo!()
    }
}

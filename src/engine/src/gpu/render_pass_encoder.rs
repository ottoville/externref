use externref::{externref, Resource};

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

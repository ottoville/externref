use std::{cell::LazyCell, sync::Arc};

use externref::{externref, Resource};

use crate::{
    allocators::explicit_generational_freelist::ExplicitGenerationalFreeList,
    cameras::{camera::Camera, camera_group::CameraGroup},
    mesh::ENGINE,
};

use super::{
    bindgroup::BindGroup,
    command_encoder::GPUCommandEncoder,
    compute_pass_encoder::ComputePassEncoder,
    gpu::{get_renderpass_descriptor, JSDevice},
    renderbundle::{JSFunction, JSRenderBundleDescriptor, RenderBundleEncoder},
};
thread_local! {
    static RENDERPASS_LABEL:LazyCell<String> = const { LazyCell::new(||String::from("rust_renderpass")) };
}
#[no_mangle]
pub unsafe extern "C" fn resize_renderpass(
    id: usize,
    width: u32,
    height: u32,
    computepass: *mut ComputePassEncoder,
) {
    let mut gpuopt = ENGINE.gpu.lock().unwrap();
    let gpu = gpuopt.as_mut().unwrap();
    let renderpass = &mut gpu.renderpasses[id];
    for cameragroup in &mut renderpass.cameragroups {
        cameragroup.update_size_bind_group(
            &gpu.device,
            width,
            height,
            &gpu.cameras,
            &mut *computepass,
        );
    }
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn link_renderpass(
    id: usize,
    renderpass: Resource<JSRenderPass>,
    descriptor: Resource<JSRenderBundleDescriptor>,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
    record: Resource<JSFunction>,
) -> *mut RenderBundleEncoder {
    let mut gpuopt = ENGINE.gpu.lock().unwrap();
    let gpu = gpuopt.as_mut().unwrap();
    gpu.renderpasses[id].jsrenderpass = Some(renderpass);
    gpu.renderpasses[id].bundle = Some(RenderBundleEncoder::new(
        String::from_raw_parts(label_ptr, label_len, label_cap),
        &gpu.device,
        descriptor,
        record,
    ));
    gpu.renderpasses[id].bundle.as_mut().unwrap()
}
pub struct JSRenderPassDescriptor(());
pub struct JSRenderPass(());

pub struct Renderpass {
    // TODO: remove option
    pub bundle: Option<RenderBundleEncoder>,
    pub cameragroups: Vec<CameraGroup>,
    // TODO: remove option
    pub jsrenderpass: Option<Resource<JSRenderPass>>,
}
impl Renderpass {
    pub fn render(
        &mut self,
        command_encoder: GPUCommandEncoder,
        device: &Resource<JSDevice>,
        cameras: &ExplicitGenerationalFreeList<Camera>,
        gpu_buffer: usize,
        bind_group_position: &Arc<BindGroup>,
    ) -> GPUCommandEncoder {
        return RENDERPASS_LABEL.with(|label| {
            let descriptor =
                unsafe { get_renderpass_descriptor(self.jsrenderpass.as_ref().unwrap()) };
            let mut renderpass_encoder = command_encoder.begin_render_pass(label, &descriptor);
            self.bundle.as_mut().unwrap().record_renderbundle(
                &self.cameragroups,
                device,
                cameras,
                gpu_buffer,
                bind_group_position,
                |renderbundle| {
                    renderpass_encoder.execute_bundles(renderbundle);
                },
            );
            return renderpass_encoder.end();
        });
    }
}

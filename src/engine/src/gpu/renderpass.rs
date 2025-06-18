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
#[externref]
#[no_mangle]
pub unsafe extern "C" fn resize_renderpass(
    width: u32,
    height: u32,
    computepass: *mut ComputePassEncoder,
    cameragroups: *mut Vec<CameraGroup>,
    cameras: *const ExplicitGenerationalFreeList<Camera>,
    device: &Resource<JSDevice>
) {
    for cameragroup in &mut *cameragroups {
        cameragroup.update_size_bind_group(
            device,
            width,
            height,
            &(*cameras),
            &mut *computepass,
        );
    }
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn link_renderpass(
    id: usize,
    descriptor: Resource<JSRenderBundleDescriptor>,
    record: Resource<JSFunction>,
) -> *mut RenderBundleEncoder {
    let mut gpuopt = ENGINE.gpu.lock().unwrap();
    let gpu = gpuopt.as_mut().unwrap();
    gpu.renderpasses[id].bundle = Some(RenderBundleEncoder::new(
        gpu.renderpasses[id].label.clone(),
        &gpu.device,
        descriptor,
        record,
    ));
    gpu.renderpasses[id].bundle.as_mut().unwrap()
}
pub struct JSRenderPassDescriptor(());
pub struct JSRenderPass(());

pub struct Renderpass {
    pub bundle: Option<RenderBundleEncoder>,
    pub cameragroups: Vec<CameraGroup>,
    pub jsrenderpass: Resource<JSRenderPass>,
    pub label: String
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
                unsafe { get_renderpass_descriptor(&self.jsrenderpass) };
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

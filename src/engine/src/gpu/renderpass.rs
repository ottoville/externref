use std::{
    cell::LazyCell,
    num::{NonZero, NonZeroU32},
    sync::Arc,
};

use externref::{externref, Resource};
use terramath::VectorMath;

use crate::{
    allocators::explicit_generational_freelist::ExplicitGenerationalFreeList,
    cameras::{camera::Camera, camera_group::CameraGroup},
    gpu::gpu::GPU,
    mesh::ENGINE,
    MULTIVALUE_F32,
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
#[no_mangle]
pub unsafe extern "C" fn pick_position(
    id: usize,
    mouse_x: f32,
    mouse_y: f32,
    z: f32,
) -> *const f32 {
    let gpuopt = ENGINE.gpu.lock().unwrap();
    let gpu = gpuopt.as_ref().unwrap();
    gpu.renderpasses[id].pick_position(gpu, mouse_x, mouse_y, z)
}
#[no_mangle]
pub unsafe extern "C" fn get_renderpass_size(id: usize) -> *const [NonZero<u32>; 2] {
    let mut gpuopt = ENGINE.gpu.lock().unwrap();
    let gpu = gpuopt.as_mut().unwrap();
    &gpu.renderpasses[id].size
}
pub struct JSRenderPassDescriptor(());
pub struct JSRenderPass(());

pub struct Renderpass {
    pub bundle: Option<RenderBundleEncoder>,
    pub cameragroups: Vec<CameraGroup>,
    pub jsrenderpass: Resource<JSRenderPass>,
    pub label: String,
    pub size: [NonZeroU32; 2],
    pub size_modifier: Option<fn(&mut NonZeroU32, &mut NonZeroU32)>,
}
impl Renderpass {
    pub fn pick_position(&self, gpu: &GPU, mouse_x: f32, mouse_y: f32, z: f32) -> *const f32 {
        let x = (mouse_x as f32 / self.size[0].get() as f32) * 2.0 - 1.0;
        let y = -((mouse_y as f32 / self.size[1].get() as f32) * 2.0 - 1.0);
        let camera_id = self.cameragroups[0].cameras[0];
        let camera = gpu.get_camera_by_id(camera_id);
        let result = [x, y, z].transform(&camera.projection_view_inverted);
        unsafe {
            MULTIVALUE_F32[0] = result[0];
            MULTIVALUE_F32[1] = result[1];
            MULTIVALUE_F32[2] = result[2];
            return MULTIVALUE_F32.as_ptr();
        }
    }
    pub fn resize(
        &mut self,
        mut width: NonZeroU32,
        mut height: NonZeroU32,
        device: &Resource<JSDevice>,
        cameras: &ExplicitGenerationalFreeList<Camera>,
        computepass: &mut ComputePassEncoder,
    ) {
        if let Some(size_modifier) = self.size_modifier {
            size_modifier(&mut width, &mut height)
        }
        self.size = [width, height];
        for cameragroup in &mut self.cameragroups {
            cameragroup.update_size_bind_group(device, width, height, &(*cameras), computepass);
        }
    }
    pub fn render(
        &mut self,
        command_encoder: GPUCommandEncoder,
        device: &Resource<JSDevice>,
        cameras: &ExplicitGenerationalFreeList<Camera>,
        gpu_buffer: usize,
        bind_group_position: &Arc<BindGroup<1>>,
    ) -> GPUCommandEncoder {
        return RENDERPASS_LABEL.with(|label| {
            let descriptor = unsafe { get_renderpass_descriptor(&self.jsrenderpass) };
            let mut renderpass_encoder = command_encoder.begin_render_pass(label, &descriptor);
            if let Some(bundle) = self.bundle.as_mut() {
                bundle.record_renderbundle(
                    &self.cameragroups,
                    device,
                    cameras,
                    gpu_buffer,
                    bind_group_position,
                    |renderbundle| {
                        renderpass_encoder.execute_bundles(renderbundle);
                    },
                );
            }

            return renderpass_encoder.end();
        });
    }
}

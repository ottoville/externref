use std::{
    cell::LazyCell,
    num::{NonZero, NonZeroU32},
    sync::Arc,
};

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeList;
use externref::{externref, Resource};
use terramath::VectorMath;
use webgpu::{
    bindgroup::bindgroup::BindGroup,
    color_attachment::{
        color_attachment::ColorAttachment, color_attachment_single_sampled::ColorAttachmentSingleSampled,
    },
    command_encoder::GPUCommandEncoder,
    compute_pass_encoder::{ComputePassEncoder, JSComputePipeline},
    device::JSDevice,
    queue::Queue,
    renderbundle::JSFunction,
    texture::depth_texture::DepthTexture,
};

use crate::{
    cameras::{camera::Camera, camera_group::CameraGroup},
    gpu::{gpu::GPU, renderbundle_encoder::RenderBundleEncoder, renderpass_trait::RenderPassTrait},
    mesh::ENGINE,
    swapbuffers::SwapBuffers,
    MULTIVALUE_F32,
};

use super::gpu::get_renderpass_descriptor;
thread_local! {
    static RENDERPASS_LABEL:LazyCell<String> = const { LazyCell::new(||String::from("rust_renderpass")) };
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn link_renderpass(
    id: usize,
    record: Resource<JSFunction>,
    depth_read_only: bool,
    stencil_read_only: bool,
) -> *const RenderBundleEncoder {
    let mut gpuopt = ENGINE.gpu.lock().unwrap();
    let gpu = gpuopt.as_mut().unwrap();
    let label = gpu.renderpasses[id].label().to_string();
    let renderpass = &mut gpu.renderpasses[id];

    renderpass.set_bundle(RenderBundleEncoder::new(
        label,
        &gpu.device,
        renderpass.formats(),
        record,
        renderpass.sample_count(),
        depth_read_only,
        stencil_read_only,
        renderpass.depth_stencil_format(),
    ));
    gpu.renderpasses[id].get_bundle()
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
    &gpu.renderpasses[id].size()
}
pub struct JSRenderPass(());

pub struct Renderpass<const N: usize> {
    bundle: Option<RenderBundleEncoder>,
    cameragroups: Vec<CameraGroup>,
    jsrenderpass: Resource<JSRenderPass>,
    label: String,
    size: [NonZeroU32; 2],
    size_modifier: Option<fn(&mut NonZeroU32, &mut NonZeroU32)>,
    render_targets: [ColorAttachmentSingleSampled; N],
    depth_render_target: Option<Box<dyn DepthTexture + Send>>,
    formats: Vec<u32>,
}
impl<const N: usize> Renderpass<N> {
    pub fn new(
        label: String,
        size: [NonZero<u32>; 2],
        size_modifier: Option<fn(&mut NonZero<u32>, &mut NonZero<u32>)>,
        jsrenderpass: Resource<JSRenderPass>,
        cameragroups: Vec<CameraGroup>,
        render_targets: [ColorAttachmentSingleSampled; N],
        depth_render_target: Option<Box<dyn DepthTexture + Send>>,
    ) -> Self {
        let mut formats = [0; N];
        for n in 0..N {
            formats[n] = render_targets[n].texture_view().to_number();
        }

        Renderpass {
            label,
            size,
            size_modifier,
            jsrenderpass,
            bundle: None,
            cameragroups,
            render_targets,
            depth_render_target,
            formats: Vec::from(formats),
        }
    }
}

impl<const N: usize> RenderPassTrait for Renderpass<N> {
    fn jsrenderpass(&self) -> &Resource<JSRenderPass> {
        &self.jsrenderpass
    }

    fn render(
        &mut self,
        command_encoder: GPUCommandEncoder,
        device: &Resource<JSDevice>,
        cameras: &ExplicitGenerationalFreeList<Camera>,
        gpu_buffer: usize,
        bind_group_position: &Arc<BindGroup<1>>,
    ) -> GPUCommandEncoder {
        return RENDERPASS_LABEL.with(|label| {
            let attachments = self
                .render_targets
                .iter_mut()
                .map(|rendertarget| rendertarget.get_attachment());

            // if let Some(depth_render_target) = &self.depth_render_target {}

            let descriptor = unsafe { get_renderpass_descriptor(&self.jsrenderpass) };
            let mut renderpass_encoder =
                command_encoder.begin_render_pass(label, &descriptor, attachments);
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
    fn size(&self) -> [NonZeroU32; 2] {
        self.size
    }

    fn resize(
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
        /*for render_target in self.render_targets.iter_mut() {
            render_target.resize()
        }*/
    }

    fn set_bundle(&mut self, bundle: RenderBundleEncoder) {
        self.bundle = Some(bundle);
    }

    fn get_bundle(&self) -> &RenderBundleEncoder {
        self.bundle.as_ref().unwrap()
    }

    fn label(&self) -> &str {
        &self.label
    }
    fn pick_position(&self, gpu: &GPU, mouse_x: f32, mouse_y: f32, z: f32) -> *const f32 {
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

    fn cameragroups(&mut self) -> &mut Vec<CameraGroup> {
        &mut self.cameragroups
    }
    fn do_pick(
        &mut self,
        _device: &Resource<JSDevice>,
        _swap_buffers: &mut SwapBuffers,
        _queue: &Queue,
        _pickpipeline: &Resource<JSComputePipeline>,
        _mouse_x: u32,
        _mouse_y: u32,
    ) {
        todo!()
    }
    fn sample_count(&self) -> u32 {
        1
    }

    fn depth_stencil_format(&self) -> Option<u32> {
        match &self.depth_render_target {
            Some(format) => Some(format.to_number()),
            None => None,
        }
    }
    fn formats(&self) -> &Vec<u32> {
        &self.formats
    }
}

use std::{
    num::{NonZero, NonZeroU32},
    rc::Rc,
};

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeList;
use externref::Resource;
use logger::LoggerArray;
use terramath::VectorMath;
use webgpu::{
    bindgroup::bindgroup::BindGroup,
    color_attachment::{
        color_attachment::ColorAttachment,
        color_attachment_multi_sampled::ColorAttachmentMultiSampled,
        depth_stencil_attachment::DepthStencilAttachment,
    },
    command_encoder::GPUCommandEncoder,
    compute_pass_encoder::{ComputePassEncoder, JSComputePipeline},
    device::JSDevice,
    queue::Queue,
    renderpass::renderpass_descriptor::JSRenderPassDescriptor,
};

use crate::{
    cameras::{camera::Camera, camera_group::CameraGroup},
    gpu::{
        gpu::{get_renderpass_descriptor, GPU},
        renderbundle_encoder::RenderBundleEncoder,
        renderpass::{create_render_pass_descriptor2, JSRenderPass},
        renderpass_trait::RenderPassTrait,
    },
    swapbuffers::SwapBuffers,
    MULTIVALUE_F32,
};
pub struct RenderpassMSAA<const N: usize> {
    pub bundle: Option<RenderBundleEncoder>,
    pub cameragroups: Vec<CameraGroup>,
    pub jsrenderpass: Resource<JSRenderPass>,
    pub label: String,
    pub size: [NonZeroU32; 2],
    pub size_modifier: Option<fn(&mut NonZeroU32, &mut NonZeroU32)>,
    pub render_targets: [ColorAttachmentMultiSampled; N],
    pub depth_render_target: Option<DepthStencilAttachment<4, false>>,
    formats: Vec<u32>,
    descriptor: Resource<JSRenderPassDescriptor>,
}
impl<const N: usize> RenderpassMSAA<N> {
    pub fn new(
        label: String,
        size: [NonZero<u32>; 2],
        size_modifier: Option<fn(&mut NonZero<u32>, &mut NonZero<u32>)>,
        jsrenderpass: Resource<JSRenderPass>,
        cameragroups: Vec<CameraGroup>,
        mut render_targets: [ColorAttachmentMultiSampled; N],
        mut depth_render_target: Option<DepthStencilAttachment<4, false>>,
    ) -> Self {
        let mut formats = [0; N];
        for n in 0..N {
            formats[n] = render_targets[n].texture_view().borrow().to_number();
        }
        let descriptor =
            create_render_pass_descriptor2(&mut render_targets, &mut depth_render_target, &label);

        RenderpassMSAA {
            label,
            size,
            size_modifier,
            jsrenderpass,
            bundle: None,
            cameragroups,
            render_targets,
            depth_render_target,
            formats: Vec::from(formats),
            descriptor,
        }
    }
}
impl<const N: usize> RenderPassTrait for RenderpassMSAA<N> {
    fn jsrenderpass(&self) -> &Resource<JSRenderPass> {
        &self.jsrenderpass
    }

    fn render(
        &mut self,
        command_encoder: GPUCommandEncoder,
        device: &Resource<JSDevice>,
        cameras: &ExplicitGenerationalFreeList<Camera>,
        gpu_buffer: usize,
        bind_group_position: &Rc<BindGroup<1>>,
    ) -> GPUCommandEncoder {
        let descriptor = unsafe { get_renderpass_descriptor(&self.jsrenderpass) };
        let mut dirty = self
            .render_targets
            .iter()
            .any(|render_target| render_target.is_dirty());
        if !dirty {
            if let Some(depth_render_target) = &self.depth_render_target {
                dirty = depth_render_target.is_dirty();
            }
        }
        if dirty {
            ["dirty", &self.label].log();
            self.descriptor = create_render_pass_descriptor2(
                &mut self.render_targets,
                &mut self.depth_render_target,
                &self.label,
            );
        }

        let mut renderpass_encoder =
            command_encoder.begin_render_pass(&descriptor, &self.descriptor);
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
        for render_target in self.render_targets.iter_mut() {
            render_target.resize(device, width, height);
        }
        if let Some(depth_render_target) = &self.depth_render_target {
            [
                "Resize depth_render_target",
                &width.to_string(),
                &height.to_string(),
            ]
            .log();
            depth_render_target.resize(device, width, height);
        }
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

    fn formats(&self) -> &Vec<u32> {
        &self.formats
    }

    fn sample_count(&self) -> u32 {
        4
    }

    fn depth_stencil_format(&self) -> Option<u32> {
        match &self.depth_render_target {
            Some(format) => Some(format.texture_view.borrow().to_number()),
            None => None,
        }
    }
}

use std::{
    num::{NonZero, NonZeroU32},
    rc::Rc,
};

use externref::{externref, Resource};
use terramath::VectorMath;
use webgpu::{
    bindgroup::bindgroup::BindGroup,
    color_attachment::{
        color_attachment::ColorAttachment, depth_stencil_attachment::DepthStencilAttachment,
    },
    command_encoder::GPUCommandEncoder,
    compute_pass_encoder::{ComputePassEncoder, JSComputePipeline},
    device::JSDevice,
    queue::Queue,
    renderbundle::JSFunction,
    renderpass::renderpass_descriptor::{
        create_render_pass_descriptor, push_color_attachment_to_render_pass_descriptor,
        JSRenderPassDescriptor,
    },
};

use crate::{
    cameras::{camera::Camera, camera_group::CameraGroup},
    gpu::{gpu::GPU, renderbundle_encoder::RenderBundleEncoder, renderpass_trait::RenderPassTrait},
    swapbuffers::SwapBuffers,
    MULTIVALUE_F32,
};

use super::gpu::get_renderpass_descriptor;
#[externref]
#[no_mangle]
pub unsafe extern "C" fn link_renderpass(
    id: usize,
    record: Resource<JSFunction>,
    depth_read_only: bool,
    stencil_read_only: bool,
    gpu_ptr: *mut GPU,
) -> *const RenderBundleEncoder {
    let gpu = &mut (*gpu_ptr);
    let label = gpu.renderpasses[id].label().to_string();
    let renderpass = &mut gpu.renderpasses[id];

    renderpass.set_bundle(RenderBundleEncoder::new(
        label,
        &(*gpu).device,
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
    gpu_ptr: *mut GPU,
) -> *const f32 {
    let gpu = &mut (*gpu_ptr);
    gpu.renderpasses[id].pick_position(mouse_x, mouse_y, z)
}
#[no_mangle]
pub unsafe extern "C" fn get_renderpass_size(id: usize, gpu_ptr: *mut GPU) -> *const NonZero<u32> {
    let gpu = &mut (*gpu_ptr);
    gpu.renderpasses[id].size().as_ptr()
}
pub struct JSRenderPass(());

pub struct Renderpass<const N: usize, const SAMPLE_COUNT: u32, T: ColorAttachment<SAMPLE_COUNT>> {
    bundle: Option<RenderBundleEncoder>,
    cameragroups: Vec<CameraGroup>,
    jsrenderpass: Resource<JSRenderPass>,
    label: String,
    size: [NonZeroU32; 2],
    size_modifier: Option<fn(&mut NonZeroU32, &mut NonZeroU32)>,
    render_targets: [T; N],
    depth_render_target: Option<DepthStencilAttachment<SAMPLE_COUNT, false>>,
    formats: Vec<u32>,
    descriptor: Resource<JSRenderPassDescriptor>,
}
pub fn create_render_pass_descriptor2<
    const N: usize,
    const SAMPLE_COUNT: u32,
    const DEPTH_READ_ONLY: bool,
    T: ColorAttachment<SAMPLE_COUNT>,
>(
    render_targets: &mut [T; N],
    depth_render_target: &mut Option<DepthStencilAttachment<SAMPLE_COUNT, DEPTH_READ_ONLY>>,
    label: &String,
) -> Resource<JSRenderPassDescriptor> {
    let depth_externref = match depth_render_target {
        Some(depth_render_target2) => Some(depth_render_target2.get_attachment()),
        None => None,
    };

    let descriptor = unsafe {
        create_render_pass_descriptor(label.as_ptr() as usize, label.len(), depth_externref)
    };
    for attachment in render_targets.iter_mut() {
        unsafe {
            push_color_attachment_to_render_pass_descriptor(
                &descriptor,
                attachment.get_attachment(),
            )
        };
    }
    return descriptor;
}
impl<const N: usize, const SAMPLE_COUNT: u32, T: ColorAttachment<SAMPLE_COUNT>>
    Renderpass<N, SAMPLE_COUNT, T>
{
    pub fn new(
        label: String,
        size: [NonZero<u32>; 2],
        size_modifier: Option<fn(&mut NonZero<u32>, &mut NonZero<u32>)>,
        jsrenderpass: Resource<JSRenderPass>,
        cameragroups: Vec<CameraGroup>,
        mut render_targets: [T; N],
        mut depth_render_target: Option<DepthStencilAttachment<SAMPLE_COUNT, false>>,
    ) -> Self {
        let mut formats = [0; N];
        for n in 0..N {
            formats[n] = render_targets[n].texture_view().borrow().to_number();
        }
        let descriptor =
            create_render_pass_descriptor2(&mut render_targets, &mut depth_render_target, &label);
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
            descriptor,
        }
    }
}

impl<const N: usize, const SAMPLE_COUNT: u32, T: ColorAttachment<SAMPLE_COUNT>> RenderPassTrait
    for Renderpass<N, SAMPLE_COUNT, T>
{
    fn jsrenderpass(&self) -> &Resource<JSRenderPass> {
        &self.jsrenderpass
    }

    fn render(
        &mut self,
        command_encoder: GPUCommandEncoder,
        device: &Resource<JSDevice>,
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
                &mut self.cameragroups,
                device,
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
        computepass: &mut ComputePassEncoder,
    ) {
        if let Some(size_modifier) = self.size_modifier {
            size_modifier(&mut width, &mut height)
        }
        self.size = [width, height];
        for cameragroup in &mut self.cameragroups {
            cameragroup.update_size_bind_group(device, width, height, computepass);
        }
        for render_target in self.render_targets.iter_mut() {
            render_target.resize(device, width, height);
        }
        if let Some(depth_render_target) = &self.depth_render_target {
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
    fn pick_position(&self, mouse_x: f32, mouse_y: f32, z: f32) -> *const f32 {
        let x = (mouse_x as f32 / self.size[0].get() as f32) * 2.0 - 1.0;
        let y = -((mouse_y as f32 / self.size[1].get() as f32) * 2.0 - 1.0);
        let camera_rc = &self.cameragroups[0].cameras.vec[0];
        let updated = camera_rc.upgrade().unwrap();
        let camera = updated.camera.borrow();
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
        SAMPLE_COUNT
    }

    fn depth_stencil_format(&self) -> Option<u32> {
        match &self.depth_render_target {
            Some(format) => Some(format.texture_view.borrow().to_number()),
            None => None,
        }
    }
    fn formats(&self) -> &Vec<u32> {
        &self.formats
    }
}

use std::{num::NonZeroU32, rc::Rc};

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeList;
use externref::Resource;
use webgpu::{
    bindgroup::bindgroup::BindGroup,
    command_encoder::GPUCommandEncoder,
    compute_pass_encoder::{ComputePassEncoder, JSComputePipeline},
    device::JSDevice,
    queue::Queue,
};

use crate::{
    cameras::{camera::Camera, camera_group::CameraGroup},
    gpu::{gpu::GPU, renderbundle_encoder::RenderBundleEncoder, renderpass::JSRenderPass},
    swapbuffers::SwapBuffers,
};

pub trait RenderPassTrait {
    fn sample_count(&self) -> u32;
    fn depth_stencil_format(&self) -> Option<u32>;
    fn cameragroups(&mut self) -> &mut Vec<CameraGroup>;
    fn resize(
        &mut self,
        _width: NonZeroU32,
        _height: NonZeroU32,
        _device: &Resource<JSDevice>,
        _cameras: &ExplicitGenerationalFreeList<Camera>,
        _computepass: &mut ComputePassEncoder,
    );
    fn render(
        &mut self,
        command_encoder: GPUCommandEncoder,
        device: &Resource<JSDevice>,
        cameras: &ExplicitGenerationalFreeList<Camera>,
        gpu_buffer: usize,
        bind_group_position: &Rc<BindGroup<1>>,
    ) -> GPUCommandEncoder;
    fn jsrenderpass(&self) -> &Resource<JSRenderPass>;
    fn size(&self) -> [NonZeroU32; 2];

    fn set_bundle(&mut self, bundle: RenderBundleEncoder);
    fn get_bundle(&self) -> &RenderBundleEncoder;
    fn label(&self) -> &str;

    fn pick_position(&self, gpu: &GPU, mouse_x: f32, mouse_y: f32, z: f32) -> *const f32;
    fn do_pick(
        &mut self,
        device: &Resource<JSDevice>,
        swap_buffers: &mut SwapBuffers,
        queue: &Queue,
        pickpipeline: &Resource<JSComputePipeline>,
        mouse_x: u32,
        mouse_y: u32,
    );
    fn formats(&self) -> &Vec<u32>;
}

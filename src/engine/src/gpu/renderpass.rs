use std::{
    cell::RefCell,
    num::{NonZero, NonZeroU32},
    rc::Rc,
    sync::atomic::{AtomicU32, Ordering},
};

use externref::{externref, Resource};
use logger::LoggerArray;
use terramath::VectorMath;
use webgpu::{
    bindgroup::{
        bindgroup::BindGroup, bufferbinding::BufferBinding, texturebinding::TextureBinding,
    },
    bindgroup_layout::BindGroupLayout,
    binding_commands::BindingCommands,
    buffer::{buffer::GPUBuffer, mapped_buffer::MappedGPUBuffer},
    color_attachment::{
        color_attachment::{ColorAttachment, ColorAttachmentWithSample, StoreOpt},
        depth_stencil_attachment::DepthStencilAttachment,
    },
    command_encoder::GPUCommandEncoder,
    compute_pass_encoder::ComputePassEncoder,
    device::JSDevice,
    renderbundle::JSFunction,
    renderpass::renderpass_descriptor::{
        create_render_pass_descriptor, push_color_attachment_to_render_pass_descriptor,
        JSRenderPassDescriptor,
    },
    texture::depth_texture::DepthTexture2,
};

use crate::{
    cameras::camera_group::CameraGroup,
    gpu::{
        gpu::{Renderpassenum, GPU},
        renderbundle_encoder::RenderBundleEncoder,
    },
    MULTIVALUE_F32,
};

#[externref]
#[no_mangle]
pub unsafe extern "C" fn link_renderpass(
    renderpass_id: u32,
    record: Resource<JSFunction>,
    depth_read_only: bool,
    stencil_read_only: bool,
    gpu_ptr: *mut GPU,
) -> *const RenderBundleEncoder {
    let gpu = &mut (*gpu_ptr);

    let r = gpu.get_renderpass(renderpass_id);
    match r {
        Renderpassenum::Singlesampled(renderpass) => {
            let label = renderpass.inner_renderpass.label.to_string();
            renderpass
                .inner_renderpass
                .bundle
                .insert(RenderBundleEncoder::new::<1>(
                    label,
                    &(*gpu_ptr).device,
                    &renderpass.inner_renderpass.formats,
                    record,
                    depth_read_only,
                    stencil_read_only,
                    renderpass.depth_stencil_format(),
                ))
        }
        Renderpassenum::Multisampled(renderpass) => {
            let label = renderpass.inner_renderpass.label.to_string();
            renderpass
                .inner_renderpass
                .bundle
                .insert(RenderBundleEncoder::new::<4>(
                    label,
                    &(*gpu_ptr).device,
                    &renderpass.inner_renderpass.formats,
                    record,
                    depth_read_only,
                    stencil_read_only,
                    renderpass.depth_stencil_format(),
                ))
        }
    }
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
    let r = gpu.get_renderpass(id as u32);
    match r {
        Renderpassenum::Singlesampled(renderpass) => renderpass.pick_position(mouse_x, mouse_y, z),
        Renderpassenum::Multisampled(renderpass) => renderpass.pick_position(mouse_x, mouse_y, z),
    }
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn do_pick(
    id: usize,
    pickpipeline: &Resource<JSComputePipeline>,
    gpu_ptr: *mut GPU,
) {
    let gpu = &mut (*gpu_ptr);

    let camera_id = {
        let renderpass = &mut gpu.renderpasses[id];
        renderpass.cameragroups()[0].cameras[0]
    };
    gpu.renderpasses[id].do_pick(
        &gpu.device,
        gpu.device_pixel_ratio,
        &mut gpu.swap_buffers,
        &gpu.queue,
        pickpipeline,
        gpu.get_camera_by_id(camera_id),
    );
}
#[no_mangle]
pub unsafe extern "C" fn get_renderpass_size(id: usize, gpu_ptr: *mut GPU) -> *const NonZero<u32> {
    let gpu = &mut (*gpu_ptr);
    let r = gpu.get_renderpass(id as u32);
    match r {
        Renderpassenum::Singlesampled(renderpass) => renderpass.inner_renderpass.size.as_ptr(),
        Renderpassenum::Multisampled(renderpass) => renderpass.inner_renderpass.size.as_ptr(),
    }
}
pub struct JSRenderPass(());
static NEXT_RENDERPASS_ID: AtomicU32 = AtomicU32::new(0);
#[repr(C)]
struct PickData {
    z: f32,
    mesh_id: u32,
    generation: u32,
}
pub struct PickableProperties {
    pub pick_bglayout: BindGroupLayout<4>,
    pub pick_render_target_view:
        Rc<RefCell<TextureView<RG32UINT, 1, true, false, true, false, true>>>,
}
struct Pickable {
    pickbuffer: Rc<RefCell<GPUBuffer<false, false, true, false, false, false, false, true>>>,
    pickbuffer_read: Rc<RefCell<Option<GPUBuffer<true, false, false, true>>>>,
    mouse_position_buffer: Rc<RefCell<GPUBuffer<false, false, false, true, false, false, true>>>,
    pick_position_bind_group0: Rc<BindGroup<4>>,
}
pub struct InnerRenderpass<const SAMPLE_COUNT: u32, T: ColorAttachment> {
    pub bundle: Option<RenderBundleEncoder>,
    pub cameragroups: Vec<CameraGroup>,
    pub jsrenderpass: Resource<JSRenderPass>,
    label: String,
    pub size: [NonZeroU32; 2],
    size_modifier: Option<fn(&mut NonZeroU32, &mut NonZeroU32)>,
    render_targets: Box<[T]>,
    depth: Option<DepthStencilAttachment<false>>,
    formats: Vec<u32>,
    // Only for picking
    pickable: Option<Pickable>,
}
pub struct Renderpass<const SAMPLE_COUNT: u32, T: ColorAttachment> {
    pub inner_renderpass: InnerRenderpass<SAMPLE_COUNT, T>,
    descriptor: Resource<JSRenderPassDescriptor>,
    pub id: u32,
}

impl<const SAMPLE_COUNT: u32, T: ColorAttachmentWithSample<SAMPLE_COUNT>>
    InnerRenderpass<SAMPLE_COUNT, T>
{
    fn create_render_pass_descriptor(&mut self) -> Resource<JSRenderPassDescriptor> {
        let depth_externref = match &mut self.depth_render_target {
            Some(depth_render_target2) => Some(depth_render_target2.get_attachment()),
            None => None,
        };

        let descriptor = unsafe {
            create_render_pass_descriptor(
                self.label.as_ptr() as usize,
                self.label.len(),
                depth_externref,
            )
        };
        for attachment in self.render_targets.iter_mut() {
            unsafe {
                push_color_attachment_to_render_pass_descriptor(
                    &descriptor,
                    attachment.get_attachment(),
                )
            };
        }
        return descriptor;
    }
}
impl<const SAMPLE_COUNT: u32, T: ColorAttachmentWithSample<SAMPLE_COUNT>>
    Renderpass<SAMPLE_COUNT, T>
{
    pub fn new<const N: usize>(
        label: String,
        size: [NonZero<u32>; 2],
        size_modifier: Option<fn(&mut NonZero<u32>, &mut NonZero<u32>)>,
        jsrenderpass: Resource<JSRenderPass>,
        cameragroups: Vec<CameraGroup>,
        render_targets: [T; N],
        pickable_properties: Option<PickableProperties>,
    ) -> Self {
        let mut formats = [0; N];
        for n in 0..N {
            formats[n] = render_targets[n].texture_view().borrow().to_number();
        }
        let boxed_targets: Box<[T]> = Box::new(render_targets);
        let mut inner_renderpass = InnerRenderpass {
            label,
            size,
            size_modifier,
            jsrenderpass,
            bundle: None,
            cameragroups,
            render_targets: boxed_targets,
            depth: None,
            formats: Vec::from(formats),
            pickable: match pickable_properties {
                Some(pickable) => {
                    if let Some(depth_view) = &depth_render_view_opt {
                        let pickbuffer = Rc::new(RefCell::new(GPUBuffer::<
                            false,
                            false,
                            true,
                            false,
                            false,
                            false,
                            false,
                            true,
                        >::new(
                            &device,
                            unsafe { NonZeroUsize::new_unchecked(16) },
                            String::from("pickBuffer"),
                        )));
                        let pickbuffer_read = Rc::new(RefCell::new(Some(GPUBuffer::new(
                            &device,
                            unsafe { NonZeroUsize::new_unchecked(12) },
                            String::from("pickBufferRead"),
                        ))));
                        let binding = TextureBinding::new(depth_view.clone());
                        let pick_render_target_binding = TextureBinding::new(
                            pickable_properties.pick_render_target_view.clone(),
                        );
                        let pick_position_bind_group0 = BindGroup::new(
                            String::from("pickPositionBindGroup0"),
                            &pickable_properties.pick_bglayout,
                            [
                                BufferBinding::new(pickbuffer.clone(), 0, None),
                                Rc::new(RefCell::new(binding)),
                                Rc::new(RefCell::new(pick_render_target_binding)),
                                BufferBinding::new(mouse_position_buffer.clone(), 0, None),
                            ],
                        );
                        Some(Pickable {
                            pickbuffer: pickbuffer,
                            pickbuffer_read,
                            mouse_position_buffer: mouse_position_buffer,
                            pick_position_bind_group0,
                        })
                    } else {
                        panic!("Pickable renderpass without depth buffer is not supported yet")
                    }
                }
                None => None,
            },
        };
        let descriptor = inner_renderpass.create_render_pass_descriptor();
        Renderpass {
            inner_renderpass,
            id: NEXT_RENDERPASS_ID.fetch_add(1, Ordering::Relaxed),
            descriptor,
        }
    }
    pub fn width_depth<const N: usize>(
        label: String,
        size: [NonZero<u32>; 2],
        size_modifier: Option<fn(&mut NonZero<u32>, &mut NonZero<u32>)>,
        jsrenderpass: Resource<JSRenderPass>,
        cameragroups: Vec<CameraGroup>,
        render_targets: [T; N],
        depth_render_target: Rc<RefCell<impl DepthTexture2<SAMPLE_COUNT> + 'static>>,
        pickable_properties: Option<PickableProperties>,
    ) -> Self {
        let dattachment = Some(DepthStencilAttachment::new(
            depth_render_target,
            0.0,
            StoreOpt::Store,
        ));
        let mut formats = [0; N];
        for n in 0..N {
            formats[n] = render_targets[n].texture_view().borrow().to_number();
        }
        let boxed_targets: Box<[T]> = Box::new(render_targets);
        let mut inner_renderpass = InnerRenderpass {
            label,
            size,
            size_modifier,
            jsrenderpass,
            bundle: None,
            cameragroups,
            render_targets: boxed_targets,
            depth: dattachment,
            formats: Vec::from(formats),
            pickable: match pickable_properties {
                Some(pickable) => {
                    if let Some(depth_view) = &depth_render_view_opt {
                        let pickbuffer = Rc::new(RefCell::new(GPUBuffer::<
                            false,
                            false,
                            true,
                            false,
                            false,
                            false,
                            false,
                            true,
                        >::new(
                            &device,
                            unsafe { NonZeroUsize::new_unchecked(16) },
                            String::from("pickBuffer"),
                        )));
                        let pickbuffer_read = Rc::new(RefCell::new(Some(GPUBuffer::new(
                            &device,
                            unsafe { NonZeroUsize::new_unchecked(12) },
                            String::from("pickBufferRead"),
                        ))));
                        let binding = TextureBinding::new(depth_view.clone());
                        let pick_render_target_binding = TextureBinding::new(
                            pickable_properties.pick_render_target_view.clone(),
                        );
                        let pick_position_bind_group0 = BindGroup::new(
                            String::from("pickPositionBindGroup0"),
                            &pickable_properties.pick_bglayout,
                            [
                                BufferBinding::new(pickbuffer.clone(), 0, None),
                                Rc::new(RefCell::new(binding)),
                                Rc::new(RefCell::new(pick_render_target_binding)),
                                BufferBinding::new(mouse_position_buffer.clone(), 0, None),
                            ],
                        );
                        Some(Pickable {
                            pickbuffer: pickbuffer,
                            pickbuffer_read,
                            mouse_position_buffer: mouse_position_buffer,
                            pick_position_bind_group0,
                        })
                    } else {
                        panic!("Pickable renderpass without depth buffer is not supported yet")
                    }
                }
                None => None,
            },
        };
        let descriptor = inner_renderpass.create_render_pass_descriptor();

        Renderpass {
            inner_renderpass,
            id: NEXT_RENDERPASS_ID.fetch_add(1, Ordering::Relaxed),
            descriptor,
        }
    }
    pub fn render(
        &mut self,
        command_encoder: GPUCommandEncoder,
        device: &Resource<JSDevice>,
        gpu_buffer: usize,
        bind_group_position: &Rc<BindGroup<1>>,
    ) -> GPUCommandEncoder {
        let mut dirty = self
            .inner_renderpass
            .render_targets
            .iter()
            .any(|render_target| render_target.is_dirty());
        if !dirty {
            if let Some(depth_render_target) = &self.inner_renderpass.depth_render_target {
                dirty = depth_render_target.is_dirty();
            }
        }
        if dirty {
            self.descriptor = self.inner_renderpass.create_render_pass_descriptor();
        }
        let mut renderpass_encoder = command_encoder.begin_render_pass(&self.descriptor);
        if let Some(bundle) = self.inner_renderpass.bundle.as_mut() {
            bundle.record_renderbundle(
                &mut self.inner_renderpass.cameragroups,
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
    pub fn resize(
        &mut self,
        mut width: NonZeroU32,
        mut height: NonZeroU32,
        device: &Resource<JSDevice>,
        computepass: &mut ComputePassEncoder,
    ) {
        if let Some(size_modifier) = self.inner_renderpass.size_modifier {
            size_modifier(&mut width, &mut height)
        }
        self.inner_renderpass.size = [width, height];
        for cameragroup in &mut self.inner_renderpass.cameragroups {
            cameragroup.update_size_bind_group(device, width, height, computepass);
        }
        for render_target in self.inner_renderpass.render_targets.iter_mut() {
            render_target.resize(device, width, height);
        }
        if let Some(depth_render_target) = &self.inner_renderpass.depth_render_target {
            depth_render_target.resize(device, width, height);
        }
    }
    fn pick_position(&self, mouse_x: f32, mouse_y: f32, z: f32) -> *const f32 {
        let x = (mouse_x as f32 / self.inner_renderpass.size[0].get() as f32) * 2.0 - 1.0;
        let y = -((mouse_y as f32 / self.inner_renderpass.size[1].get() as f32) * 2.0 - 1.0);
        let camera_rc = &self.inner_renderpass.cameragroups[0].cameras.vec[0];
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
    fn depth_stencil_format(&self) -> Option<u32> {
        match &self.inner_renderpass.depth_render_target {
            Some(format) => Some(format.texture_view.borrow().to_number()),
            None => None,
        }
    }
}

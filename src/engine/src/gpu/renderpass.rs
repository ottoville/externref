use std::{
    cell::RefCell,
    num::{NonZero, NonZeroU32, NonZeroUsize},
    rc::Rc,
    sync::atomic::{AtomicU32, Ordering},
};

use externref::{externref, Resource};
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
    compute_pass_encoder::{ComputePassEncoder, JSComputePipeline},
    device::JSDevice,
    queue::Queue,
    renderbundle::JSFunction,
    renderpass::renderpass_descriptor::{
        create_render_pass_descriptor, push_color_attachment_to_render_pass_descriptor,
        JSRenderPassDescriptor,
    },
    texture::{
        bindgroup_entry_textureview::BindGroupEntryTextureView, depth_texture::DepthTexture2,
        texture_formats::RG32UINT, texture_view::TextureView,
    },
};

use crate::{
    cameras::{camera::Camera, camera_group::CameraGroup},
    engine::MOUSE_POSITION,
    gpu::{
        gpu::{Renderpassenum, RenderpassenumMut, GPU},
        renderbundle_encoder::RenderBundleEncoder,
    },
    swapbuffers::SwapBuffers,
};
pub struct JSFunctionPick(());

#[cfg(not(target_arch = "wasm32"))]
fn pick_cb(
    _cb: &Resource<JSFunctionPick>,
    _x: f32,
    _y: f32,
    _z: f32,
    _mesh_id: u32,
    generation: u32,
) {
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "env")]
extern "C" {
    fn pick_cb(
        cb: &Resource<JSFunctionPick>,
        x: f32,
        y: f32,
        z: f32,
        mesh_id: u32,
        generation: u32,
    );
}

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

    let r = gpu.get_renderpass_mut(renderpass_id);
    match r {
        RenderpassenumMut::Singlesampled(renderpass) => {
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
        RenderpassenumMut::Multisampled(renderpass) => {
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

#[externref]
#[no_mangle]
pub unsafe extern "C" fn do_pick(
    id: u32,
    pickpipeline: &Resource<JSComputePipeline>,
    gpu_ptr: *mut GPU,
    cb: Resource<JSFunctionPick>,
) {
    let gpu = &mut (*gpu_ptr);
    let r = gpu.get_renderpass(id);
    match r {
        Renderpassenum::Singlesampled(renderpass) => renderpass.do_pick(
            &gpu.device,
            gpu.device_pixel_ratio,
            &mut (*gpu_ptr).swap_buffers,
            &gpu.queue,
            pickpipeline,
            cb,
        ),
        Renderpassenum::Multisampled(renderpass) => renderpass.do_pick(
            &gpu.device,
            gpu.device_pixel_ratio,
            &mut (*gpu_ptr).swap_buffers,
            &gpu.queue,
            pickpipeline,
            cb,
        ),
    }
}
#[no_mangle]
pub unsafe extern "C" fn get_renderpass_size(id: usize, gpu_ptr: *mut GPU) -> *const NonZero<u32> {
    let gpu = &mut (*gpu_ptr);
    let r = gpu.get_renderpass_mut(id as u32);
    match r {
        RenderpassenumMut::Singlesampled(renderpass) => renderpass.inner_renderpass.size.as_ptr(),
        RenderpassenumMut::Multisampled(renderpass) => renderpass.inner_renderpass.size.as_ptr(),
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
    pub camera: Rc<Camera>,
}
struct Pickable {
    pickbuffer: Rc<RefCell<GPUBuffer<false, false, true, false, false, false, false, true>>>,
    pickbuffer_read: Rc<RefCell<Option<GPUBuffer<true, false, false, true>>>>,
    mouse_position_buffer: Rc<RefCell<GPUBuffer<false, false, false, true, false, false, true>>>,
    pick_position_bind_group0: Rc<BindGroup<4>>,
    camera: Rc<Camera>,
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
        let depth_externref = match &mut self.depth {
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
    pub fn add_camera(&mut self, camera: Rc<Camera>) {
        let weakcamera = Rc::downgrade(&camera);
        self.inner_renderpass.cameragroups[0]
            .cameras
            .push(weakcamera);
    }
    pub fn new<const N: usize>(
        label: String,
        size: [NonZero<u32>; 2],
        size_modifier: Option<fn(&mut NonZero<u32>, &mut NonZero<u32>)>,
        jsrenderpass: Resource<JSRenderPass>,
        cameragroups: Vec<CameraGroup>,
        render_targets: [T; N],
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
            pickable: None,
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
            pickable: None,
        };
        let descriptor = inner_renderpass.create_render_pass_descriptor();

        Renderpass {
            inner_renderpass,
            id: NEXT_RENDERPASS_ID.fetch_add(1, Ordering::Relaxed),
            descriptor,
        }
    }
    pub fn width_depth_pick<const N: usize>(
        device: &Resource<JSDevice>,
        label: String,
        size: [NonZero<u32>; 2],
        size_modifier: Option<fn(&mut NonZero<u32>, &mut NonZero<u32>)>,
        jsrenderpass: Resource<JSRenderPass>,
        cameragroups: Vec<CameraGroup>,
        render_targets: [T; N],
        depth_render_target: Rc<
            RefCell<impl DepthTexture2<SAMPLE_COUNT> + BindGroupEntryTextureView + 'static>,
        >,
        pickable_properties: PickableProperties,
    ) -> Self {
        let dattachment = Some(DepthStencilAttachment::new(
            depth_render_target.clone(),
            0.0,
            StoreOpt::Store,
        ));
        let mut formats = [0; N];
        for n in 0..N {
            formats[n] = render_targets[n].texture_view().borrow().to_number();
        }
        let boxed_targets: Box<[T]> = Box::new(render_targets);
        let mouse_position_buffer = Rc::new(RefCell::new(GPUBuffer::new(
            &device,
            unsafe { NonZeroUsize::new_unchecked(8) },
            String::from("mousePositionBuffer2"),
        )));
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
        let binding = TextureBinding::new(depth_render_target);
        let pick_render_target_binding =
            TextureBinding::new(pickable_properties.pick_render_target_view.clone());
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
            pickable: Some(Pickable {
                pickbuffer: pickbuffer,
                pickbuffer_read,
                mouse_position_buffer: mouse_position_buffer,
                pick_position_bind_group0,
                camera: pickable_properties.camera,
            }),
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
            if let Some(depth_render_target) = &self.inner_renderpass.depth {
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
        if let Some(depth_render_target) = &self.inner_renderpass.depth {
            depth_render_target.resize(device, width, height);
        }
    }
    fn do_pick(
        &self,
        device: &Resource<JSDevice>,
        device_pixel_ratio: f32,
        swap_buffers: &mut SwapBuffers,
        queue: &Queue,
        pickpipeline: &Resource<JSComputePipeline>,
        cb: Resource<JSFunctionPick>,
    ) {
        let mouse_position = MOUSE_POSITION.load(Ordering::Relaxed);
        let mouse_x = f32::from_bits((mouse_position & 0xFFFF_FFFF) as u32) * device_pixel_ratio;
        let mouse_y = f32::from_bits((mouse_position >> 32) as u32) * device_pixel_ratio;
        match &self.inner_renderpass.pickable {
            Some(pickable) => {
                pickable
                    .camera
                    .camera
                    .borrow_mut()
                    .update_camera_projection_view_inverted();
                let pickbuffer_read_opt = pickable.pickbuffer_read.take();
                if let Some(pickbuffer_read) = pickbuffer_read_opt {
                    let mut encoder =
                        GPUCommandEncoder::new(device, String::from("pickPosition_encoder"));
                    swap_buffers.get(
                        device,
                        unsafe { NonZeroUsize::new_unchecked(8) },
                        |buffer| {
                            buffer.set_mapped_range(&[mouse_x as u32, mouse_y as u32], 0);
                            encoder.copy_buffer_to_buffer(
                                &**buffer,
                                &pickable.mouse_position_buffer.borrow(),
                                0,
                                0,
                                unsafe { NonZeroUsize::new_unchecked(8) },
                            );
                        },
                    );
                    let mut pickpass = encoder.begin_compute_pass(String::from("pickPass"));
                    pickpass.set_pipeline(pickpipeline);
                    pickpass.set_bindgroup(device, 0, &pickable.pick_position_bind_group0, &[]);
                    pickpass.dispatch_workgroups(1, 1, 1);
                    let mut encoder = pickpass.end();
                    let size = unsafe { NonZeroUsize::new_unchecked(12) };
                    encoder.copy_buffer_to_buffer(
                        &*pickable.pickbuffer.borrow(),
                        &pickbuffer_read,
                        0,
                        0,
                        unsafe { NonZeroUsize::new_unchecked(12) },
                    );

                    queue.submit([encoder.finish(String::from("pick_encoder"))]);
                    let pickbuffer_rc_read = pickable.pickbuffer_read.clone();
                    let camera_rc = pickable.camera.clone();
                    let x =
                        (mouse_x as f32 / self.inner_renderpass.size[0].get() as f32) * 2.0 - 1.0;
                    let y = -((mouse_y as f32 / self.inner_renderpass.size[1].get() as f32) * 2.0
                        - 1.0);

                    pickbuffer_read.map_read_async(
                        0,
                        Some(size),
                        Box::new(move |buffer: MappedGPUBuffer<true, false, false, true>| {
                            let mut data = PickData {
                                z: 0.0,
                                mesh_id: 0,
                                generation: 0,
                            };
                            buffer.get_mapped_range(&mut data, 0);
                            *pickbuffer_rc_read.borrow_mut() = Some(buffer.unmap());
                            // Z is 0 when did not hit anything, far plane value
                            if data.z != 0.0 {
                                let camera = camera_rc.camera.borrow();
                                let result =
                                    [x, y, data.z].transform(&camera.projection_view_inverted);
                                unsafe {
                                    pick_cb(
                                        &cb,
                                        result[0],
                                        result[1],
                                        result[2],
                                        data.mesh_id,
                                        data.generation,
                                    )
                                };
                            }
                        }),
                    );
                }
            }
            None => todo!(),
        }
    }
    fn depth_stencil_format(&self) -> Option<u32> {
        match &self.inner_renderpass.depth {
            Some(format) => Some(format.texture_view.borrow().to_number()),
            None => None,
        }
    }
}

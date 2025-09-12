use std::cell::RefCell;
use std::num::{NonZeroU32, NonZeroUsize};
use std::ptr;
use std::sync::MutexGuard;
use std::sync::{Arc, Mutex};

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeList;
use externref::{externref, Resource};
use webgpu::bindgroup_layout::{BindGroupLayout, JSBindGroupLayout};
use webgpu::canvas::{Canvas, JSCanvas};
use webgpu::canvas_context::{AlphaMode, ColorSpace};
use webgpu::device::JSDevice;
use webgpu::texture::render_attachment_texture::RenderAttachmentTextureSingleSampled;
use webgpu::texture::texture::{Texture, TextureAspect, TextureViewDimension};
use webgpu::texture::texture_formats::{BGRA8UNORM, DEPTH32FLOAT, RG32UINT, RGBA8UNORM};

use crate::allocators::stack_allocator::StackAllocator;
use crate::cameras::camera::Camera;
use crate::cameras::camera_group::CameraGroup;
use crate::engine::get_preferred_canvas_format;
use crate::gpu::bindgroup_layout::{BufferBindingType, GPUBufferBindingLayout};
use crate::gpu::buffer::buffer::GPUBuffer;
use crate::gpu::command_encoder::JSCommandEncoder;
use crate::gpu::renderpass::RenderPassTrait;
use crate::gpu::renderpass_msaa::RenderpassMSAA;
use crate::gpu::shader::{
    SHADER_STAGE_COMPUTE, SHADER_STAGE_COMPUTE_AND_FRAGMENT, SHADER_STAGE_FRAGMENT,
    SHADER_STAGE_VERTEX, SHADER_STAGE_VERTEX_AND_FRAGMENT,
};
use crate::mesh::ENGINE;
use crate::mesh_property::MeshProperty;
use crate::projection::{Projection, PROJECTION_BUFFER_SIZE};
use crate::swapbuffers::SwapBuffers;
use crate::GPUMesh;

use super::bindgroup::{BindGroup, JSBindGroup};
use super::binding_commands::BindingCommands;
use super::buffer::buffer::JSBuffer;
use super::bufferbinding::BufferBinding;
use super::command_buffer::{CommandBuffer, JSCommandBuffer};
use super::command_encoder::GPUCommandEncoder;
use super::compute_pass_encoder::{ComputePassEncoder, JSComputePassEncoder, JSComputePipeline};
use super::lights::Lights;
use super::queue::JSQueue;
use super::queue::Queue;
use super::renderpass::{JSRenderPass, JSRenderPassDescriptor, Renderpass};
pub const GPU_MEMORY_INDEX_SIZE: usize = 256;
pub const DEFAULT_MAX_INSTANCES: usize = 10;

pub static TEMP_GPU_BUFFERS: Mutex<StackAllocator<Arc<Resource<JSBuffer>>, 16>> =
    Mutex::new(StackAllocator::new());
thread_local! {
    static GPU_QUEUE:RefCell<Vec<Arc<Mutex<MeshProperty>>    >> = const { RefCell::new(Vec::new()) };
}
#[cfg(test)]
pub unsafe fn create_bind_group(
    _device: &Resource<JSDevice>,
    _layout: &Resource<JSBindGroupLayout>,
    _label: *const usize,
    _entries: *mut std::slice::Iter<'_, Arc<Mutex<BufferBinding>>>,
) -> Resource<JSBindGroup> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(test)]
pub unsafe fn get_renderpass_descriptor(
    _renderpass: &Resource<JSRenderPass>,
) -> Resource<JSRenderPassDescriptor> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(test)]
pub fn renderpass_on_resize(
    _renderpass: &Resource<JSRenderPass>,
    width: NonZeroU32,
    height: NonZeroU32,
) {
}
#[cfg(test)]
pub fn resize_renderpass(
    _renderpass: &Resource<JSRenderPass>,
    width: NonZeroU32,
    height: NonZeroU32,
) {
}
#[cfg(test)]
pub fn serialize_terrain(
    vertices_ptr: usize,
    vertices_len: usize,
    indices_ptr: usize,
    indices_len: usize,
) {
}
#[cfg(test)]
pub unsafe fn create_gpu_command_encoder(
    _device: &Resource<JSDevice>,
    _label: *const usize,
) -> Resource<JSCommandEncoder> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "device")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_bind_group(
        device: &Resource<JSDevice>,
        layout: &Resource<JSBindGroupLayout>,
        label: *const usize,
        entries: *mut std::slice::Iter<'_, Arc<Mutex<BufferBinding>>>,
    ) -> Resource<JSBindGroup>;
    pub fn create_gpu_command_encoder(
        device: &Resource<JSDevice>,
        label: *const usize,
    ) -> Resource<JSCommandEncoder>;
}
#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "env")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn mesh_on_change(mesh: Option<&Resource<crate::mesh::JSMesh>>);
    pub fn get_renderpass_descriptor(
        renderpass: &Resource<JSRenderPass>,
    ) -> Resource<JSRenderPassDescriptor>;
    pub fn resize_renderpass(
        renderpass: &Resource<JSRenderPass>,
        width: NonZeroU32,
        height: NonZeroU32,
    );
    pub fn renderpass_on_resize(
        renderpass: &Resource<JSRenderPass>,
        width: NonZeroU32,
        height: NonZeroU32,
    );
    pub fn serialize_terrain(
        vertices_ptr: usize,
        vertices_len: usize,
        indices_ptr: usize,
        indices_len: usize,
    );

}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn push_to_temp_gpu_buffers(buffer: Box<GPUBuffer<false, false, true>>) {
    TEMP_GPU_BUFFERS.lock().unwrap().push((*buffer).externref);
}
/**
 * Called on window resize
 */
#[externref]
#[no_mangle]
unsafe extern "C" fn on_resize(
    aspect_ratio: f32,
    width: u32,
    height: u32,
    pipeline: &Resource<JSComputePipeline>,
    device_pixel_ratio: f32,
) {
    let gpuoption = &mut ENGINE.gpu.lock().unwrap();
    let gpu = gpuoption.as_mut().unwrap();
    gpu.on_resize(aspect_ratio, width, height, pipeline, device_pixel_ratio);
}

#[no_mangle]
#[externref]
pub unsafe extern "C" fn get_raw_computepassencoder(
    computepass: *mut ComputePassEncoder,
) -> &'static Resource<JSComputePassEncoder> {
    &(*computepass).externref
}
#[no_mangle]
pub unsafe extern "C" fn get_gpu() -> *mut MutexGuard<'static, Option<GPU>> {
    Box::into_raw(Box::new(ENGINE.gpu.lock().unwrap()))
}

#[no_mangle]
pub unsafe extern "C" fn drop_gpu_lock(gpu: *mut MutexGuard<'static, Option<GPU>>) {
    let gpu = Box::from_raw(gpu);
    drop(gpu);
}
/**
 * Initialize new gpu.
 * on device lost new device can be forced with force-argiment
 */
#[no_mangle]
#[externref]
pub unsafe extern "C" fn init_gpu(
    device: Resource<JSDevice>,
    queue: Resource<JSQueue>,
    force: bool,
    js_render_pass_screen: Resource<JSRenderPass>,
    js_render_pass_water: Resource<JSRenderPass>,
    js_render_pass_canvas: Resource<JSRenderPass>,
    js_pick_render_pass: Resource<JSRenderPass>,
    js_canvas: Resource<JSCanvas>,
) -> usize {
    let mut gpu = ENGINE.gpu.lock().unwrap();
    if force || gpu.is_none() {
        let canvas = Canvas {
            externref: js_canvas,
        };
        let unconfigured_context = canvas.get_webgpu_context();

        // LAYOUT UpdateViewLayout2
        let directional_lights = GPUBufferBindingLayout::<SHADER_STAGE_COMPUTE>::new(
            0,
            BufferBindingType::ReadOnlyStorage,
            false,
            16,
        );
        let meshes = GPUBufferBindingLayout::<SHADER_STAGE_COMPUTE>::new(
            1,
            BufferBindingType::ReadOnlyStorage,
            false,
            512,
        );
        let point_lights = GPUBufferBindingLayout::<SHADER_STAGE_COMPUTE>::new(
            2,
            BufferBindingType::ReadOnlyStorage,
            false,
            16,
        );

        let update_view_layout = BindGroupLayout::new(
            &device,
            String::from("UpdateViewLayout"),
            [&directional_lights, &meshes, &point_lights],
        );

        // LAYOUT sizeBindGroupLayout
        let screen_dimensions = GPUBufferBindingLayout::<SHADER_STAGE_COMPUTE_AND_FRAGMENT>::new(
            0,
            BufferBindingType::Uniform,
            false,
            16,
        );
        let size_bindgroup_layout = BindGroupLayout::new(
            &device,
            String::from("sizeBindGroupLayout"),
            [&screen_dimensions],
        );

        // LAYOUT BindGroupLayoutPosition
        let world = GPUBufferBindingLayout::<SHADER_STAGE_VERTEX_AND_FRAGMENT>::new(
            0,
            BufferBindingType::Uniform,
            true,
            GPU_MEMORY_INDEX_SIZE as u32,
        );
        let position_bindgroup_layout =
            BindGroupLayout::new(&device, String::from("BindGroupLayoutPosition"), [&world]);

        // LAYOUT UpdateClustersLayout
        let clusters = GPUBufferBindingLayout::<SHADER_STAGE_COMPUTE>::new(
            0,
            BufferBindingType::Storage,
            false,
            7962624,
        );
        let view_uniforms = GPUBufferBindingLayout::<SHADER_STAGE_COMPUTE>::new(
            1,
            BufferBindingType::Uniform,
            false,
            144,
        );
        let update_clusters_layout = BindGroupLayout::new(
            &device,
            String::from("UpdateClustersLayout"),
            [&clusters, &view_uniforms],
        );

        // LAYOUT uniformBindGroupLayoutWithTime
        let clusters_array = GPUBufferBindingLayout::<SHADER_STAGE_FRAGMENT>::new(
            0,
            BufferBindingType::ReadOnlyStorage,
            false,
            7962624,
        );
        let meshes = GPUBufferBindingLayout::<SHADER_STAGE_FRAGMENT>::new(
            1,
            BufferBindingType::ReadOnlyStorage,
            false,
            512,
        );
        let projection = GPUBufferBindingLayout::<SHADER_STAGE_FRAGMENT>::new(
            2,
            BufferBindingType::Uniform,
            false,
            PROJECTION_BUFFER_SIZE as u32,
        );
        let scene = GPUBufferBindingLayout::<SHADER_STAGE_VERTEX_AND_FRAGMENT>::new(
            3,
            BufferBindingType::Uniform,
            false,
            144,
        );
        let time = GPUBufferBindingLayout::<SHADER_STAGE_VERTEX>::new(
            4,
            BufferBindingType::Uniform,
            false,
            4,
        );
        let uniform_bind_group_layout_with_time = BindGroupLayout::new(
            &device,
            String::from("uniformBindGroupLayoutWithTime"),
            [&clusters_array, &meshes, &projection, &scene, &time],
        );

        // LAYOUT clustersLayout
        let screentoview = GPUBufferBindingLayout::<SHADER_STAGE_COMPUTE>::new(
            1,
            BufferBindingType::Uniform,
            false,
            PROJECTION_BUFFER_SIZE as u32,
        );
        let clusters_layout = BindGroupLayout::new(
            &device,
            String::from("clusters_layout"),
            [&clusters, &screentoview],
        );

        let gpu_buffer: Arc<Mutex<GPUBuffer<false, false, true, true, false, false, true, true>>> =
            Arc::new(Mutex::new(GPUBuffer::new(
                &device,
                GPU_MEMORY_INDEX_SIZE * DEFAULT_MAX_INSTANCES,
                String::from("GPUMeshes"),
                false,
            )));

        let positions_buffer_binding = BufferBinding::new(
            gpu_buffer.clone(),
            0,
            NonZeroUsize::new(GPU_MEMORY_INDEX_SIZE),
        );

        let bind_group_position = BindGroup::new(
            String::from("BindGroupPosition"),
            &position_bindgroup_layout,
            [positions_buffer_binding],
        );

        let projection = Projection::new(&device);
        let point_lights = Lights::new(&device, String::from("GPUPointLights"));
        let directional_lights = Lights::new(&device, String::from("GPUDirectionalLights"));

        let directional_lights_buffer_binding =
            BufferBinding::new(directional_lights.buffer.clone(), 0, None);
        let point_lights_buffer_binding = BufferBinding::new(point_lights.buffer.clone(), 0, None);
        let meshes_buffer_binding = BufferBinding::new(gpu_buffer.clone(), 0, None);
        let update_view_bindgroup = BindGroup::new(
            String::from("updateViewBindGroup"),
            &update_view_layout,
            [
                directional_lights_buffer_binding,
                meshes_buffer_binding,
                point_lights_buffer_binding,
            ],
        );
        let timebuffer = Arc::new(Mutex::new(GPUBuffer::new(
            &device,
            8,
            String::from("timeBuffer"),
            false,
        )));
        let screen_dimension_buffer_screen =
            GPUBuffer::<false, false, false, false, false, false, true>::new(
                &device,
                16,
                String::from("screen_dimension_buffer"),
                false,
            );
        let screen_render_target =
            Texture::<BGRA8UNORM, 2, 4, 1, 1, false, false, true, false, true>::new(
                &device,
                300,
                300,
                String::from("diffuseTexture"),
            );
        let depth_render_target =
            Texture::<DEPTH32FLOAT, 2, 4, 1, 1, true, false, true, false, true>::new(
                &device,
                300,
                300,
                String::from("depthTexture_renderPassScreen"),
            );
        let screen_render_target_view = screen_render_target
            .create_view::<false, false, true, false, true, 1, 0, 1, 0>(
                String::from("renderPassScreen_view"),
                TextureViewDimension::d2,
                TextureAspect::all,
            );
        /* let screen_render_target_view2 = screen_render_target.create_srgb_view::<false, false, true, false, true, _>(
            String::from("renderPassScreen_view"),
            TextureViewDimension::d2,
            TextureAspect::all,
            0,
            NonZeroU32::new_unchecked(1),
            0,
            NonZeroU32::new_unchecked(1),
        );*/
        let render_pass_screen = RenderpassMSAA::new(
            String::from("renderPassScreen"),
            [NonZeroU32::new_unchecked(1); 2],
            None,
            js_render_pass_screen,
            vec![CameraGroup {
                cameras: Vec::with_capacity(2),
                bind_group: Some(BindGroup::new(
                    String::from("sizeBindGroup"),
                    &size_bindgroup_layout,
                    [BufferBinding::new(
                        Arc::new(Mutex::new(screen_dimension_buffer_screen)),
                        0,
                        None,
                    )],
                )),
            }],
            [Box::new(screen_render_target_view)],
            Some(Box::new(depth_render_target)),
        );
        let screen_dimension_buffer_screen_water =
            GPUBuffer::<false, false, false, false, false, false, true>::new(
                &device,
                16,
                String::from("screen_buffer_water"),
                false,
            );

        let water_render_target =
            Texture::<BGRA8UNORM, 2, 1, 1, 1, false, false, true, false, true>::new(
                &device,
                300,
                300,
                String::from("diffuseTextureWater"),
            );
        let water_render_target_view = water_render_target
            .create_view::<false, false, true, false, true, 1, 0, 1, 0>(
                String::from("diffuseTextureWater_view"),
                TextureViewDimension::d2,
                TextureAspect::all,
            );
        let depth_render_target_water =
            Texture::<DEPTH32FLOAT, 2, 4, 1, 1, true, false, false, false, true>::new(
                &device,
                300,
                300,
                String::from("depthTexture_renderPassWater"),
            );
        let render_pass_water = Renderpass::new(
            String::from("renderPassWater"),
            [NonZeroU32::new_unchecked(1); 2],
            Some(|w, h| {
                *w = NonZeroU32::new_unchecked(w.get() >> 2);
                *h = NonZeroU32::new_unchecked(h.get() >> 2);
            }),
            js_render_pass_water,
            vec![CameraGroup {
                cameras: Vec::with_capacity(2),
                bind_group: Some(BindGroup::new(
                    String::from("sizeBindGroup"),
                    &size_bindgroup_layout,
                    [BufferBinding::new(
                        Arc::new(Mutex::new(screen_dimension_buffer_screen_water)),
                        0,
                        None,
                    )],
                )),
            }],
            [Box::new(water_render_target_view)],
            Some(Box::new(depth_render_target_water)),
        );
        let screen_dimension_buffer_screen_pick =
            GPUBuffer::<false, false, false, false, false, false, true>::new(
                &device,
                16,
                String::from("screen_buffer_pick"),
                false,
            );
        let pick_render_target =
            Texture::<RG32UINT, 2, 1, 1, 1, true, false, true, false, true>::new(
                &device,
                300,
                300,
                String::from("idTexture"),
            );
        let pick_render_target_view = pick_render_target
            .create_view::<true, false, true, false, true, 1, 0, 1, 0>(
                String::from("idTexture_view"),
                TextureViewDimension::d2,
                TextureAspect::all,
            );
        let pick_render_pass = Renderpass::new(
            String::from("pickRenderPass"),
            [NonZeroU32::new_unchecked(1); 2],
            None,
            js_pick_render_pass,
            vec![CameraGroup {
                cameras: Vec::with_capacity(2),
                bind_group: Some(BindGroup::new(
                    String::from("sizeBindGroup"),
                    &size_bindgroup_layout,
                    [BufferBinding::new(
                        Arc::new(Mutex::new(screen_dimension_buffer_screen_pick)),
                        0,
                        None,
                    )],
                )),
            }],
            [Box::new(pick_render_target_view)],
            None,
        );

        let format_num = get_preferred_canvas_format();
        let render_target: Box<dyn RenderAttachmentTextureSingleSampled + Send> =
            if format_num == 21 {
                Box::new(
                    unconfigured_context.configure::<RGBA8UNORM, false, false, false, false, true>(
                        &device,
                        ColorSpace::SRGB,
                        None,
                        AlphaMode::Opaque,
                    ),
                )
            } else {
                Box::new(
                    unconfigured_context.configure::<BGRA8UNORM, false, false, false, false, true>(
                        &device,
                        ColorSpace::SRGB,
                        None,
                        AlphaMode::Opaque,
                    ),
                )
            };
        let render_pass_canvas = Renderpass::new(
            String::from("renderPassCanvas"),
            [NonZeroU32::new_unchecked(1); 2],
            None,
            js_render_pass_canvas,
            Vec::new(),
            [render_target],
            None,
        );
        let renderpasses: Vec<Box<dyn RenderPassTrait + Send>> = vec![
            Box::new(render_pass_screen),
            Box::new(render_pass_water),
            Box::new(pick_render_pass),
            Box::new(render_pass_canvas),
        ];

        let _ = gpu.insert(GPU {
            device,
            queue: Queue {
                externref: queue,
                pending_command_buffers: Vec::with_capacity(8),
            },
            gpu_buffer: gpu_buffer,
            bind_group_position,
            projections: vec![Arc::new(projection)],
            cameras: ExplicitGenerationalFreeList::new(4),
            renderpasses,
            update_view_bindgroup,
            point_lights,
            directional_lights,
            swap_buffers: SwapBuffers::new(),
            timebuffer,
            time: 0.0,
            device_pixel_ratio: 1.0,
            update_clusters_layout,
            clusters_layout,
            uniform_bind_group_layout_with_time,
            canvas,
        });
    }
    let gpu_unwrapped = gpu.as_ref().unwrap();
    let externref = &*(gpu_unwrapped.gpu_buffer.lock().unwrap().externref);
    return ptr::read(externref as *const Resource<JSBuffer> as *const usize);
}

#[externref]
#[no_mangle]
pub unsafe extern "C" fn push_to_pending_command_buffers(buffer: Resource<JSCommandBuffer>) {
    ENGINE
        .gpu
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .queue
        .pending_command_buffers
        .push(CommandBuffer {
            externref: buffer,
            buffers: Vec::new(),
            bindgroups: Vec::new(),
        });
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn process_gpu_queue(
    time: f32,
    update_view_pipeline: &Resource<JSComputePipeline>,
) {
    let mut gpuoption = ENGINE.gpu.lock().unwrap();
    let gpu = gpuoption.as_mut().unwrap();

    gpu.process_gpu_queue(time, update_view_pipeline);
}

pub struct GPU {
    pub device: Resource<JSDevice>,
    pub queue: Queue,
    pub gpu_buffer: Arc<Mutex<GPUBuffer<false, false, true, true, false, false, true, true>>>,
    pub bind_group_position: Arc<BindGroup<1>>,
    pub projections: Vec<Arc<Projection>>,
    pub cameras: ExplicitGenerationalFreeList<Camera>,
    pub renderpasses: Vec<Box<dyn RenderPassTrait + Send>>,
    update_view_bindgroup: Arc<BindGroup<3>>,
    pub point_lights: Lights,
    pub directional_lights: Lights,
    pub swap_buffers: SwapBuffers,
    pub timebuffer: Arc<Mutex<GPUBuffer<false, false, false, true, false, false, true>>>,
    pub time: f32,
    pub device_pixel_ratio: f32,
    pub update_clusters_layout: BindGroupLayout<2>,
    pub uniform_bind_group_layout_with_time: BindGroupLayout<5>,
    pub clusters_layout: BindGroupLayout<2>,
    pub canvas: Canvas,
}
impl GPU {
    fn on_resize(
        &mut self,
        aspect_ratio: f32,
        width: u32,
        height: u32,
        pipeline: &Resource<JSComputePipeline>,
        device_pixel_ratio: f32,
    ) {
        self.device_pixel_ratio = device_pixel_ratio;
        let mut command_encoder =
            GPUCommandEncoder::new(&self.device, String::from("screen_resize"));
        for projection in &self.projections {
            {
                let new_projection_buffer = projection
                    .inner_projection
                    .create_buffer(&self.device, aspect_ratio);
                projection
                    .buffer
                    .lock()
                    .unwrap()
                    .replace_externref(new_projection_buffer.take_externref());
            }
        }
        for camera in self.cameras.iter_mut() {
            camera.update_view(
                &mut self.queue.pending_command_buffers,
                &self.device,
                &mut command_encoder,
                &mut self.swap_buffers,
                true,
            );
        }
        let mut computepassencoder =
            command_encoder.begin_compute_pass(String::from("resizePassEncoder"));
        computepassencoder.set_pipeline(pipeline);

        for renderpass in &mut self.renderpasses {
            let width = NonZeroU32::new(width).unwrap();
            let height = NonZeroU32::new(height).unwrap();
            renderpass.resize(
                width,
                height,
                &self.device,
                &self.cameras,
                &mut computepassencoder,
            );
            unsafe {
                let size = renderpass.size();
                resize_renderpass(&renderpass.jsrenderpass(), size[0], size[1]);
            }
        }
        // Call onResize after all renderPasses have resizes so callbacks
        // can refer updated render target of other renderpasses.
        for renderpass in &self.renderpasses {
            unsafe {
                let size = renderpass.size();

                renderpass_on_resize(&renderpass.jsrenderpass(), size[0], size[1]);
            }
        }
        self.queue
            .submit([computepassencoder.end().finish(String::from("resize"))]);
    }
    pub fn get_camera_by_id(&self, camera_id: usize) -> &Camera {
        for camera in self.cameras.iter() {
            if camera.id == camera_id {
                return camera;
            } else {
                if let Some(child_camera) = camera.find_child(camera_id) {
                    return child_camera;
                }
            }
        }
        panic!("Camera not found");
    }
    pub fn get_camera_by_id_mut(&mut self, camera_id: usize) -> &mut Camera {
        for camera in self.cameras.iter_mut() {
            if camera.id == camera_id {
                return camera;
            } else {
                if let Some(child_camera) = camera.find_child_mut(camera_id) {
                    return child_camera;
                }
            }
        }
        panic!("Camera not found");
    }
    pub fn process_gpu_queue(
        &mut self,
        time: f32,
        update_view_pipeline: &Resource<JSComputePipeline>,
    ) {
        for camera in self.cameras.iter_mut() {
            camera.check_inputs();
        }
        self.time = time;
        let mut command_encoder =
            GPUCommandEncoder::new(&self.device, String::from("handle_gpu_queue_encoder"));
        self.swap_buffers.get(&self.device, 8, |temp_buffer| {
            temp_buffer.set_mapped_range(&self.time, 0);
            command_encoder.copy_buffer_to_buffer(
                &**temp_buffer,
                &*self.timebuffer.lock().unwrap(),
                0,
                0,
                4,
            );
        });

        // TODO: reuse already allocated memory from previous iteration, thus allowing constant string
        let mut renderloop_command_encoder =
            GPUCommandEncoder::new(&self.device, String::from("renderloop_commandEncoder"));

        //Lights
        self.directional_lights.update_buffer(
            &self.device,
            &mut command_encoder,
            &mut self.swap_buffers,
        );
        self.point_lights
            .update_buffer(&self.device, &mut command_encoder, &mut self.swap_buffers);

        let mut update_lights = false;
        let mut some_camera_updated = false;
        //Cameras
        for camera in self.cameras.iter_mut() {
            if camera.update_view(
                &mut self.queue.pending_command_buffers,
                &self.device,
                &mut command_encoder,
                &mut self.swap_buffers,
                false,
            ) {
                some_camera_updated = true;
            }
        }
        // Meshes
        {
            GPU_QUEUE.with_borrow_mut(|queue| {
                {
                    let mut meshes = ENGINE.meshes.lock().unwrap();

                    // Place for frustum culling
                    for mesh in meshes.iter_mut() {
                        if mesh.on_gpu_queue {
                            mesh.on_gpu_queue = false;

                            if mesh.externref.is_some() {
                                #[cfg(feature = "webgpu")]
                                #[cfg(any(not(test), rust_analyzer))]
                                unsafe {
                                    mesh_on_change(mesh.externref.as_ref());
                                }
                            }
                            queue.push(mesh.mesh_property.clone());
                        }
                    }
                }
                if queue.len() > 0 {
                    self.swap_buffers.get(
                        &self.device,
                        std::mem::size_of::<GPUMesh>() * queue.len(),
                        |temp_buffer| {
                            let mut wanted_size = { self.gpu_buffer.lock().unwrap().size };

                            for (i, mesh_property_m) in queue.iter_mut().enumerate() {
                                let mut mesh_property = mesh_property_m.lock().unwrap();
                                for cb in mesh_property.on_change.iter() {
                                    cb(&mesh_property);
                                }
                                if mesh_property.transformation_is_dirty {
                                    mesh_property.update_matrix();
                                }
                                if mesh_property.gpu_memory.point_light_squared > 0.0 {
                                    update_lights = true;
                                }
                                wanted_size = wanted_size.max(
                                    GPU_MEMORY_INDEX_SIZE
                                        * (mesh_property.gpu_mesh_alignment.0 + 16),
                                );

                                temp_buffer.set_mapped_range(
                                    &mesh_property.gpu_memory,
                                    i * std::mem::size_of::<GPUMesh>(),
                                );
                            }
                            let mut gpu_buffer = self.gpu_buffer.lock().unwrap();
                            // if MAX_INSTANCES was increased, resize the buffer
                            if gpu_buffer.size < wanted_size {
                                gpu_buffer.resize(&self.device, &mut command_encoder, wanted_size);
                            }
                            for (i, mesh_property_m) in queue.drain(..).enumerate() {
                                let mesh_property = mesh_property_m.lock().unwrap();
                                command_encoder.copy_buffer_to_buffer(
                                    &**temp_buffer,
                                    &*gpu_buffer,
                                    i * std::mem::size_of::<GPUMesh>(),
                                    mesh_property.gpu_mesh_alignment.0 * GPU_MEMORY_INDEX_SIZE,
                                    std::mem::size_of::<GPUMesh>(),
                                );
                            }
                        },
                    )
                }
            });
        }

        // Cameras continue here because update_lights could change between
        if some_camera_updated || update_lights {
            let mut lights_pass =
                command_encoder.begin_compute_pass(String::from("lightPassEncoder"));
            lights_pass.set_pipeline(update_view_pipeline);
            lights_pass.set_bindgroup(&self.device, 0, &self.update_view_bindgroup, &[]);
            //If light source has been moved, update all cameras. Otherwise update only cameras that has been moved.
            for camera in self.cameras.iter_mut() {
                camera.update_camera(&self.device, update_lights, &mut lights_pass);
            }
            command_encoder = lights_pass.end();
        }
        let gpu_buffer_id = unsafe {
            let externref = &*self.gpu_buffer.lock().unwrap().externref;
            ptr::read(externref as *const Resource<JSBuffer> as *const usize)
        };

        for renderpass in &mut self.renderpasses {
            renderloop_command_encoder = renderpass.render(
                renderloop_command_encoder,
                &self.device,
                &self.cameras,
                gpu_buffer_id,
                &self.bind_group_position,
            );
        }
        // Update mesh positions etc
        self.queue
            .submit([command_encoder.finish(String::from("renderloop"))]);
        // Every other than depends on mesh positions etc
        self.queue.drain_command_buffers();
        // Draw commands last so everything is up to date
        self.queue
            .submit([renderloop_command_encoder.finish(String::from("renderloop_renderencoder"))]);
        TEMP_GPU_BUFFERS.lock().unwrap().clear();
        #[cfg(not(test))]
        self.swap_buffers.queue_submited();
    }
}
#[cfg(test)]
#[test]
fn test_gpu_queue() {
    use crate::gpu::renderbundle::RenderBundleEncoder;
    use crate::mesh::Mesh;
    use externref::ExternRef;
    unsafe {
        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            false,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        for id in 0..4 {
            let mut gpuopt = ENGINE.gpu.lock().unwrap();
            let gpu = gpuopt.as_mut().unwrap();
            gpu.renderpasses[id].set_bundle(RenderBundleEncoder::new(
                String::from("test"),
                &gpu.device,
                Vec::new(),
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
                1,
                false,
                false,
                None,
            ));
            gpu.renderpasses[id].get_bundle();
        }
        process_gpu_queue(
            0.0,
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
        );

        {
            GPU_QUEUE.with_borrow(|queue| {
                assert_eq!(queue.len(), 0);
            });
        }
        let mesh_id = {
            let mut meshes = ENGINE.meshes.lock().unwrap();

            let mesh_id = Mesh::new(
                0.0,
                1.0,
                0.0,
                0,
                String::from("sun"),
                None,
                None,
                &mut meshes,
                false,
            );
            let mesh = &meshes[&mesh_id];
            assert_eq!(mesh.on_gpu_queue, true);
            mesh_id
        };

        process_gpu_queue(
            0.0,
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
        );
        {
            let mesh = &ENGINE.meshes.lock().unwrap()[&mesh_id];
            assert_eq!(mesh.on_gpu_queue, false);
        }
    }
}

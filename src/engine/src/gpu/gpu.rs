use std::cell::RefCell;
use std::num::NonZeroUsize;
use std::ptr;
use std::sync::MutexGuard;
use std::sync::{Arc, Mutex};

use externref::{externref, Resource};

use crate::allocators::explicit_generational_freelist::ExplicitGenerationalFreeList;
use crate::allocators::stack_allocator::StackAllocator;
use crate::cameras::camera::Camera;
use crate::cameras::camera_group::CameraGroup;
use crate::mesh::ENGINE;
use crate::mesh_property::MeshProperty;
use crate::projection::Projection;
use crate::swapbuffers::SwapBuffers;
use crate::GPUMesh;

use super::bindgroup::{BindGroup, JSBindGroup, JSBindGroupLayout};
use super::binding_commands::BindingCommands;
use super::buffer::buffer::{GpuBuffer, JSBuffer};
use super::buffer::copy_src::CopySrc;
use super::buffer::usages::{COPYSRC_USAGE, UNIFORM_COPYDST_USAGE, UNIFORM_USAGE};
use super::bufferbinding::BufferBinding;
use super::command_buffer::{CommandBuffer, JSCommandBuffer};
use super::command_encoder::GPUCommandEncoder;
use super::compute_pass_encoder::{ComputePassEncoder, JSComputePassEncoder, JSComputePipeline};
use super::lights::Lights;
use super::queue::JSQueue;
use super::renderpass::{JSRenderPass, JSRenderPassDescriptor, Renderpass};
use super::{
    buffer::{buffer::GPUBuffer, usages::UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE},
    queue::Queue,
};
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
pub unsafe fn create_gpu_buffer(
    _device: &Resource<JSDevice>,
    _length: usize,
    _label: *const usize,
    _usages: u32,
    _mapped: bool,
    _owned_by_js: bool,
) -> Resource<JSBuffer> {
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
pub fn renderpass_on_resize(_renderpass: &Resource<JSRenderPass>) {}
#[cfg(test)]
pub fn resize_renderpass(
    _renderpass: &Resource<JSRenderPass>,
    _width: f32,
    _height: f32,
    _computepass: *mut ComputePassEncoder,
    _cameragroups: *mut Vec<CameraGroup>,
    _cameras: *const ExplicitGenerationalFreeList<Camera>,
    _device: &Resource<JSDevice>,
) {
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
    pub fn create_gpu_buffer(
        device: &Resource<JSDevice>,
        length: usize,
        label: *const usize,
        usages: u32,
        mapped: bool,
        owned_by_js: bool,
    ) -> Resource<JSBuffer>;

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
        width: f32,
        height: f32,
        computepass: *mut ComputePassEncoder,
        cameragroups: *mut Vec<CameraGroup>,
        cameras: *const ExplicitGenerationalFreeList<Camera>,
        device: &Resource<JSDevice>,
    );
    pub fn renderpass_on_resize(renderpass: &Resource<JSRenderPass>);

}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn push_to_temp_gpu_buffers(buffer: Box<GPUBuffer<COPYSRC_USAGE>>) {
    TEMP_GPU_BUFFERS.lock().unwrap().push((*buffer).externref);
}
/**
 * Called on window resize
 */
#[externref]
#[no_mangle]
unsafe extern "C" fn on_resize(
    aspect_ratio: f32,
    width: f32,
    height: f32,
    pipeline: &Resource<JSComputePipeline>,
) {
    let gpuoption = &mut ENGINE.gpu.lock().unwrap();
    let gpu = gpuoption.as_mut().unwrap();
    let mut command_encoder = GPUCommandEncoder::new(String::from("screen_resize"));
    for projection in &gpu.projections {
        {
            let new_projection_buffer = projection
                .inner_projection
                .create_buffer(&gpu.device, aspect_ratio);
            projection
                .buffer
                .lock()
                .unwrap()
                .replace_externref(new_projection_buffer.take_externref());
        }
    }
    for camera in gpu.cameras.iter_mut() {
        camera.update_view(
            &mut gpu.pending_command_buffers,
            &gpu.device,
            &mut command_encoder,
            &mut gpu.swap_buffers,
            true,
        );
    }
    let computepassencoder = command_encoder.begin_compute_pass(String::from("resizePassEncoder"));
    computepassencoder.set_pipeline(pipeline);

    let computepassencoderb = Box::into_raw(Box::new(computepassencoder));
    for renderpass in &mut gpu.renderpasses {
        resize_renderpass(
            &renderpass.jsrenderpass,
            width,
            height,
            computepassencoderb,
            &mut renderpass.cameragroups,
            &gpu.cameras,
            &gpu.device,
        );
    }
    // Call onResize after all renderPasses have resizes so callbacks
    // can refer updated render target of other renderpasses.
    for renderpass in &gpu.renderpasses {
        renderpass_on_resize(&renderpass.jsrenderpass);
    }
    gpu.queue.submit(
        &mut vec![Box::from_raw(computepassencoderb)
            .end()
            .finish(String::from("resize"))]
        .drain(..),
    );
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
    layout: Resource<JSBindGroupLayout>,
    force: bool,
    size_bindgroup_layout: Resource<JSBindGroupLayout>,
    position_bindgroup_layout: Resource<JSBindGroupLayout>,
    js_render_pass_screen: Resource<JSRenderPass>,
    js_render_pass_water: Resource<JSRenderPass>,
    js_render_pass_canvas: Resource<JSRenderPass>,
    js_pick_render_pass: Resource<JSRenderPass>,
) -> usize {
    let mut gpu = ENGINE.gpu.lock().unwrap();
    if force || gpu.is_none() {
        let gpu_buffer = Arc::new(Mutex::new(
            GPUBuffer::<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE>::new(
                &device,
                GPU_MEMORY_INDEX_SIZE * DEFAULT_MAX_INSTANCES,
                String::from("GPUMeshes"),
                false,
            ),
        ));

        let positions_buffer_binding = BufferBinding::new(
            gpu_buffer.clone(),
            0,
            NonZeroUsize::new(GPU_MEMORY_INDEX_SIZE),
        );

        let bind_group_position = BindGroup::new(
            String::from("BindGroupPosition"),
            Arc::new(position_bindgroup_layout),
            vec![positions_buffer_binding],
        );

        let projection = Projection::new(&device);
        let point_lights = Lights::new(&device, String::from("GPUPointLights"));
        let directional_lights = Lights::new(&device, String::from("GPUDirectionalLights"));

        let directional_lights_buffer_binding =
            BufferBinding::new(directional_lights.buffer.clone(), 0, None);
        let point_lights_buffer_binding = BufferBinding::new(point_lights.buffer.clone(), 0, None);
        let meshes_buffer_binding = BufferBinding::new(gpu_buffer.clone(), 0, None);
        let layout_arc = Arc::new(size_bindgroup_layout);
        let update_view_bindgroup = BindGroup::new(
            String::from("updateViewBindGroup"),
            Arc::new(layout),
            vec![
                directional_lights_buffer_binding,
                meshes_buffer_binding,
                point_lights_buffer_binding,
            ],
        );
        let timebuffer = Arc::new(Mutex::new(GPUBuffer::<UNIFORM_COPYDST_USAGE>::new(
            &device,
            8,
            String::from("timeBuffer"),
            false,
        )));
        let screen_dimension_buffer_screen =
            GPUBuffer::<UNIFORM_USAGE>::new(&device, 16, String::from("screen_buffer"), false);
        let render_pass_screen = Renderpass {
            label: String::from("renderPassScreen"),
            jsrenderpass: js_render_pass_screen,
            bundle: None,
            cameragroups: vec![CameraGroup {
                cameras: Vec::with_capacity(2),
                bind_group: Some(BindGroup::new(
                    String::from("sizeBindGroup"),
                    layout_arc.clone(),
                    vec![BufferBinding::new(
                        Arc::new(Mutex::new(screen_dimension_buffer_screen)),
                        0,
                        None,
                    )],
                )),
            }],
        };
        let screen_dimension_buffer_screen_water =
            GPUBuffer::<UNIFORM_USAGE>::new(&device, 16, String::from("screen_buffer"), false);

        let render_pass_water = Renderpass {
            label: String::from("renderPassWater"),
            jsrenderpass: js_render_pass_water,
            bundle: None,
            cameragroups: vec![CameraGroup {
                cameras: Vec::with_capacity(2),
                bind_group: Some(BindGroup::new(
                    String::from("sizeBindGroup"),
                    layout_arc.clone(),
                    vec![BufferBinding::new(
                        Arc::new(Mutex::new(screen_dimension_buffer_screen_water)),
                        0,
                        None,
                    )],
                )),
            }],
        };
        let screen_dimension_buffer_screen_pick =
            GPUBuffer::<UNIFORM_USAGE>::new(&device, 16, String::from("screen_buffer"), false);

        let pick_render_pass = Renderpass {
            label: String::from("renderPassPick"),
            jsrenderpass: js_pick_render_pass,
            bundle: None,
            cameragroups: vec![CameraGroup {
                cameras: Vec::with_capacity(2),
                bind_group: Some(BindGroup::new(
                    String::from("sizeBindGroup"),
                    layout_arc,
                    vec![BufferBinding::new(
                        Arc::new(Mutex::new(screen_dimension_buffer_screen_pick)),
                        0,
                        None,
                    )],
                )),
            }],
        };
        let render_pass_canvas = Renderpass {
            label: String::from("renderPassCanvas"),
            jsrenderpass: js_render_pass_canvas,
            bundle: None,
            cameragroups: Vec::new(),
        };
        let _ = gpu.insert(GPU {
            device,
            queue: Queue { externref: queue },
            gpu_buffer: gpu_buffer,
            bind_group_position,
            pending_command_buffers: Vec::with_capacity(8),
            projections: vec![Arc::new(projection)],
            cameras: ExplicitGenerationalFreeList::new(4),
            renderpasses: vec![
                render_pass_screen,
                render_pass_water,
                pick_render_pass,
                render_pass_canvas,
            ],
            update_view_bindgroup,
            point_lights,
            directional_lights,
            swap_buffers: SwapBuffers::new(),
            timebuffer,
            time: 0.0,
        });
    }
    let gpu_unwrapped = gpu.as_ref().unwrap();
    let externref = &*(gpu_unwrapped.gpu_buffer.lock().unwrap().externref);
    return ptr::read(externref as *const Resource<JSBuffer> as *const usize);
}
#[no_mangle]
pub unsafe extern "C" fn check_mapped_buffers() -> bool {
    let mut gpu = ENGINE.gpu.lock().unwrap();
    gpu.as_mut().unwrap().swap_buffers.check_mapped_buffers()
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
) -> bool {
    let mut gpuoption = ENGINE.gpu.lock().unwrap();
    let gpu = gpuoption.as_mut().unwrap();

    return gpu.process_gpu_queue(time, update_view_pipeline);
}
pub struct JSDevice(());

pub struct GPU {
    pub device: Resource<JSDevice>,
    pub queue: Queue,
    pub gpu_buffer: Arc<Mutex<GPUBuffer<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE>>>,
    pub bind_group_position: Arc<BindGroup>,
    pub pending_command_buffers: Vec<CommandBuffer>,
    pub projections: Vec<Arc<Projection>>,
    pub cameras: ExplicitGenerationalFreeList<Camera>,
    pub renderpasses: Vec<Renderpass>,
    update_view_bindgroup: Arc<BindGroup>,
    pub point_lights: Lights,
    pub directional_lights: Lights,
    swap_buffers: SwapBuffers,
    pub timebuffer: Arc<Mutex<GPUBuffer<UNIFORM_COPYDST_USAGE>>>,
    pub time: f32,
}
impl GPU {
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
    ) -> bool {
        for camera in self.cameras.iter_mut() {
            camera.check_inputs();
        }
        self.time = time;
        let mut command_encoder = GPUCommandEncoder::new(String::from("handle_gpu_queue_encoder"));
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
            GPUCommandEncoder::new(String::from("renderloop_commandEncoder"));

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
                &mut self.pending_command_buffers,
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
            .submit(&mut vec![command_encoder.finish(String::from("renderloop"))].drain(..));
        // Every other than depends on mesh positions etc
        self.queue
            .submit(&mut self.pending_command_buffers.drain(..));
        // Draw commands last so everything is up to date
        self.queue.submit(
            &mut vec![renderloop_command_encoder.finish(String::from("renderloop_renderencoder"))]
                .drain(..),
        );
        TEMP_GPU_BUFFERS.lock().unwrap().clear();
        return self.swap_buffers.queue_submited();
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
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            false,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        for id in 0..4 {
            let mut gpuopt = ENGINE.gpu.lock().unwrap();
            let gpu = gpuopt.as_mut().unwrap();
            gpu.renderpasses[id].jsrenderpass =
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
            gpu.renderpasses[id].bundle = Some(RenderBundleEncoder::new(
                String::from("test"),
                &gpu.device,
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            ));
            gpu.renderpasses[id].bundle.as_mut().unwrap();
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

        let mesh_id = Mesh::new(
            0.0,
            1.0,
            0.0,
            0,
            String::from("sun"),
            None,
            None,
            ENGINE.meshes.lock().unwrap(),
            false,
        );

        {
            let mesh = &ENGINE.meshes.lock().unwrap()[&mesh_id];
            assert_eq!(mesh.on_gpu_queue, true);
        }

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

#[cfg(test)]
#[test]
fn test_time_update() {
    use crate::engine;
    use crate::gpu::renderbundle::RenderBundleEncoder;
    use crate::mesh::Mesh;
    use crate::mesh::ENGINE;
    use externref::ExternRef;

    unsafe {
        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            false,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        for id in 0..4 {
            let mut gpuopt = ENGINE.gpu.lock().unwrap();
            let gpu = gpuopt.as_mut().unwrap();
            gpu.renderpasses[id].jsrenderpass =
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
            gpu.renderpasses[id].bundle = Some(RenderBundleEncoder::new(
                String::from("test"),
                &gpu.device,
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            ));
            gpu.renderpasses[id].bundle.as_mut().unwrap();
        }
        {
            let mut maybegpu = ENGINE.gpu.lock().unwrap();
            assert_eq!(
                maybegpu.as_mut().unwrap().swap_buffers.queue_submited(),
                false
            );
        }
        process_gpu_queue(
            0.0,
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
        );
        let mapping = process_gpu_queue(
            0.0,
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
        );
        assert_eq!(mapping, true);
    }
}

use std::cell::RefCell;
use std::ptr;
use std::sync::MutexGuard;
use std::sync::{Arc, Mutex};

use externref::{externref, Resource};

use crate::allocators::stack_allocator::StackAllocator;
use crate::camera::Camera;
use crate::cameracontroller::CameraController;
use crate::mesh::ENGINE;
use crate::mesh_property::MeshProperty;
use crate::projection::Projection;
use crate::swapbuffers::SwapBuffers;
use crate::GPUMesh;

use super::bindgroup::{BindGroup, JSBindGroup, JSBindGroupLayout};
use super::binding_commands::BindingCommands;
use super::buffer::buffer::JSBuffer;
use super::buffer::copy_src::CopySrc;
use super::buffer::usages::{COPYSRC_USAGE, UNIFORM_COPYDST_USAGE};
use super::bufferbinding::BufferBinding;
use super::command_buffer::{CommandBuffer, JSCommandBuffer};
use super::command_encoder::{GPUCommandEncoder, JSCommandEncoder};
use super::compute_pass_encoder::JSComputePipeline;
use super::lights::Lights;
use super::queue::JSQueue;
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
pub unsafe fn render_renderpasses(
    _command_encoder: &Resource<JSCommandEncoder>,
    _gpu: *mut &mut GPU,
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
    pub fn render_renderpasses(command_encoder: &Resource<JSCommandEncoder>, gpu: *mut &mut GPU);
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn push_to_temp_gpu_buffers(buffer: Box<GPUBuffer<COPYSRC_USAGE>>) {
    TEMP_GPU_BUFFERS.lock().unwrap().push((*buffer).externref);
}
/**
 * Called on window resize
 */
#[no_mangle]
unsafe extern "C" fn on_resize(aspect_ratio: f32) {
    let gpuoption = &mut ENGINE.gpu.lock().unwrap();
    let gpu = gpuoption.as_mut().unwrap();
    let mut command_encoder = GPUCommandEncoder::new(String::from("screen_resize"));
    for projection_m in &mut gpu.projections {
        {
            let projection = &mut projection_m.lock().unwrap();
            projection.buffer = Arc::new(Mutex::new(
                projection
                    .inner_projection
                    .create_buffer(&gpu.device, aspect_ratio),
            ));
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
    gpu.queue.submit(
        &mut vec![command_encoder.finish(String::from("screen_resize_commandbuffer"))].drain(..),
    );
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
) {
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
        let projection = Projection::new(&device);
        let point_lights = Lights::new(&device, String::from("GPUPointLights"));
        let directional_lights = Lights::new(&device, String::from("GPUDirectionalLights"));

        let directional_lights_buffer_binding =
            BufferBinding::new(directional_lights.buffer.clone(), 0, None);
        let point_lights_buffer_binding = BufferBinding::new(point_lights.buffer.clone(), 0, None);
        let meshes_buffer_binding = BufferBinding::new(gpu_buffer.clone(), 0, None);

        let update_view_bindgroup = BindGroup::new(
            String::from("updateViewBindGroup"),
            layout,
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
        let _ = gpu.insert(GPU {
            device,
            queue: Queue { externref: queue },
            gpu_buffer,
            pending_command_buffers: Vec::with_capacity(8),
            projections: vec![Arc::new(Mutex::new(projection))],
            cameras: Vec::with_capacity(2),
            update_view_bindgroup,
            point_lights,
            directional_lights,
            swap_buffers: SwapBuffers::new(),
            timebuffer,
            time: 0.0,
            camera_controller: None,
        });
    }
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
        });
}
#[no_mangle]
#[cfg(feature = "webgpu")]
pub unsafe extern "C" fn get_gpu_mesh_buffer(gpu: *mut &mut GPU) -> usize {
    let externref = &*(*gpu).gpu_buffer.lock().unwrap().externref;
    ptr::read(externref as *const Resource<JSBuffer> as *const usize)
}
#[no_mangle]
#[cfg(feature = "webgpu")]
pub unsafe extern "C" fn get_gpu_projection_buffer_from_mutex(
    ptr: *mut MutexGuard<'static, Option<GPU>>,
) -> usize {
    let gpu = &(*ptr).as_ref().unwrap();
    let projection = gpu.projections[0].lock().unwrap();
    let externref = &*projection.buffer.lock().unwrap().externref;
    ptr::read(externref as *const Resource<JSBuffer> as *const usize)
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
    pub pending_command_buffers: Vec<CommandBuffer>,
    pub projections: Vec<Arc<Mutex<Projection>>>,
    pub cameras: Vec<Camera>,
    update_view_bindgroup: Arc<Mutex<BindGroup>>,
    pub point_lights: Lights,
    pub directional_lights: Lights,
    swap_buffers: SwapBuffers,
    pub timebuffer: Arc<Mutex<GPUBuffer<UNIFORM_COPYDST_USAGE>>>,
    pub time: f32,
    camera_controller: Option<Box<dyn CameraController + Send>>,
}
impl GPU {
    pub fn get_camera_by_id(&self, camera_id: usize) -> &Camera {
        for camera in &self.cameras {
            if camera.id == camera_id {
                return camera;
            } else {
                if let Some(child_camera) = camera.find_child(camera_id) {
                    return child_camera;
                }
            };
        }
        panic!("Camera not found");
    }
    pub fn get_camera_by_id_mut(&mut self, camera_id: usize) -> &mut Camera {
        for camera in &mut self.cameras {
            if camera.id == camera_id {
                return camera;
            } else {
                if let Some(child_camera) = camera.find_child_mut(camera_id) {
                    return child_camera;
                }
            };
        }
        panic!("Camera not found");
    }
    pub fn process_gpu_queue(
        &mut self,
        time: f32,
        update_view_pipeline: &Resource<JSComputePipeline>,
    ) -> bool {
        for camera in &mut self.cameras {
            camera.check_inputs();
        }
        self.time = time;
        let mut command_encoder = GPUCommandEncoder::new(String::from("handle_gpu_queue_encoder"));
        self.swap_buffers.get(&self.device, 8, |temp_buffer| {
            temp_buffer.set_mapped_range((&raw const self.time) as usize, 4, 0);
            command_encoder.copy_buffer_to_buffer(
                &**temp_buffer,
                &*self.timebuffer.lock().unwrap(),
                0,
                0,
                4,
            );
        });
        let renderloop_command_encoder =
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
        for camera in &mut self.cameras.iter_mut() {
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
                                    &raw const mesh_property.gpu_memory as usize,
                                    std::mem::size_of::<GPUMesh>(),
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
            lights_pass.set_bindgroup(
                &self.device,
                0,
                &mut self.update_view_bindgroup.lock().unwrap(),
            );
            //If light source has been moved, update all cameras. Otherwise update only cameras that has been moved.
            for camera in &mut self.cameras {
                camera.update_camera(&self.device, update_lights, &mut lights_pass);
            }

            command_encoder = lights_pass.end();
        }
        let gpubox = Box::into_raw(Box::new(self));
        let gpu2 = unsafe {
            render_renderpasses(&renderloop_command_encoder.externref, gpubox);
            *Box::from_raw(gpubox)
        };
        // Update mesh positions etc
        gpu2.queue
            .submit(&mut vec![command_encoder.finish(String::from("renderloop"))].drain(..));
        // Every other than depends on mesh positions etc
        gpu2.queue
            .submit(&mut gpu2.pending_command_buffers.drain(..));
        // Draw commands last so everything is up to date
        gpu2.queue.submit(
            &mut vec![renderloop_command_encoder.finish(String::from("renderloop_renderencoder"))]
                .drain(..),
        );
        TEMP_GPU_BUFFERS.lock().unwrap().clear();
        return gpu2.swap_buffers.queue_submited();
    }
}

#[cfg(test)]
#[test]
fn test_gpu_queue() {
    use crate::mesh::Mesh;
    use externref::ExternRef;
    unsafe {
        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            false,
        );
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
    use crate::mesh::Mesh;
    use crate::mesh::ENGINE;
    use externref::ExternRef;

    unsafe {
        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            false,
        );
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

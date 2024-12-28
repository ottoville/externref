use std::rc::Rc;
use std::sync::{Arc, Mutex};

use externref::{externref, Resource};

use crate::allocators::stack_allocator::StackAllocator;
use crate::camera::Camera;
use crate::cameras::search_camera_by_id_mut;
use crate::engine::GPU_QUEUE;
use crate::mesh::{get_mesh_by_id_mut, ENGINE};
use crate::projection::Projection;
use crate::swapbuffers::SwapBuffers;
use crate::GPUMesh;

use super::bindgroup::{BindGroup, JSBindGroup, JSBindGroupLayout};
use super::buffer::buffer::JSBuffer;
use super::buffer::copy_src::CopySrc;
use super::buffer::usages::COPYSRC_USAGE;
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
pub static MAX_INSTANCES: Mutex<usize> = Mutex::new(DEFAULT_MAX_INSTANCES);

pub static TEMP_GPU_BUFFERS: Mutex<StackAllocator<Arc<Resource<JSBuffer>>, 16>> =
    Mutex::new(StackAllocator::new());

#[cfg(test)]
pub unsafe fn create_bind_group(
    _device: &Resource<JSDevice>,
    _layout: &Resource<JSBindGroupLayout>,
    _label: *const usize,
    _entries: *mut std::slice::Iter<'_, Rc<Mutex<BufferBinding>>>,
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
pub unsafe fn render_renderpasses(_command_encoder: &Resource<JSCommandEncoder>) {}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "device")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_bind_group(
        device: &Resource<JSDevice>,
        layout: &Resource<JSBindGroupLayout>,
        label: *const usize,
        entries: *mut std::slice::Iter<'_, Rc<Mutex<BufferBinding>>>,
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
    pub fn render_renderpasses(command_encoder: &Resource<JSCommandEncoder>);
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn push_to_temp_gpu_buffers(buffer: Box<GPUBuffer<COPYSRC_USAGE>>) {
    TEMP_GPU_BUFFERS.lock().unwrap().push((*buffer).externref);
}
#[no_mangle]
pub unsafe extern "C" fn clear_temp_gpu_buffers() {
    TEMP_GPU_BUFFERS.lock().unwrap().clear();
}
#[no_mangle]
unsafe extern "C" fn on_resize(aspect_ratio: f32) {
    let gpu = ENGINE.physic_engine_mut().gpu.as_mut().unwrap();

    for projection in &mut gpu.projections {
        projection.update(&gpu.device, aspect_ratio)
    }
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn init_gpu(
    device: Resource<JSDevice>,
    queue: Resource<JSQueue>,
    layout: Resource<JSBindGroupLayout>,
) {
    let gpu_buffer = Rc::new(Mutex::new(
        GPUBuffer::<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE>::new(
            &device,
            GPU_MEMORY_INDEX_SIZE * DEFAULT_MAX_INSTANCES,
            String::from("GPUMeshes"),
            false,
        ),
    ));
    let projection = Projection::new(&device);
    let engine2 = ENGINE.physic_engine_mut();
    let point_lights = Lights::new(&device, String::from("GPUPointLights"));
    let directional_lights = Lights::new(&device, String::from("GPUDirectionalLights"));

    let directional_lights_buffer_binding =
        BufferBinding::new(directional_lights.buffer.clone(), 0, None);
    let point_lights_buffer_binding = BufferBinding::new(point_lights.buffer.clone(), 0, None);
    let meshes_buffer_binding = BufferBinding::new(gpu_buffer.clone(), 0, None);

    let update_view_bindgroup = BindGroup::new(
        &device,
        String::from("updateViewBindGroup"),
        layout,
        vec![
            directional_lights_buffer_binding,
            meshes_buffer_binding,
            point_lights_buffer_binding,
        ],
    );
    engine2.gpu = Some(GPU {
        device,
        queue: Queue { externref: queue },
        gpu_buffer,
        pending_command_buffers: Vec::with_capacity(8),
        projections: vec![projection],
        update_view_bindgroup,
        point_lights,
        directional_lights,
        swap_buffers: SwapBuffers::new(),
    });
}

#[no_mangle]
pub unsafe extern "C" fn check_mapped_buffers() -> bool {
    let engine = ENGINE.physic_engine_mut();
    engine
        .gpu
        .as_mut()
        .unwrap()
        .swap_buffers
        .check_mapped_buffers()
}

#[externref]
#[no_mangle]
pub unsafe extern "C" fn push_to_pending_command_buffers(buffer: Resource<JSCommandBuffer>) {
    let engine = ENGINE.physic_engine_mut();
    engine
        .gpu
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
pub unsafe extern "C" fn get_gpu_mesh_buffer() -> usize {
    use std::ptr;

    let externref = &*ENGINE
        .physic_engine()
        .gpu
        .as_ref()
        .unwrap()
        .gpu_buffer
        .lock()
        .unwrap()
        .externref;
    ptr::read(externref as *const Resource<JSBuffer> as *const usize)
}
#[no_mangle]
#[cfg(feature = "webgpu")]
#[externref]
pub unsafe extern "C" fn get_gpu_projection_buffer() -> &'static Resource<JSBuffer> {
    &ENGINE.physic_engine().gpu.as_ref().unwrap().projections[0]
        .buffer
        .externref
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn process_gpu_queue(
    update_view_pipeline: &Resource<JSComputePipeline>,
) -> bool {
    let engine = ENGINE.physic_engine_mut();

    let gpu = engine.gpu.as_mut().unwrap();
    let renderloop_command_encoder =
        GPUCommandEncoder::new(String::from("renderloop_commandEncoder"));
    let mut command_encoder = GPUCommandEncoder::new(String::from("handle_gpu_queue_encoder"));
    {
        //Lights
        gpu.directional_lights.update_buffer(
            &gpu.device,
            &mut command_encoder,
            &mut gpu.swap_buffers,
        );
        gpu.point_lights
            .update_buffer(&gpu.device, &mut command_encoder, &mut gpu.swap_buffers);
    }
    //Cameras
    let mut some_camera_updated = false;

    for projection in &mut gpu.projections {
        if projection.update_views(&gpu.device, &mut command_encoder) {
            some_camera_updated = true;
        }
    }

    // Meshes
    let update_lights = gpu.process_gpu_queue(&mut command_encoder);
    // Cameras continue here because update_lights could change between
    if some_camera_updated || update_lights {
        let lights_pass = command_encoder.begin_compute_pass(String::from("lightPassEncoder"));
        lights_pass.set_pipeline(update_view_pipeline);
        lights_pass.set_bindgroup(
            0,
            gpu.update_view_bindgroup
                .lock()
                .unwrap()
                .get_bind_group(&gpu.device),
        );
        //If light source has been moved, update all cameras. Otherwise update only cameras that has been moved.
        for projection in &gpu.projections {
            for camera in projection.cameras.cameras.iter() {
                camera.update_camera(&gpu.device, update_lights, &lights_pass);
            }
        }

        command_encoder = lights_pass.end();
    }
    render_renderpasses(&renderloop_command_encoder.externref);
    // Update mesh positions etc
    gpu.queue
        .submit(&mut vec![command_encoder.finish(String::from("renderloop"))].drain(..));
    // Every other than depends on mesh positions etc
    gpu.queue.submit(&mut gpu.pending_command_buffers.drain(..));
    // Draw commands last so everything is up to date
    gpu.queue.submit(
        &mut vec![renderloop_command_encoder.finish(String::from("renderloop_renderencoder"))]
            .drain(..),
    );

    return gpu.swap_buffers.queue_submited();
}
pub struct JSDevice(());

pub struct GPU {
    pub device: Resource<JSDevice>,
    pub queue: Queue,
    pub gpu_buffer: Rc<Mutex<GPUBuffer<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE>>>,
    pub pending_command_buffers: Vec<CommandBuffer>,
    pub projections: Vec<Projection>,
    update_view_bindgroup: Rc<Mutex<BindGroup>>,
    pub point_lights: Lights,
    pub directional_lights: Lights,
    swap_buffers: SwapBuffers,
}
impl GPU {
    pub unsafe fn get_camera_by_id(&self, camera_id: u32) -> &Camera {
        for projection in self.projections.iter() {
            if let Some(cam) = projection
                .cameras
                .iter()
                .find(|camera| camera.id == camera_id)
            {
                return cam;
            }
        }
        panic!("Camera not found");
    }
    pub unsafe fn get_camera_by_id_mut(&'_ mut self, camera_id: u32) -> &mut Camera {
        for projection in self.projections.iter_mut() {
            let search_camera =
                search_camera_by_id_mut(projection.cameras.cameras.iter_mut(), camera_id);
            if let Some(camera) = search_camera {
                return camera;
            }
        }
        panic!("Camera {} not found", camera_id);
    }
    pub fn process_gpu_queue(&mut self, command_encoder: &mut GPUCommandEncoder) -> bool {
        let mut update_lights = false;
        let mut queue = GPU_QUEUE.lock().unwrap();
        if queue.len() > 0 {
            let mut need_resize_to = *MAX_INSTANCES.lock().unwrap();
            self.swap_buffers.get(
                &self.device,
                std::mem::size_of::<GPUMesh>() * queue.len(),
                |temp_buffer| {
                    for (i, mesh_id) in queue.iter().enumerate() {
                        let mesh = get_mesh_by_id_mut(*mesh_id);
                        //js_log([&mesh.label]);
                        let mut mesh_property = mesh.mesh_property.lock().unwrap();
                        for cb in mesh_property.on_change.iter() {
                            cb(&mesh_property);
                        }
                        if mesh_property.transformation_is_dirty {
                            mesh_property.update_matrix();
                        }
                        mesh.on_gpu_queue = false;
                        if mesh_property.gpu_memory.point_light_squared > 0.0 {
                            update_lights = true;
                        }
                        if mesh.externref.is_some() {
                            #[cfg(feature = "webgpu")]
                            #[cfg(any(not(test), rust_analyzer))]
                            unsafe {
                                mesh_on_change(mesh.externref.as_ref());
                            }
                        }
                        if mesh_property.gpu_mesh_alignment.0 > need_resize_to {
                            need_resize_to = mesh_property.gpu_mesh_alignment.0
                        }
                        temp_buffer.set_mapped_range(
                            &raw const mesh_property.gpu_memory as usize,
                            std::mem::size_of::<GPUMesh>(),
                            i * std::mem::size_of::<GPUMesh>(),
                            std::mem::size_of::<GPUMesh>(),
                        );
                    }
                    let mut gpu_buffer = self.gpu_buffer.lock().unwrap();
                    if need_resize_to > *MAX_INSTANCES.lock().unwrap() {
                        let mut max_instances = MAX_INSTANCES.lock().unwrap();
                        *max_instances = need_resize_to + 16;
                        let old_externref = gpu_buffer.resize(
                            &self.device,
                            &command_encoder,
                            GPU_MEMORY_INDEX_SIZE * *max_instances,
                        );
                        TEMP_GPU_BUFFERS.lock().unwrap().push(old_externref);
                    }
                    for (i, mesh_id) in queue.drain(..).enumerate() {
                        let mesh = get_mesh_by_id_mut(mesh_id);
                        let mesh_property = mesh.mesh_property.lock().unwrap();
                        command_encoder.copy_buffer_to_buffer(
                            &*temp_buffer,
                            &*gpu_buffer,
                            i * std::mem::size_of::<GPUMesh>(),
                            mesh_property.gpu_mesh_alignment.0 * GPU_MEMORY_INDEX_SIZE,
                            std::mem::size_of::<GPUMesh>(),
                        );
                    }
                    temp_buffer.unmap()
                },
            );
        }
        return update_lights;
    }
}

#[cfg(test)]
#[test]
fn test_gpu_queue() {
    use crate::{engine::init_engine, mesh::Mesh};
    use externref::ExternRef;
    unsafe {
        if ENGINE.engine2.is_none() {
            init_engine();
            init_gpu(
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            );
        };
        process_gpu_queue(&Resource::new_non_null(std::mem::transmute::<
            usize,
            ExternRef,
        >(1)));
        {
            let queue = GPU_QUEUE.lock().unwrap();
            assert_eq!(queue.len(), 0);
        }
        let mesh = Mesh::new(0.0, 1.0, 0.0, 0, String::from("sun"), None, None);
        {
            let queue = GPU_QUEUE.lock().unwrap();
            assert_eq!(queue[0], mesh);
            assert_eq!(queue.len(), 1);
        }
        process_gpu_queue(&Resource::new_non_null(std::mem::transmute::<
            usize,
            ExternRef,
        >(1)));
        assert_eq!(GPU_QUEUE.lock().unwrap().len(), 0);
    }
}

#[cfg(test)]
#[test]
fn test_gpu_lights() {
    use crate::mesh::ENGINE;
    use crate::{engine::init_engine, mesh::Mesh};
    use externref::ExternRef;

    unsafe {
        if ENGINE.engine2.is_none() {
            init_engine();
            init_gpu(
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
                Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            );
        };
        let engine = ENGINE.engine2.as_mut().unwrap();
        assert_eq!(
            engine.gpu.as_mut().unwrap().swap_buffers.queue_submited(),
            false
        );
        process_gpu_queue(&Resource::new_non_null(std::mem::transmute::<
            usize,
            ExternRef,
        >(2)));
        let mapping = process_gpu_queue(&Resource::new_non_null(std::mem::transmute::<
            usize,
            ExternRef,
        >(2)));
        assert_eq!(mapping, false);
        Mesh::new(0.0, 1.0, 0.0, 0, String::from("sun"), None, None);
        let mapping2 = process_gpu_queue(&Resource::new_non_null(std::mem::transmute::<
            usize,
            ExternRef,
        >(2)));
        assert_eq!(mapping2, true);
    }
}

use std::sync::Mutex;

use externref::{externref, Resource};

use crate::allocators::stack_allocator::StackAllocator;
use crate::engine::GPU_QUEUE;
use crate::mesh::{get_mesh_by_id_mut, ENGINE};
use crate::GPUMesh;

use super::buffer::buffer::JSBuffer;
use super::buffer::copy_dst::CopyDst;
use super::buffer::copy_src::CopySrc;
use super::buffer::mapped_buffer::{MappedGPUBuffer, MappedgpuBuffer};
use super::buffer::usages::COPYSRC_USAGE;
use super::command_encoder::{GPUCommandEncoder, JSCommandEncoder};
use super::compute_pass_encoder::{JSBindGroup, JSComputePipeline};
use super::queue::JSQueue;
use super::{
    buffer::{buffer::GPUBuffer, usages::UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE},
    command_encoder::JSCommandBuffer,
    queue::Queue,
};
pub const GPU_MEMORY_INDEX_SIZE: usize = 256;
pub const DEFAULT_MAX_INSTANCES: usize = 10;
pub static MAX_INSTANCES: Mutex<usize> = Mutex::new(DEFAULT_MAX_INSTANCES);

pub static TEMP_GPU_BUFFERS: Mutex<StackAllocator<Resource<JSBuffer>, 16>> =
    Mutex::new(StackAllocator::new());

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
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
#[externref]
pub unsafe extern "C" fn init_gpu(queue: Resource<JSQueue>) {
    ENGINE.physic_engine_mut().gpu = Some(GPU {
        queue: Queue { externref: queue },
        gpu_buffer: GPUBuffer::<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE>::new(
            GPU_MEMORY_INDEX_SIZE * DEFAULT_MAX_INSTANCES,
            String::from("GPUMeshes"),
            false,
        ),
        pending_command_buffers: Vec::with_capacity(8),
    });
}

#[no_mangle]
pub unsafe extern "C" fn check_mapped_buffers() {
    let engine = ENGINE.physic_engine_mut();
    engine.point_lights.check_mapped_buffers();
    engine.directional_lights.check_mapped_buffers();
}
#[no_mangle]
pub unsafe extern "C" fn gpu_queue_submited() -> bool {
    let engine = ENGINE.physic_engine_mut();
    let mut mapping = false;
    if engine.point_lights.queue_submited() {
        mapping = true
    }
    if engine.directional_lights.queue_submited() {
        mapping = true;
    }
    return mapping;
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
        .push(buffer);
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn process_gpu_queue(
    update_view_pipeline: &Resource<JSComputePipeline>,
    update_view_bindgroup: &Resource<JSBindGroup>,
) {
    let engine = ENGINE.physic_engine_mut();

    let gpu = engine.gpu.as_mut().unwrap();
    gpu.process_gpu_queue(update_view_pipeline, update_view_bindgroup);
}
pub struct GPU {
    pub queue: Queue,
    pub gpu_buffer: GPUBuffer<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE>,
    pub pending_command_buffers: Vec<Resource<JSCommandBuffer>>,
}
impl GPU {
    pub unsafe fn process_gpu_queue(
        &mut self,
        update_view_pipeline: &Resource<JSComputePipeline>,
        update_view_bindgroup: &Resource<JSBindGroup>,
    ) {
        let renderloop_command_encoder =
            GPUCommandEncoder::new(String::from("renderloop_commandEncoder"));
        let engine = ENGINE.physic_engine_mut();
        let mut command_encoder = GPUCommandEncoder::new(String::from("handle_gpu_queue_encoder"));

        //Lights
        engine.directional_lights.update_buffer(&command_encoder);
        engine.point_lights.update_buffer(&command_encoder);

        //Cameras
        let mut some_camera_updated = false;
        for camera in engine.cameras.cameras.iter_mut() {
            if camera.update_view(&command_encoder) {
                some_camera_updated = true;
            }
        }
        let mut update_lights = false;
        // Meshes
        {
            let mut queue = GPU_QUEUE.lock().unwrap();
            if queue.len() > 0 {
                let mut need_resize_to = *MAX_INSTANCES.lock().unwrap();
                let temp_buffer = MappedGPUBuffer::<GPUBuffer<COPYSRC_USAGE>>::new_gpubuffer(
                    std::mem::size_of::<GPUMesh>() * queue.len(),
                    String::from("handle_gpu_queue"),
                    false,
                );
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
                        mesh_on_change(mesh.externref.as_ref());
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
                let meshes_buffer = &mut self.gpu_buffer;
                if need_resize_to > *MAX_INSTANCES.lock().unwrap() {
                    let mut max_instances = MAX_INSTANCES.lock().unwrap();
                    *max_instances = need_resize_to + 16;
                    let old_externref = meshes_buffer
                        .resize(&command_encoder, GPU_MEMORY_INDEX_SIZE * *max_instances);
                    TEMP_GPU_BUFFERS.lock().unwrap().push(old_externref);
                }
                for (i, mesh_id) in queue.drain(..).enumerate() {
                    let mesh = get_mesh_by_id_mut(mesh_id);
                    let mesh_property = mesh.mesh_property.lock().unwrap();
                    meshes_buffer.copy_from(
                        &command_encoder,
                        &*temp_buffer,
                        i * std::mem::size_of::<GPUMesh>(),
                        mesh_property.gpu_mesh_alignment.0 * GPU_MEMORY_INDEX_SIZE,
                        std::mem::size_of::<GPUMesh>(),
                    );
                }
                let unmapped_temp_buffer = temp_buffer.unmap();
                TEMP_GPU_BUFFERS
                    .lock()
                    .unwrap()
                    .push(unmapped_temp_buffer.externref);
            }
        }
        // Cameras continue here because update_lights could change between
        if some_camera_updated || update_lights {
            let lights_pass = command_encoder.begin_compute_pass(String::from("lightPassEncoder"));
            lights_pass.set_pipeline(update_view_pipeline);
            lights_pass.set_bindgroup(0, update_view_bindgroup);
            //If light source has been moved, update all cameras. Otherwise update only cameras that has been moved.
            for camera in engine.cameras.cameras.iter() {
                camera.update_camera(update_lights, &lights_pass);
            }
            command_encoder = lights_pass.end();
        }
        #[cfg(feature = "webgpu")]
        #[cfg(any(not(test), rust_analyzer))]
        render_renderpasses(&renderloop_command_encoder.externref);
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
    }
}

#[cfg(test)]
#[test]
fn test_gpu_process() {
    use crate::{engine::init_engine, mesh::Mesh};
    use externref::ExternRef;
    unsafe {
        if ENGINE.engine2.is_none() {
            init_engine()
        };
        let mut gpu = GPU {
            queue: Queue {
                externref: Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            },
            gpu_buffer: GPUBuffer::new(4, String::from("test"), false),
            pending_command_buffers: Vec::new(),
        };
        gpu.process_gpu_queue(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
        );
        {
            let mut queue = GPU_QUEUE.lock().unwrap();
            assert_eq!(queue.len(), 0);
        }
        let mesh = Mesh::new(0.0, 1.0, 0.0, 0, String::from("sun"), None, None);
        {
            let mut queue = GPU_QUEUE.lock().unwrap();
            assert_eq!(queue[0], mesh);
            assert_eq!(queue.len(), 1);
        }
        gpu.process_gpu_queue(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
        );
        assert_eq!(GPU_QUEUE.lock().unwrap().len(), 0);
    }
}

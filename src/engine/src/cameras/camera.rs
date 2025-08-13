use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, MutexGuard};
use std::{num::NonZero, ptr, sync::Mutex};

use externref::{externref, Resource};
use terramath::MatrixMath;

use crate::gpu::binding_commands::BindingCommands;
use crate::gpu::buffer::buffer::GPUBuffer;
use crate::gpu::command_buffer::CommandBuffer;
use crate::gpu::gpu::GPU;
use crate::projection::Projection;
use crate::{
    gpu::{
        bindgroup::BindGroup, bufferbinding::BufferBinding, command_encoder::GPUCommandEncoder,
        compute_pass_encoder::ComputePassEncoder, gpu::JSDevice,
    },
    mesh::ENGINE,
    swapbuffers::SwapBuffers,
    MULTIVALUE_USIZE,
};

use super::cameracontroller::CameraController;

#[no_mangle]
#[externref]
pub unsafe extern "C" fn get_camera_by_id_mut(
    gpuopt: *mut MutexGuard<'static, Option<GPU>>,
    camera_id: usize,
) -> *mut &Camera {
    let gpu = (*gpuopt).as_mut().unwrap();
    Box::into_raw(Box::new(gpu.get_camera_by_id_mut(camera_id)))
}
#[no_mangle]
pub unsafe extern "C" fn drop_camera_lock(camera: *mut &Camera) {
    let camera = Box::from_raw(camera);
    drop(camera);
}

#[no_mangle]
pub unsafe extern "C" fn get_cameras_count() -> usize {
    //TODO: return actual count not just used space
    NEXT_CAMERA_ID.load(Ordering::Relaxed)
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn get_camera_externref(camera_id: usize) -> usize {
    let gpuopt = ENGINE.gpu.lock().unwrap();
    let gpu = gpuopt.as_ref().unwrap();
    let camera = gpu.get_camera_by_id(camera_id);
    let externref = &camera.externref;
    ptr::read(externref as *const Resource<JSCamera> as *const usize)
}
#[no_mangle]
pub unsafe extern "C" fn get_camera_label(camera_id: usize) -> *const usize {
    let gpuoption = ENGINE.gpu.lock().unwrap();
    let gpu = gpuoption.as_ref().unwrap();
    let label = &gpu.get_camera_by_id(camera_id).label;
    MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = label.len();
    MULTIVALUE_USIZE[2] = label.capacity();
    return MULTIVALUE_USIZE.as_ptr();
}
#[no_mangle]
pub unsafe extern "C" fn update_camera_position(camera: *mut &mut Camera, x: f32, y: f32, z: f32) {
    (*camera).update_position([x, y, z, 0.0]);
}
#[no_mangle]
pub unsafe extern "C" fn update_camera_direction(camera: *mut &mut Camera, x: f32, y: f32, z: f32) {
    (*camera).update_direction([x, y, z, 0.0]);
}

#[externref]
#[no_mangle]
pub unsafe extern "C" fn add_child_to_camera(
    camera_id: usize,
    externref: Resource<JSCamera>,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
    renderpasses_ptr: *mut usize,
    renderpasses_len: usize,
    renderpasses_cap: usize,
) -> usize {
    let renderpasses = Vec::from_raw_parts(renderpasses_ptr, renderpasses_len, renderpasses_cap);

    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    let projection = {
        let mut gpuoption = ENGINE.gpu.lock().unwrap();
        let gpu = gpuoption.as_mut().unwrap();
        gpu.projections[0].clone()
    };
    let camera = Camera::new(None, externref, label, projection, renderpasses);
    let mut gpuoption = ENGINE.gpu.lock().unwrap();
    let gpu = gpuoption.as_mut().unwrap();
    let id = camera.id;
    gpu.get_camera_by_id_mut(camera_id).children.push(camera);
    return id;
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn add_child_to_camera_water(
    camera_id: usize,
    externref: Resource<JSCamera>,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
    renderpasses_ptr: *mut usize,
    renderpasses_len: usize,
    renderpasses_cap: usize,
) -> usize {
    let renderpasses = Vec::from_raw_parts(renderpasses_ptr, renderpasses_len, renderpasses_cap);
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    let projection = {
        let mut gpuoption = ENGINE.gpu.lock().unwrap();
        let gpu = gpuoption.as_mut().unwrap();
        gpu.projections[0].clone()
    };
    let camera = Camera::new(
        Some(Box::new(|do_update_view, direction, position| {
            if (do_update_view & VIEW_UPDATED_POSITION) == VIEW_UPDATED_POSITION {
                position[1] -= (position[1] - 3.0) * 2.0;
            }
            if (do_update_view & VIEW_UPDATED_DIRECTION) == VIEW_UPDATED_DIRECTION {
                direction[1] = -direction[1];
            }
            return do_update_view;
        })),
        externref,
        label,
        projection,
        renderpasses,
    );
    let mut gpuoption = ENGINE.gpu.lock().unwrap();
    let gpu = gpuoption.as_mut().unwrap();
    let id = camera.id;
    gpu.get_camera_by_id_mut(camera_id).children.push(camera);
    return id;
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn add_camera(
    externref: Resource<JSCamera>,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
    renderpasses_ptr: *mut usize,
    renderpasses_len: usize,
    renderpasses_cap: usize,
) -> usize {
    let renderpasses = Vec::from_raw_parts(renderpasses_ptr, renderpasses_len, renderpasses_cap);
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    let projection = {
        let mut gpuoption = ENGINE.gpu.lock().unwrap();
        let gpu = gpuoption.as_mut().unwrap();
        gpu.projections[0].clone()
    };
    let camera = Camera::new(None, externref, label, projection, renderpasses);

    let mut gpuoption = ENGINE.gpu.lock().unwrap();
    let gpu = gpuoption.as_mut().unwrap();
    let id = camera.id;
    gpu.cameras.insert(camera);
    return id;
}
#[no_mangle]
pub unsafe extern "C" fn get_camera_direction_ptr(camera: *mut &Camera) -> *const f32 {
    (*camera).direction.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn get_camera_position_ptr(camera: *mut &Camera) -> *const f32 {
    (*camera).position.as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn update_camera_projection_view_inverted(camera_id: usize) {
    let mut gpuoption = ENGINE.gpu.lock().unwrap();

    let camera = gpuoption.as_mut().unwrap().get_camera_by_id_mut(camera_id);
    if camera.projection_view_inverted_is_dirty {
        camera.projection_view_inverted = camera.views.projection_view.invert();
        camera.projection_view_inverted_is_dirty = false;
    }
}

pub struct JSCamera(());
static NEXT_CAMERA_ID: AtomicUsize = AtomicUsize::new(0);

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "camera")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn on_update_position(externref: &Resource<JSCamera>, x: f32, y: f32, z: f32);

}
static TILE_COUNT: [u32; 3] = [32, 18, 48];
static CLUSTER_WORKGROUP_SIZE: [u32; 3] = [4, 2, 4];
pub static CLUSTER_DISPATCH_SIZE: [u32; 3] = [
    TILE_COUNT[0] / CLUSTER_WORKGROUP_SIZE[0],
    TILE_COUNT[1] / CLUSTER_WORKGROUP_SIZE[1],
    TILE_COUNT[2] / CLUSTER_WORKGROUP_SIZE[2],
];
static TOTAL_CLUSTERS: u32 = TILE_COUNT[0] * TILE_COUNT[1] * TILE_COUNT[2];
static CLUSTER_SIZE_IN_BYTES: u32 = TOTAL_CLUSTERS * (8 + 64) * 4;

pub static VIEW_UPDATED_POSITION: u32 = 1;
pub static VIEW_UPDATED_DIRECTION: u32 = 2;
static UNIFORM_BUFFER_SIZE: usize =
    /* modelViewProjectionMatrix + view matrix */
    4 * 16 * 2 /* viewPosition */ +
  4 * 4;

struct Views {
    pub projection_view: [[f32; 4]; 4],
    pub view: [[f32; 4]; 4],
}
#[repr(C, align(4))]
pub struct Camera {
    pub projection: Arc<Projection>,
    views: Views,
    pub projection_view_inverted: [[f32; 4]; 4],
    pub direction: [f32; 4],
    pub position: [f32; 4],
    externref: Resource<JSCamera>,
    pub updated: bool,
    pub label: String,
    pub children: Vec<Camera>,
    pub do_update_view: u32,
    pub id: usize,
    before_view_update: Option<Box<dyn Fn(u32, &mut [f32; 4], &mut [f32; 4]) -> u32 + Send>>,
    pub on_update_position: Vec<Box<dyn Fn(&[f32; 4], &mut Vec<CommandBuffer>, &Resource<JSDevice>) + Send>>,
    projection_view_inverted_is_dirty: bool,
    buffer: Arc<Mutex<GPUBuffer<false, false, false, true, false, false, true>>>,
    cluster_array_buffer:
        Arc<Mutex<GPUBuffer<false, false, false, false, false, false, false, true>>>,
    update_view_bind_group: Arc<BindGroup<2>>,
    pub update_clusters_bind_group: Arc<BindGroup<2>>,
    pub uniform_bindgroup: Arc<BindGroup<5>>,
    pub controller: Option<Box<dyn CameraController + Send>>,
}
impl Camera {
    pub fn new(
        before_view_update: Option<Box<dyn Fn(u32, &mut [f32; 4], &mut [f32; 4]) -> u32 + Send>>,
        externref: Resource<JSCamera>,
        label: String,
        projection: Arc<Projection>,
        renderpasses: Vec<usize>,
    ) -> Camera {
        let mut maybegpu = ENGINE.gpu.lock().unwrap();
        let gpu = maybegpu.as_mut().unwrap();

        let camerauniform_buffer = Arc::new(Mutex::new(GPUBuffer::<
            false,
            false,
            false,
            true,
            false,
            false,
            true,
        >::new(
            &gpu.device,
            UNIFORM_BUFFER_SIZE,
            String::from("camerauniformBuffer"),
            false,
        )));
        let buffer_binding = BufferBinding::new(
            camerauniform_buffer.clone(),
            0,
            NonZero::new(UNIFORM_BUFFER_SIZE),
        );
        let cluster_array_buffer = Arc::new(Mutex::new(GPUBuffer::<
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            true,
        >::new(
            &gpu.device,
            CLUSTER_SIZE_IN_BYTES as usize,
            String::from("clusterArrayBuffer"),
            false,
        )));

        let cluster_array_buffer_binding = BufferBinding::new(
            cluster_array_buffer.clone(),
            0,
            NonZero::new(CLUSTER_SIZE_IN_BYTES as usize),
        );
        let update_view_bind_group = BindGroup::new(
            String::from("updateViewBindGroup2"),
            &gpu.update_clusters_layout,
            [cluster_array_buffer_binding.clone(), buffer_binding.clone()],
        );

        let projection_binding = BufferBinding::new(projection.buffer.clone(), 0, None);

        let update_clusters_bind_group = BindGroup::new(
            String::from("update_clusters_bind_group"),
            &gpu.clusters_layout,
            [
                cluster_array_buffer_binding.clone(),
                projection_binding.clone(),
            ],
        );

        let gpu_buffer_binding = BufferBinding::new(gpu.gpu_buffer.clone(), 0, None);

        let uniform_bindgroup = BindGroup::new(
            String::from("uniformBindGroup"),
            &gpu.uniform_bind_group_layout_with_time,
            [
                cluster_array_buffer_binding,
                gpu_buffer_binding,
                projection_binding,
                buffer_binding,
                BufferBinding::new(gpu.timebuffer.clone(), 0, None),
            ],
        );
        let camera = Camera {
            projection,
            views: Views {
                projection_view: [[0.0; 4]; 4],
                view: [
                    [0.0, 0.0, 0.0, 0.0],
                    [0.0, 0.0, 0.0, 0.0],
                    [0.0, 0.0, 0.0, 0.0],
                    [0.0, 0.0, 0.0, 1.0],
                ],
            },
            projection_view_inverted: [[0.0; 4]; 4],
            position: [0.0; 4],
            direction: [1.0, 0.0, 0.0, 0.0],
            externref,
            updated: false,
            label,
            children: Vec::new(),
            do_update_view: 0,
            id: NEXT_CAMERA_ID.fetch_add(1, Ordering::Relaxed),
            before_view_update,
            projection_view_inverted_is_dirty: false,
            buffer: camerauniform_buffer,
            cluster_array_buffer,
            update_view_bind_group,
            update_clusters_bind_group,
            on_update_position: Vec::new(),
            uniform_bindgroup,
            controller: None,
        };
        for renderpass_id in renderpasses {
            gpu.renderpasses[renderpass_id].cameragroups[0]
                .cameras
                .push(camera.id);
        }
        return camera;
    }
    pub fn check_inputs(&mut self) {
        if let Some(controller) = &mut self.controller {
            self.do_update_view |= controller.check_inputs(
                false,
                &mut self.position,
                &mut self.direction,
                &self.views.view,
            );
        }
        for camera in &mut self.children {
            camera.check_inputs();
        }
    }
    pub fn find_child(&self, camera_id: usize) -> Option<&Camera> {
        for camera in self.children.iter() {
            if camera.id == camera_id {
                return Some(camera);
            } else if let Some(child_camera) = camera.find_child(camera_id) {
                return Some(child_camera);
            }
        }
        return None;
    }
    pub fn find_child_mut(&mut self, camera_id: usize) -> Option<&mut Camera> {
        for camera in self.children.iter_mut() {
            if camera.id == camera_id {
                return Some(camera);
            } else if let Some(child_camera) = camera.find_child_mut(camera_id) {
                return Some(child_camera);
            }
        }
        return None;
    }
    fn on_update_position(&self) {
        #[cfg(feature = "webgpu")]
        #[cfg(any(not(test), rust_analyzer))]
        unsafe {
            on_update_position(
                &self.externref,
                self.position[0],
                self.position[1],
                self.position[2],
            );
        }
    }
    pub fn update_position(&mut self, position: [f32; 4]) {
        if position[0] != self.position[0]
            || position[1] != self.position[1]
            || position[2] != self.position[2]
        {
            self.position = position;
            self.do_update_view |= VIEW_UPDATED_POSITION;
        }
    }
    pub fn update_direction(&mut self, direction: [f32; 4]) {
        if direction[0] != self.direction[0]
            || direction[1] != self.direction[1]
            || direction[2] != self.direction[2]
        {
            self.direction = direction;
            self.do_update_view |= VIEW_UPDATED_DIRECTION;
        }
    }
    pub fn update_view(
        &mut self,
        pending_command_buffers: &mut Vec<CommandBuffer>,
        device: &Resource<JSDevice>,
        command_encoder: &mut GPUCommandEncoder,
        swap_buffer: &mut SwapBuffers,
        projection_changed: bool,
    ) -> bool {
        let camera_updated = self.do_update_view != 0;
        if self.do_update_view != 0 {
            if let Some(before_view_update) = &self.before_view_update {
                self.do_update_view |= before_view_update(
                    self.do_update_view,
                    &mut self.direction,
                    &mut self.position,
                );
            }
            if (self.do_update_view & VIEW_UPDATED_POSITION) == VIEW_UPDATED_POSITION {
                for cb in self.on_update_position.iter() {
                    cb(&self.position, pending_command_buffers, device);
                }
                // To use with JS interop
                self.on_update_position();
            }
            for child in self.children.iter_mut() {
                if (self.do_update_view & VIEW_UPDATED_POSITION) == VIEW_UPDATED_POSITION {
                    child.update_position(self.position.clone());
                }
                if (self.do_update_view & VIEW_UPDATED_DIRECTION) == VIEW_UPDATED_DIRECTION {
                    child.update_direction(self.direction.clone());
                }
            }
        }

        if projection_changed || self.do_update_view != 0 {
            for child in self.children.iter_mut() {
                child.update_view(
                    pending_command_buffers,
                    device,
                    command_encoder,
                    swap_buffer,
                    projection_changed,
                );
            }
            //Camera direction
            self.views.view[0][2] = self.direction[0];
            self.views.view[1][2] = self.direction[1];
            self.views.view[2][2] = self.direction[2];

            self.views.view[0][0] = self.views.view[2][2];
            self.views.view[2][0] = -self.views.view[0][2];

            let x_square_length = self.views.view[0][0] * self.views.view[0][0]
                + self.views.view[2][0] * self.views.view[2][0];
            if x_square_length == 0.0 {
                self.views.view[0][0] = 1.0;
            } else {
                let len = x_square_length.sqrt();
                if !(len == 0.0 || len == 1.0) {
                    let scale = 1.0 / len;
                    self.views.view[0][0] *= scale;
                    self.views.view[2][0] *= scale;
                }
            }
            // Y axis
            self.views.view[0][1] = self.views.view[1][2] * self.views.view[2][0];
            self.views.view[1][1] = self.views.view[2][2] * self.views.view[0][0]
                - self.views.view[0][2] * self.views.view[2][0];
            self.views.view[2][1] = -(self.views.view[1][2] * self.views.view[0][0]);
            // Eye angles, dot products
            //x
            self.views.view[3][0] = -(self.views.view[0][0] * self.position[0]
                + self.views.view[2][0] * self.position[2]);
            //y
            self.views.view[3][1] = -(self.views.view[0][1] * self.position[0]
                + self.views.view[1][1] * self.position[1]
                + self.views.view[2][1] * self.position[2]);
            //z
            self.views.view[3][2] = -(self.views.view[0][2] * self.position[0]
                + self.views.view[1][2] * self.position[1]
                + self.views.view[2][2] * self.position[2]);

            self.projection_view_inverted_is_dirty = true;

            self.views.projection_view = self.views.view.multiply(
                &self
                    .projection
                    .inner_projection
                    .projection_reversed_z
                    .lock()
                    .unwrap(),
            );
            swap_buffer.get(device, 128, |buffer| {
                buffer.set_mapped_range(&self.views, 0);
                command_encoder.copy_buffer_to_buffer(
                    &**buffer,
                    &(*self.buffer.lock().unwrap()),
                    0,
                    0,
                    128,
                );
            });
            self.do_update_view = 0;
            self.updated = true;
        } else {
            self.updated = false;
        }
        return camera_updated;
    }
    pub fn update_camera(
        &self,
        device: &Resource<JSDevice>,
        force: bool,
        lights_pass: &mut ComputePassEncoder,
    ) {
        if force || self.updated {
            lights_pass.set_bindgroup(device, 1, &self.update_view_bind_group, &[]);
            lights_pass.dispatch_workgroups(
                CLUSTER_DISPATCH_SIZE[0],
                CLUSTER_DISPATCH_SIZE[1],
                CLUSTER_DISPATCH_SIZE[2],
            );
        }
        for child in self.children.iter() {
            child.update_camera(device, force, lights_pass);
        }
    }
}

#[cfg(test)]
#[test]
fn test_child_camera() {
    use crate::gpu::{self, gpu::init_gpu};
    use crate::projection::Projection;
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
        );
        let projection = Arc::new(Projection::new(&Resource::new_non_null(
            std::mem::transmute::<usize, ExternRef>(0),
        )));
        let mut camera = Camera::new(
            None,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            String::from("test"),
            projection.clone(),
            Vec::new(),
        );
        let child_1 = Camera::new(
            None,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            String::from("camera1.0"),
            Arc::new(Projection::new(&Resource::new_non_null(
                std::mem::transmute::<usize, ExternRef>(0),
            ))),
            Vec::new(),
        );
        camera.update_position([1.0, 2.0, 3.0, 0.0]);
        camera.children.push(child_1);
        let mut command_encoder = GPUCommandEncoder::new(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            String::from("test"),
        );

        let mut swap_buffers = SwapBuffers::new();

        camera.update_view(
            &mut Vec::new(),
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            &mut command_encoder,
            &mut swap_buffers,
            false,
        );
        assert_eq!(camera.children[0].position, [1.0, 2.0, 3.0, 0.0]);
        camera.update_view(
            &mut Vec::new(),
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            &mut command_encoder,
            &mut swap_buffers,
            false,
        );
        assert_eq!(camera.children[0].position, [1.0, 2.0, 3.0, 0.0]);

        assert_eq!(
            camera.views.view,
            [
                [0.0, -0.0, 1.0, 0.0],
                [0.0, 1.0, 0.0, 0.0],
                [-1.0, -0.0, 0.0, 0.0],
                [3.0, -2.0, -1.0, 1.0]
            ]
        );
        assert_eq!(
            camera.views.projection_view,
            [
                [0.0, 0.0, 0.0, -1.0],
                [0.0, 4.933155, 0.0, 0.0],
                [-4.933155, 0.0, 0.0, 0.0],
                [14.799465, -9.86631, 1.0, 1.0]
            ]
        );

        projection.inner_projection.create_buffer(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            2.0,
        );
        camera.update_view(
            &mut Vec::new(),
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            &mut command_encoder,
            &mut swap_buffers,
            true,
        );
        assert_eq!(
            camera.views.projection_view,
            [
                [0.0, 0.0, 0.0, -1.0],
                [0.0, 4.933155, 0.0, 0.0],
                [-2.4665775, 0.0, 0.0, 0.0],
                [7.3997326, -9.86631, 1.0, 1.0]
            ]
        );
    }
}

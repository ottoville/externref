use std::cell::RefCell;
use std::num::NonZeroUsize;
use std::rc::{Rc, Weak};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::{num::NonZero, ptr};

use externref::{externref, Resource};
use terramath::{MatrixMath, VectorMath, VectorMathF32};
use webgpu::bindgroup::bufferbinding::BufferBinding;
use webgpu::bindgroup_layout::BindGroupLayout;
use webgpu::command_encoder::GPUCommandEncoder;
use webgpu::compute_pass_encoder::ComputePassEncoder;
use webgpu::device::JSDevice;

use crate::gpu::gpu::GPU;
use crate::projection::Projection;
use crate::swapbuffers::SwapBuffers;
use webgpu::bindgroup::bindgroup::BindGroup;
use webgpu::binding_commands::BindingCommands;
use webgpu::buffer::buffer::GPUBuffer;
use webgpu::command_buffer::CommandBuffer;

use super::cameracontroller::CameraController;

pub type CameraPtr = *mut Weak<Camera>;

#[no_mangle]
pub unsafe extern "C" fn get_cameras_count() -> u32 {
    //TODO: return actual count not just used space
    NEXT_CAMERA_ID.load(Ordering::Relaxed)
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn get_camera_externref(camera_id: u32, gpu: *mut GPU) -> usize {
    let camera_rc = (*gpu).get_camera_by_id(camera_id);
    let camera = camera_rc.camera.borrow();
    let externref = &camera.externref;
    ptr::read(externref as *const Resource<JSCamera> as *const usize)
}
thread_local! {
    static CAMERA_LABEL:RefCell<[usize; 3]> = const { RefCell::new([0;3]) };
}
#[no_mangle]
pub unsafe extern "C" fn get_camera_label(camera: CameraPtr) -> *mut [usize; 3] {
    let label = &(&(*camera)).upgrade().unwrap().label;
    CAMERA_LABEL.set([label.as_ptr() as usize, label.len(), label.capacity()]);
    CAMERA_LABEL.with(|camera_label| camera_label.as_ptr())
}
#[no_mangle]
pub unsafe extern "C" fn update_camera_position(camera: CameraPtr, x: f32, y: f32, z: f32) {
    (&(*camera))
        .upgrade()
        .unwrap()
        .camera
        .borrow_mut()
        .update_position([x, y, z, 0.0]);
}
#[no_mangle]
pub unsafe extern "C" fn update_camera_direction(camera: CameraPtr, x: f32, y: f32, z: f32) {
    (&(*camera))
        .upgrade()
        .unwrap()
        .camera
        .borrow_mut()
        .update_direction([x, y, z, 0.0]);
}

#[no_mangle]
pub unsafe extern "C" fn get_camera_direction_ptr(camera: CameraPtr) -> *const f32 {
    (&(*camera))
        .upgrade()
        .unwrap()
        .camera
        .borrow()
        .direction
        .as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn get_camera_position_ptr(camera: CameraPtr) -> *const f32 {
    (&(*camera))
        .upgrade()
        .unwrap()
        .camera
        .borrow()
        .position
        .as_ptr()
}

pub struct JSCamera(());
static NEXT_CAMERA_ID: AtomicU32 = AtomicU32::new(0);

#[cfg(not(target_arch = "wasm32"))]
unsafe fn create_camera(_id: CameraPtr, _maincamera: bool) -> Resource<JSCamera> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "camera")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn on_update_position(externref: &Resource<JSCamera>, x: f32, y: f32, z: f32);
    fn create_camera(id: CameraPtr, maincamera: bool) -> Resource<JSCamera>;
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
pub struct Camera {
    pub id: u32,
    pub label: String,
    pub camera: RefCell<InnerCamera>,
}
impl Camera {
    pub fn new(
        before_view_update: Option<Box<dyn Fn(u32, &mut [f32; 4], &mut [f32; 4]) -> u32 + Send>>,
        label: String,
        projection: Arc<Projection>,
        device: &Resource<JSDevice>,
        update_clusters_layout: &BindGroupLayout<2>,
        timebuffer: Rc<RefCell<GPUBuffer<false, false, false, true, false, false, true>>>,
        uniform_bind_group_layout_with_time: &BindGroupLayout<5>,
        gpu_buffer: Rc<RefCell<GPUBuffer<false, false, true, true, false, false, true, true>>>,
        clusters_layout: &BindGroupLayout<2>,
    ) -> Rc<Self> {
        let camerauniform_buffer = Rc::new(RefCell::new(GPUBuffer::<
            false,
            false,
            false,
            true,
            false,
            false,
            true,
        >::new(
            device,
            unsafe { NonZeroUsize::new_unchecked(UNIFORM_BUFFER_SIZE) },
            String::from("camerauniformBuffer"),
        )));
        let buffer_binding = BufferBinding::new(
            camerauniform_buffer.clone(),
            0,
            NonZero::new(UNIFORM_BUFFER_SIZE),
        );
        let cluster_array_buffer = Rc::new(RefCell::new(GPUBuffer::<
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            true,
        >::new(
            device,
            unsafe { NonZeroUsize::new_unchecked(CLUSTER_SIZE_IN_BYTES as usize) },
            String::from("clusterArrayBuffer"),
        )));

        let cluster_array_buffer_binding = BufferBinding::new(
            cluster_array_buffer.clone(),
            0,
            NonZero::new(CLUSTER_SIZE_IN_BYTES as usize),
        );
        let update_view_bind_group = BindGroup::new(
            String::from("updateViewBindGroup2"),
            &update_clusters_layout,
            [cluster_array_buffer_binding.clone(), buffer_binding.clone()],
        );

        let projection_binding = BufferBinding::new(projection.buffer.clone(), 0, None);

        let update_clusters_bind_group = BindGroup::new(
            String::from("update_clusters_bind_group"),
            clusters_layout,
            [
                cluster_array_buffer_binding.clone(),
                projection_binding.clone(),
            ],
        );

        let gpu_buffer_binding = BufferBinding::new(gpu_buffer, 0, None);

        let uniform_bindgroup = BindGroup::new(
            String::from("uniformBindGroup"),
            uniform_bind_group_layout_with_time,
            [
                cluster_array_buffer_binding,
                gpu_buffer_binding,
                projection_binding,
                buffer_binding,
                BufferBinding::new(timebuffer, 0, None),
            ],
        );
        let id = NEXT_CAMERA_ID.fetch_add(1, Ordering::Relaxed);
        let camera = Rc::new_cyclic(|weak| {
            let externref = unsafe {
                create_camera(Box::into_raw(Box::new(weak.clone())), label == "mainCamera")
            };
            Camera {
                id,
                label,
                camera: RefCell::new(InnerCamera {
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
                    children: Vec::new(),
                    do_update_view: 0,
                    before_view_update,
                    projection_view_inverted_is_dirty: false,
                    buffer: camerauniform_buffer,
                    cluster_array_buffer,
                    update_view_bind_group,
                    update_clusters_bind_group,
                    on_update_position: Vec::new(),
                    uniform_bindgroup,
                    controller: None,
                }),
            }
        });
        return camera;
    }
    pub fn find_child(&self, camera_id: u32) -> Option<Rc<Camera>> {
        for camera_cell in self.camera.borrow().children.iter() {
            if camera_cell.id == camera_id {
                return Some(camera_cell.clone());
            } else if let Some(child_camera) = camera_cell.find_child(camera_id) {
                return Some(child_camera);
            }
        }
        return None;
    }
}
#[repr(C, align(4))]
pub struct InnerCamera {
    pub projection: Arc<Projection>,
    views: Views,
    pub projection_view_inverted: [[f32; 4]; 4],
    pub direction: [f32; 4],
    pub position: [f32; 4],
    externref: Resource<JSCamera>,
    pub updated: bool,
    pub children: Vec<Rc<Camera>>,
    pub do_update_view: u32,
    before_view_update: Option<Box<dyn Fn(u32, &mut [f32; 4], &mut [f32; 4]) -> u32 + Send>>,
    pub on_update_position:
        Vec<Box<dyn Fn(&[f32; 4], &mut Vec<CommandBuffer>, &Resource<JSDevice>) + Send>>,
    projection_view_inverted_is_dirty: bool,
    buffer: Rc<RefCell<GPUBuffer<false, false, false, true, false, false, true>>>,
    cluster_array_buffer:
        Rc<RefCell<GPUBuffer<false, false, false, false, false, false, false, true>>>,
    update_view_bind_group: Rc<BindGroup<2>>,
    pub update_clusters_bind_group: Rc<BindGroup<2>>,
    pub uniform_bindgroup: Rc<BindGroup<5>>,
    pub controller: Option<Box<dyn CameraController + Send>>,
}
impl InnerCamera {
    pub fn update_camera_projection_view_inverted(&mut self) {
        if self.projection_view_inverted_is_dirty {
            self.projection_view_inverted = self.views.projection_view.invert();
            self.projection_view_inverted_is_dirty = false;
        }
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
            camera.camera.borrow_mut().check_inputs();
        }
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
    pub fn set_direction_from_target(&mut self, target: &[f32; 4]) {
        self.position.sub_vec_to_ref(target, &mut self.direction);
        self.direction.normalize_in_place();
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
                    child
                        .camera
                        .borrow_mut()
                        .update_position(self.position.clone());
                }
                if (self.do_update_view & VIEW_UPDATED_DIRECTION) == VIEW_UPDATED_DIRECTION {
                    child
                        .camera
                        .borrow_mut()
                        .update_direction(self.direction.clone());
                }
            }
        }

        if projection_changed || self.do_update_view != 0 {
            for child in self.children.iter_mut() {
                child.camera.borrow_mut().update_view(
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
            swap_buffer.get(
                device,
                unsafe { NonZeroUsize::new_unchecked(128) },
                |buffer| {
                    buffer.set_mapped_range(&self.views, 0);
                    command_encoder.copy_buffer_to_buffer(
                        &**buffer,
                        &(*self.buffer.borrow()),
                        0,
                        0,
                        unsafe { NonZeroUsize::new_unchecked(128) },
                    );
                },
            );
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
            child
                .camera
                .borrow_mut()
                .update_camera(device, force, lights_pass);
        }
    }
}

#[cfg(test)]
#[test]
fn test_child_camera() {
    use crate::gpu::gpu::init_gpu;
    use crate::gpu::shader::{
        SHADER_STAGE_COMPUTE, SHADER_STAGE_FRAGMENT, SHADER_STAGE_VERTEX,
        SHADER_STAGE_VERTEX_AND_FRAGMENT,
    };
    use crate::projection::Projection;
    use externref::ExternRef;
    use webgpu::buffer_binding_layout::{BufferBindingType, GPUBindingLayout};
    unsafe {
        let gpu = &mut *init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );

        let clusters = GPUBindingLayout::<SHADER_STAGE_COMPUTE>::new_buffer(
            0,
            BufferBindingType::Storage,
            false,
            7962624,
        );
        let view_uniforms = GPUBindingLayout::<SHADER_STAGE_COMPUTE>::new_buffer(
            1,
            BufferBindingType::Uniform,
            false,
            144,
        );
        let update_clusters_layout = BindGroupLayout::new(
            &gpu.device,
            String::from("UpdateClustersLayout"),
            [&clusters, &view_uniforms],
        );
        let clusters_array = GPUBindingLayout::<SHADER_STAGE_FRAGMENT>::new_buffer(
            0,
            BufferBindingType::ReadOnlyStorage,
            false,
            7962624,
        );
        let meshes = GPUBindingLayout::<SHADER_STAGE_FRAGMENT>::new_buffer(
            1,
            BufferBindingType::ReadOnlyStorage,
            false,
            512,
        );
        let scene = GPUBindingLayout::<SHADER_STAGE_VERTEX_AND_FRAGMENT>::new_buffer(
            3,
            BufferBindingType::Uniform,
            false,
            144,
        );
        let time = GPUBindingLayout::<SHADER_STAGE_VERTEX>::new_buffer(
            4,
            BufferBindingType::Uniform,
            false,
            4,
        );
        let projection = GPUBindingLayout::<SHADER_STAGE_FRAGMENT>::new_buffer(
            2,
            BufferBindingType::Uniform,
            false,
            224,
        );
        let uniform_bind_group_layout_with_time = BindGroupLayout::new(
            &gpu.device,
            String::from("uniformBindGroupLayoutWithTime"),
            [&clusters_array, &meshes, &projection, &scene, &time],
        );
        let clusters_layout = BindGroupLayout::new(
            &gpu.device,
            String::from("clusters_layout"),
            [&clusters, &view_uniforms],
        );
        let projection = Arc::new(Projection::new(&Resource::new_non_null(
            std::mem::transmute::<usize, ExternRef>(0),
        )));
        let camera = Camera::new(
            None,
            String::from("test"),
            projection.clone(),
            &gpu.device,
            &update_clusters_layout,
            gpu.timebuffer.clone(),
            &uniform_bind_group_layout_with_time,
            gpu.gpu_buffer.clone(),
            &clusters_layout,
        );
        let child_1 = Camera::new(
            None,
            String::from("camera1.0"),
            Arc::new(Projection::new(&Resource::new_non_null(
                std::mem::transmute::<usize, ExternRef>(0),
            ))),
            &gpu.device,
            &update_clusters_layout,
            gpu.timebuffer.clone(),
            &uniform_bind_group_layout_with_time,
            gpu.gpu_buffer.clone(),
            &clusters_layout,
        );
        let mut swap_buffers = SwapBuffers::new();
        let mut command_encoder = GPUCommandEncoder::new(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            String::from("test"),
        );
        {
            let mut innercamera = camera.camera.borrow_mut();
            innercamera.update_position([1.0, 2.0, 3.0, 0.0]);
            innercamera.children.push(child_1.clone());

            innercamera.update_view(
                &mut Vec::new(),
                &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                &mut command_encoder,
                &mut swap_buffers,
                false,
            );
            assert_eq!(
                innercamera.children[0].camera.borrow().position,
                [1.0, 2.0, 3.0, 0.0]
            );

            innercamera.update_view(
                &mut Vec::new(),
                &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                &mut command_encoder,
                &mut swap_buffers,
                false,
            );
            assert_eq!(
                innercamera.children[0].camera.borrow().position,
                [1.0, 2.0, 3.0, 0.0]
            );

            assert_eq!(
                innercamera.views.view,
                [
                    [0.0, -0.0, 1.0, 0.0],
                    [0.0, 1.0, 0.0, 0.0],
                    [-1.0, -0.0, 0.0, 0.0],
                    [3.0, -2.0, -1.0, 1.0]
                ]
            );
            assert_eq!(
                innercamera.views.projection_view,
                [
                    [0.0, 0.0, 0.0, -1.0],
                    [0.0, 4.933155, 0.0, 0.0],
                    [-4.933155, 0.0, 0.0, 0.0],
                    [14.799465, -9.86631, 1.0, 1.0]
                ]
            );
        }

        projection.inner_projection.create_buffer(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            2.0,
        );

        {
            let mut innercamera = camera.camera.borrow_mut();
            innercamera.update_view(
                &mut Vec::new(),
                &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                &mut command_encoder,
                &mut swap_buffers,
                true,
            );
            assert_eq!(
                innercamera.views.projection_view,
                [
                    [0.0, 0.0, 0.0, -1.0],
                    [0.0, 4.933155, 0.0, 0.0],
                    [-2.4665775, 0.0, 0.0, 0.0],
                    [7.3997326, -9.86631, 1.0, 1.0]
                ]
            );
        }
    }
}

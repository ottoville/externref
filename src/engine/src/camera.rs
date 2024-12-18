use std::{
    cell::RefCell,
    rc::Rc,
    sync::atomic::{AtomicU32, Ordering},
};

use externref::{externref, Resource};
use terramath::MatrixMath;

use crate::{
    gpu::{
        buffer::{
            buffer::{GPUBuffer, JSBuffer},
            copy_dst::CopyDst,
            usages::{COPYSRC_USAGE, UNIFORM_COPYDST_USAGE},
        },
        command_encoder::GPUCommandEncoder,
        compute_pass_encoder::{ComputePassEncoder, JSBindGroup},
        gpu::{JSDevice, TEMP_GPU_BUFFERS},
    },
    mesh::ENGINE,
    projection::Projection,
    MULTIVALUE_USIZE,
};
#[no_mangle]
pub unsafe extern "C" fn get_cameras_count() -> u32 {
    NEXT_CAMERA_ID.load(Ordering::Relaxed)
}

#[no_mangle]
#[externref]
pub unsafe extern "C" fn get_camera_externref(camera_id: u32) -> &'static Resource<JSCamera> {
    &ENGINE
        .physic_engine()
        .cameras
        .get_camera_by_id(camera_id)
        .externref
}
#[no_mangle]
pub unsafe extern "C" fn get_camera_label(camera_id: u32) -> *const usize {
    let label = &ENGINE
        .physic_engine()
        .cameras
        .get_camera_by_id(camera_id)
        .label;
    MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = label.len();
    MULTIVALUE_USIZE[2] = label.capacity();
    return MULTIVALUE_USIZE.as_ptr();
}
#[no_mangle]
pub unsafe extern "C" fn update_camera_position(camera_id: u32, x: f32, y: f32, z: f32) {
    ENGINE
        .physic_engine_mut()
        .cameras
        .get_camera_by_id_mut(camera_id)
        .update_position([x, y, z]);
}
#[no_mangle]
pub unsafe extern "C" fn update_camera_direction(camera_id: u32, x: f32, y: f32, z: f32) {
    ENGINE
        .physic_engine_mut()
        .cameras
        .get_camera_by_id_mut(camera_id)
        .update_direction([x, y, z]);
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn add_child_to_camera(
    camera_id: u32,
    externref: Resource<JSCamera>,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> u32 {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    let camera = Camera::new(externref, label);
    let id = camera.id;
    ENGINE
        .physic_engine_mut()
        .cameras
        .get_camera_by_id_mut(camera_id)
        .children
        .push(camera);
    return id;
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn add_child_to_camera_water(
    camera_id: u32,
    externref: Resource<JSCamera>,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> u32 {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    let camera = Camera::new_water(externref, label);
    let id = camera.id;
    ENGINE
        .physic_engine_mut()
        .cameras
        .get_camera_by_id_mut(camera_id)
        .children
        .push(camera);
    return id;
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn add_camera(
    externref: Resource<JSCamera>,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> u32 {
    let cameras = &mut ENGINE.physic_engine_mut().cameras;
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    let camera = Camera::new(externref, label);
    let id = camera.id;
    cameras.cameras.push(camera);
    return id;
}
#[no_mangle]
pub unsafe extern "C" fn get_camera_direction_ptr(camera_id: u32) -> *const f32 {
    ENGINE
        .physic_engine()
        .cameras
        .get_camera_by_id(camera_id)
        .direction
        .as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn get_camera_position_ptr(camera_id: u32) -> *const f32 {
    ENGINE
        .physic_engine()
        .cameras
        .get_camera_by_id(camera_id)
        .position
        .as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn get_camera_view_ptr(camera_id: u32) -> *const [f32; 4] {
    ENGINE
        .physic_engine()
        .cameras
        .get_camera_by_id(camera_id)
        .view
        .as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn get_camera_projection_inverted_ptr(camera_id: u32) -> *const [f32; 4] {
    ENGINE
        .physic_engine()
        .cameras
        .get_camera_by_id(camera_id)
        .projection_view_inverted
        .as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn update_camera_projection_view_inverted(camera_id: u32) {
    let camera = ENGINE
        .physic_engine_mut()
        .cameras
        .get_camera_by_id_mut(camera_id);
    if camera.projection_view_inverted_is_dirty {
        camera
            .projection_view
            .invert_to_ref(&mut camera.projection_view_inverted);
        camera.projection_view_inverted_is_dirty = false;
    }
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn get_camera_buffer(camera_id: u32) -> &'static Resource<JSBuffer> {
    &ENGINE
        .physic_engine()
        .cameras
        .get_camera_by_id(camera_id)
        .buffer
        .externref
}
pub struct JSCamera(());
static NEXT_CAMERA_ID: AtomicU32 = AtomicU32::new(0);

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "camera")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn get_update_view_bindgroup(externref: &Resource<JSCamera>) -> Resource<JSBindGroup>;
    fn on_update_position(externref: &Resource<JSCamera>);

}
static TILE_COUNT: [u32; 3] = [32, 18, 48];
static CLUSTER_WORKGROUP_SIZE: [u32; 3] = [4, 2, 4];
static CLUSTER_DISPATCH_SIZE: [u32; 3] = [
    TILE_COUNT[0] / CLUSTER_WORKGROUP_SIZE[0],
    TILE_COUNT[1] / CLUSTER_WORKGROUP_SIZE[1],
    TILE_COUNT[2] / CLUSTER_WORKGROUP_SIZE[2],
];
static VIEW_UPDATED_POSITION: u32 = 1;
static VIEW_UPDATED_DIRECTION: u32 = 2;
static UNIFORM_BUFFER_SIZE: usize =
    /* modelViewProjectionMatrix + view matrix */
    4 * 16 * 2 /* viewPosition */ +
  4 * 4;
#[repr(C, align(4))]
pub struct Camera {
    projection: Rc<RefCell<Projection>>,
    projection_view: [[f32; 4]; 4],
    view: [[f32; 4]; 4],
    projection_view_inverted: [[f32; 4]; 4],
    direction: [f32; 3],
    position: [f32; 3],
    externref: Resource<JSCamera>,
    updated: bool,
    pub label: String,
    pub children: Vec<Camera>,
    do_update_view: u32,
    pub id: u32,
    before_view_update: Option<Box<dyn Fn(&mut [f32; 3], &mut [f32; 3])>>,
    projection_view_inverted_is_dirty: bool,
    buffer: GPUBuffer<UNIFORM_COPYDST_USAGE>,
}
impl Camera {
    pub fn new(externref: Resource<JSCamera>, label: String) -> Self {
        unsafe {
            let gpu = ENGINE.physic_engine().gpu.as_ref().unwrap();
            Camera {
                view: [
                    [0.0, 0.0, 0.0, 0.0],
                    [0.0, 0.0, 0.0, 0.0],
                    [0.0, 0.0, 0.0, 0.0],
                    [0.0, 0.0, 0.0, 1.0],
                ],
                projection: Rc::clone(&gpu.projection),
                projection_view: [[0.0; 4]; 4],
                projection_view_inverted: [[0.0; 4]; 4],
                position: [0.0; 3],
                direction: [1.0, 0.0, 0.0],
                externref,
                updated: false,
                label,
                children: Vec::new(),
                do_update_view: 0,
                id: NEXT_CAMERA_ID.fetch_add(1, Ordering::Relaxed),
                before_view_update: None,
                projection_view_inverted_is_dirty: false,
                buffer: GPUBuffer::new(
                    &gpu.device,
                    UNIFORM_BUFFER_SIZE,
                    String::from("camerauniformBuffer"),
                    false,
                ),
            }
        }
    }
    pub fn new_water(externref: Resource<JSCamera>, label: String) -> Self {
        unsafe {
            let gpu = ENGINE.physic_engine().gpu.as_ref().unwrap();

            Camera {
                view: [
                    [0.0, 0.0, 0.0, 0.0],
                    [0.0, 0.0, 0.0, 0.0],
                    [0.0, 0.0, 0.0, 0.0],
                    [0.0, 0.0, 0.0, 1.0],
                ],
                projection_view: [[0.0; 4]; 4],
                projection_view_inverted: [[0.0; 4]; 4],
                projection: Rc::clone(&gpu.projection),
                position: [0.0; 3],
                direction: [1.0, 0.0, 0.0],
                externref,
                updated: false,
                label,
                children: Vec::new(),
                do_update_view: 0,
                id: NEXT_CAMERA_ID.fetch_add(1, Ordering::Relaxed),
                before_view_update: Some(Box::new(|direction, position| {
                    position[1] -= (position[1] - 3.0) * 2.0;
                    direction[1] = -direction[1];
                })),
                projection_view_inverted_is_dirty: false,
                buffer: GPUBuffer::new(
                    &gpu.device,
                    UNIFORM_BUFFER_SIZE,
                    String::from("camerauniformBuffer"),
                    false,
                ),
            }
        }
    }
    fn on_update_position(&self) {
        #[cfg(feature = "webgpu")]
        #[cfg(any(not(test), rust_analyzer))]
        unsafe {
            on_update_position(&self.externref);
        }
    }
    pub fn update_position(&mut self, position: [f32; 3]) {
        if position[0] != self.position[0]
            || position[1] != self.position[1]
            || position[2] != self.position[2]
        {
            self.position = position;
            self.do_update_view |= VIEW_UPDATED_POSITION;
        }
    }
    pub fn update_direction(&mut self, direction: [f32; 3]) {
        if direction[0] != self.direction[0]
            || direction[1] != self.direction[1]
            || direction[2] != self.direction[2]
        {
            self.direction = direction;
            self.do_update_view |= VIEW_UPDATED_DIRECTION;
        }
    }
    /**
     * Update camera view
     * @param commandEncoder GPUCommandEncoder
     * @returns boolean indicating if view was actually changed
     */
    pub fn update_view<'c>(
        &mut self,
        device: &Resource<JSDevice>,
        command_encoder: &GPUCommandEncoder,
    ) -> bool {
        if self.do_update_view != 0 {
            if let Some(before_view_update) = &self.before_view_update {
                self.do_update_view |= VIEW_UPDATED_POSITION & VIEW_UPDATED_DIRECTION;
                before_view_update(&mut self.direction, &mut self.position);
            }
            if (self.do_update_view & VIEW_UPDATED_POSITION) == VIEW_UPDATED_POSITION {
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
            //Camera direction
            self.view[0][2] = self.direction[0];
            self.view[1][2] = self.direction[1];
            self.view[2][2] = self.direction[2];

            self.view[0][0] = self.view[2][2];
            self.view[2][0] = -self.view[0][2];

            let x_square_length =
                self.view[0][0] * self.view[0][0] + self.view[2][0] * self.view[2][0];
            if x_square_length == 0.0 {
                self.view[0][0] = 1.0;
            } else {
                let len = x_square_length.sqrt();
                if !(len == 0.0 || len == 1.0) {
                    let scale = 1.0 / len;
                    self.view[0][0] *= scale;
                    self.view[2][0] *= scale;
                }
            }
            // Y axis
            self.view[0][1] = self.view[1][2] * self.view[2][0];
            self.view[1][1] = self.view[2][2] * self.view[0][0] - self.view[0][2] * self.view[2][0];
            self.view[2][1] = -(self.view[1][2] * self.view[0][0]);
            // Eye angles, dot products

            //x
            self.view[3][0] =
                -(self.view[0][0] * self.position[0] + self.view[2][0] * self.position[2]);
            //y
            self.view[3][1] = -(self.view[0][1] * self.position[0]
                + self.view[1][1] * self.position[1]
                + self.view[2][1] * self.position[2]);
            //z
            self.view[3][2] = -(self.view[0][2] * self.position[0]
                + self.view[1][2] * self.position[1]
                + self.view[2][2] * self.position[2]);

            self.view.multiply(
                &self
                    .projection
                    .borrow()
                    .inner_projection
                    .projection_reversed_z,
                &mut self.projection_view,
            );

            self.projection_view_inverted_is_dirty = true;
            let buffer = GPUBuffer::<COPYSRC_USAGE>::new_mapped(
                device,
                128,
                String::from("camera_tempBuffer"),
                false,
            );
            buffer.set_mapped_range(self.projection_view.as_ptr() as usize, 128, 0, 128);
            let mut unmapped = buffer.unmap();
            self.buffer
                .copy_from(command_encoder, &mut unmapped, 0, 0, 128);
            TEMP_GPU_BUFFERS.lock().unwrap().push(unmapped.externref);
            self.do_update_view = 0;
            self.updated = true;
        } else {
            self.updated = false;
        }
        let mut me_or_some_child_updated = self.updated;
        for child_camera in self.children.iter_mut() {
            if child_camera.update_view(device, command_encoder) {
                me_or_some_child_updated = true;
            }
        }
        return me_or_some_child_updated;
    }
    pub fn update_camera(&self, force: bool, lights_pass: &ComputePassEncoder) {
        if force || self.updated {
            lights_pass.set_bindgroup(1, &self.get_update_view_bindgroup());
            lights_pass.dispatch_workgroups(
                CLUSTER_DISPATCH_SIZE[0],
                CLUSTER_DISPATCH_SIZE[1],
                CLUSTER_DISPATCH_SIZE[2],
            );
        }
        for child in self.children.iter() {
            child.update_camera(force, lights_pass);
        }
    }
    #[cfg(feature = "webgpu")]
    #[cfg(any(not(test), rust_analyzer))]
    pub fn get_update_view_bindgroup(&self) -> Resource<JSBindGroup> {
        unsafe { get_update_view_bindgroup(&self.externref) }
    }
    #[cfg(test)]
    pub fn get_update_view_bindgroup(&self) -> Resource<JSBindGroup> {
        use externref::ExternRef;
        unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)) }
    }
}
#[cfg(test)]
#[test]
fn test_child_camera() {
    use externref::ExternRef;
    unsafe {
        let mut camera = Camera::new(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            String::from("test"),
        );
        let child_1 = Camera::new(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            String::from("camera1.0"),
        );
        camera.children.push(child_1);
        camera.update_position([1.0, 2.0, 3.0]);
        let mut command_encoder = GPUCommandEncoder::new(String::from("test"));
        camera.update_view(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            &mut command_encoder,
        );
        assert_eq!(camera.children[0].position, [1.0, 2.0, 3.0]);
    }
}

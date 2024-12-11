use std::{
    slice::Iter,
    sync::atomic::{AtomicU32, Ordering},
};

use externref::{externref, Resource};
use terramath::MatrixMath;

use crate::{
    gpu::{
        command_encoder::{GPUCommandEncoder, JSCommandEncoder},
        compute_pass_encoder::{ComputePassEncoder, JSBindGroup},
    },
    mesh::ENGINE,
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
pub unsafe extern "C" fn set_do_update_view(camera_id: u32, value: u32) {
    ENGINE
        .physic_engine_mut()
        .cameras
        .get_camera_by_id_mut(camera_id)
        .do_update_view = value;
}
#[no_mangle]
pub unsafe extern "C" fn get_do_update_view(camera_id: u32) -> u32 {
    ENGINE
        .physic_engine()
        .cameras
        .get_camera_by_id(camera_id)
        .do_update_view
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
#[externref]
#[no_mangle]
pub unsafe extern "C" fn iterate_child_camera(
    iterator_ptr: *mut std::slice::Iter<'_, Camera>,
) -> Option<&Resource<JSCamera>> {
    let next = (*iterator_ptr).next();
    if next.is_none() {
        drop(Box::from_raw(iterator_ptr));
        return None;
    }
    return Some(&next.unwrap().externref);
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
pub struct JSCamera(());
static NEXT_CAMERA_ID: AtomicU32 = AtomicU32::new(0);

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "camera")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn update_view(
        externref: &Resource<JSCamera>,
        command_encoder: &Resource<JSCommandEncoder>,
        child_iterator: *mut Iter<'_, Camera>,
        direction_ptr: *const f32,
        position_ptr: *const f32,
        do_update_view: u32,
    );
    pub fn get_update_view_bindgroup(externref: &Resource<JSCamera>) -> Resource<JSBindGroup>;
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
pub struct Camera {
    view: [[f32; 4]; 4],
    projection: [[f32; 4]; 4],
    direction: [f32; 3],
    position: [f32; 3],
    pub externref: Resource<JSCamera>,
    pub updated: bool,
    pub label: String,
    pub children: Vec<Camera>,
    do_update_view: u32,
    pub id: u32,
    pub before_view_update: Option<Box<dyn Fn(&mut [f32; 3], &mut [f32; 3])>>,
}
impl Camera {
    pub fn new(externref: Resource<JSCamera>, label: String) -> Self {
        Camera {
            view: MatrixMath::new(),
            projection: MatrixMath::new(),
            position: [0.0; 3],
            direction: [1.0, 0.0, 0.0],
            externref,
            updated: false,
            label,
            children: Vec::new(),
            do_update_view: 0,
            id: NEXT_CAMERA_ID.fetch_add(1, Ordering::Relaxed),
            before_view_update: None,
        }
    }
    pub fn new_water(externref: Resource<JSCamera>, label: String) -> Self {
        Camera {
            view: MatrixMath::new(),
            projection: MatrixMath::new(),
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
        }
    }
    pub fn update_view(&mut self, command_encoder: &GPUCommandEncoder) -> bool {
        if self.do_update_view != 0 {
            #[cfg(feature = "webgpu")]
            #[cfg(any(not(test), rust_analyzer))]
            unsafe {
                if let Some(before_view_update) = &self.before_view_update {
                    self.do_update_view |= VIEW_UPDATED_POSITION & VIEW_UPDATED_DIRECTION;
                    before_view_update(&mut self.direction, &mut self.position);
                }
                let child_iterator = Box::into_raw(Box::new(self.children.iter()));
                update_view(
                    &self.externref,
                    &command_encoder.externref,
                    child_iterator,
                    self.direction.as_ptr(),
                    self.position.as_ptr(),
                    self.do_update_view,
                );
            }
            self.do_update_view = 0;
            self.updated = true;
        } else {
            self.updated = false;
        }
        let mut me_or_some_child_updated = self.updated;
        for child_camera in self.children.iter_mut() {
            if child_camera.update_view(command_encoder) {
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

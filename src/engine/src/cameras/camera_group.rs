use std::{cell::RefCell, num::NonZeroU32, rc::Rc, sync::Arc};

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeList;
use externref::Resource;
use webgpu::{
    bindgroup::bindgroup::BindGroup, binding_commands::BindingCommands, buffer::buffer::GPUBuffer,
    compute_pass_encoder::ComputePassEncoder, device::JSDevice,
};

use crate::{cameras::camera::get_camera_by_id, projection::TILE_COUNT};

use super::camera::{Camera, CLUSTER_DISPATCH_SIZE};

pub struct CameraGroup {
    pub cameras: Vec<usize>,
    pub bind_group: Option<Arc<BindGroup<1>>>,
}
impl CameraGroup {
    pub fn update_size_bind_group(
        &mut self,
        device: &Resource<JSDevice>,
        width: NonZeroU32,
        height: NonZeroU32,
        cameras: &ExplicitGenerationalFreeList<Camera>,
        computepass: &mut ComputePassEncoder,
    ) {
        let screen_dimension_buffer =
            GPUBuffer::<false, false, false, false, false, false, true>::new_mapped(
                device,
                16,
                String::from("screen_buffer"),
            );
        let data = [
            width.get() as f32,
            height.get() as f32,
            width.get() as f32 / TILE_COUNT[0],
            height.get() as f32 / TILE_COUNT[1],
        ];
        screen_dimension_buffer.set_mapped_range(&data, 0);
        let bindgroup = self.bind_group.as_ref().unwrap();
        {
            let mut b = bindgroup.bufferbindings[0].borrow_mut();
            b.replace_buffer(Rc::new(RefCell::new(screen_dimension_buffer.unmap())));
        }
        (*computepass).set_bindgroup(&device, 0, bindgroup, &[]);
        for camera_id in &self.cameras {
            let camera = get_camera_by_id(cameras, *camera_id);
            computepass.set_bindgroup(device, 1, &camera.update_clusters_bind_group, &[]);
            computepass.dispatch_workgroups(
                CLUSTER_DISPATCH_SIZE[0],
                CLUSTER_DISPATCH_SIZE[1],
                CLUSTER_DISPATCH_SIZE[2],
            );
        }
    }
}

use std::{
    cell::RefCell,
    num::{NonZeroU32, NonZeroUsize},
    rc::Rc,
};

use externref::Resource;
use webgpu::{
    bindgroup::{bindgroup::BindGroup, bufferbinding::BufferBinding},
    binding_commands::BindingCommands,
    buffer::buffer::GPUBuffer,
    compute_pass_encoder::ComputePassEncoder,
    device::JSDevice,
    weakvec::WeakVec,
};

use crate::{cameras::camera::Camera, projection::TILE_COUNT};

use super::camera::CLUSTER_DISPATCH_SIZE;

pub struct CameraGroup {
    pub cameras: WeakVec<Camera>,
    pub bind_group: Option<Rc<BindGroup<1>>>,
    pub bufferbinding: Rc<RefCell<BufferBinding>>,
}
impl CameraGroup {
    pub fn update_size_bind_group(
        &mut self,
        device: &Resource<JSDevice>,
        width: NonZeroU32,
        height: NonZeroU32,
        computepass: &mut ComputePassEncoder,
    ) {
        let screen_dimension_buffer =
            GPUBuffer::<false, false, false, false, false, false, true>::new_mapped(
                device,
                unsafe { NonZeroUsize::new_unchecked(16) },
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
            let mut b = self.bufferbinding.borrow_mut();
            b.replace_buffer(Rc::new(RefCell::new(screen_dimension_buffer.unmap())));
        }
        (*computepass).set_bindgroup(&device, 0, bindgroup, &[]);
        self.cameras.iter_mut(|camera_rc| {
            let camera = camera_rc.camera.borrow();
            computepass.set_bindgroup(device, 1, &camera.update_clusters_bind_group, &[]);
            computepass.dispatch_workgroups(
                CLUSTER_DISPATCH_SIZE[0],
                CLUSTER_DISPATCH_SIZE[1],
                CLUSTER_DISPATCH_SIZE[2],
            );
        });
    }
}

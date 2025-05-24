use externref::{externref, Resource};

use crate::{cameras::camera_group::CameraGroup, mesh::ENGINE};

use super::{
    binding_commands::BindingCommands,
    gpu::JSDevice,
    renderbundle::{JSRenderBundleDescriptor, RenderBundleEncoder},
};

#[externref]
#[no_mangle]
pub unsafe extern "C" fn link_renderpass(
    id: usize,
    renderpass: Resource<JSRenderPass>,
    descriptor: Resource<JSRenderBundleDescriptor>,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> *mut RenderBundleEncoder {
    let mut gpuopt = ENGINE.gpu.lock().unwrap();
    let gpu = gpuopt.as_mut().unwrap();
    gpu.renderpasses[id].jsrenderpass = Some(renderpass);
    gpu.renderpasses[id].bundle = Some(RenderBundleEncoder::new(
        String::from_raw_parts(label_ptr, label_len, label_cap),
        &gpu.device,
        descriptor,
    ));
    gpu.renderpasses[id].bundle.as_mut().unwrap()
}

pub struct JSRenderPassDescriptor(());
pub struct JSRenderPass(());

pub struct Renderpass {
    // TODO: remove option
    pub bundle: Option<RenderBundleEncoder>,
    pub cameragroups: Vec<CameraGroup>,
    // TODO: remove option
    pub jsrenderpass: Option<Resource<JSRenderPass>>,
}
impl Renderpass {
    pub fn recorder(&self, renderbundle: &mut RenderBundleEncoder, device: &Resource<JSDevice>) {
        if self.cameragroups.len() > 0 {
            for camera_group in &self.cameragroups {
                if let Some(bind_group) = &camera_group.bind_group {
                    renderbundle.set_bindgroup(device, 0, bind_group.lock().as_mut().unwrap());
                }
                for camera_id in &camera_group.cameras {
                    let gpuopt = ENGINE.gpu.lock().unwrap();
                    let camera = gpuopt.as_ref().unwrap().get_camera_by_id(*camera_id);
                    renderbundle.set_bindgroup(
                        device,
                        1,
                        &mut camera.uniform_bindgroup.lock().unwrap(),
                    );
                }
            }
        }
    }
}

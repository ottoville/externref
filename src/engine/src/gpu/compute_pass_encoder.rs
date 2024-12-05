use externref::{externref, Resource};

use super::command_encoder::GPUCommandEncoder;

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "computepassencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn set_pipeline(
        computepassencoder: &Resource<JSComputePassEncoder>,
        pipeline: &Resource<JSComputePipeline>,
    );
    fn set_bindgroup(
        computepassencoder: &Resource<JSComputePassEncoder>,
        index: u32,
        bindgroup: &Resource<JSBindGroup>,
    );
    fn dispatch_workgroups(
        computepassencoder: &Resource<JSComputePassEncoder>,
        workgroupCountX: u32,
        workgroupCountY: u32,
        workgroupCountZ: u32,
    );
    fn end(computepassencoder: &Resource<JSComputePassEncoder>);
}
pub struct JSComputePassEncoder(());
pub struct JSComputePipeline(());
pub struct JSBindGroup(());

pub struct ComputePassEncoder {
    pub command_encoder: GPUCommandEncoder,
    pub externref: Resource<JSComputePassEncoder>,
}
impl ComputePassEncoder {
    pub fn set_pipeline(&self, pipeline: &Resource<JSComputePipeline>) {
        #[cfg(feature = "webgpu")]
        unsafe {
            set_pipeline(&self.externref, pipeline);
        }
    }
    pub fn set_bindgroup(&self, index: u32, bindgroup: &Resource<JSBindGroup>) {
        #[cfg(feature = "webgpu")]
        unsafe {
            set_bindgroup(&self.externref, index, bindgroup);
        }
    }
    pub fn dispatch_workgroups(
        &self,
        workgroup_count_x: u32,
        workgroup_count_y: u32,
        workgroup_count_z: u32,
    ) {
        #[cfg(feature = "webgpu")]
        unsafe {
            dispatch_workgroups(
                &self.externref,
                workgroup_count_x,
                workgroup_count_y,
                workgroup_count_z,
            );
        }
    }
    pub fn end(self) -> GPUCommandEncoder{
        #[cfg(feature = "webgpu")]
        unsafe {
            end(&self.externref);
        }
        return self.command_encoder;
    }
}

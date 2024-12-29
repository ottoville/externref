use externref::{externref, Resource};

use super::{
    bindgroup::{BindGroup, JSBindGroup},
    command_encoder::GPUCommandEncoder,
    gpu::JSDevice,
};

#[cfg(test)]
unsafe fn dispatch_workgroups(
    _computepassencoder: &Resource<JSComputePassEncoder>,
    _workgroup_count_x: u32,
    _workgroup_count_y: u32,
    _workgroup_count_z: u32,
) {
}
#[cfg(test)]
unsafe fn set_bindgroup(
    _computepassencoder: &Resource<JSComputePassEncoder>,
    _index: u32,
    _bindgroup: &Resource<JSBindGroup>,
) {
}
#[cfg(test)]
unsafe fn set_pipeline(
    _computepassencoder: &Resource<JSComputePassEncoder>,
    _pipeline: &Resource<JSComputePipeline>,
) {
}
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

pub struct ComputePassEncoder {
    pub command_encoder: GPUCommandEncoder,
    pub externref: Resource<JSComputePassEncoder>,
}
impl ComputePassEncoder {
    pub fn set_pipeline(&self, pipeline: &Resource<JSComputePipeline>) {
        unsafe {
            set_pipeline(&self.externref, pipeline);
        }
    }
    pub fn set_bindgroup(
        &mut self,
        device: &Resource<JSDevice>,
        index: u32,
        bindgroup: &mut BindGroup,
    ) {
        unsafe {
            set_bindgroup(&self.externref, index, bindgroup.get_bind_group(device));
        }
        for rawbuffer in bindgroup.rawbuffers.iter() {
            self.command_encoder.buffers.push(rawbuffer.clone());
        }
    }
    pub fn dispatch_workgroups(
        &self,
        workgroup_count_x: u32,
        workgroup_count_y: u32,
        workgroup_count_z: u32,
    ) {
        unsafe {
            dispatch_workgroups(
                &self.externref,
                workgroup_count_x,
                workgroup_count_y,
                workgroup_count_z,
            );
        }
    }
    pub fn end(self) -> GPUCommandEncoder {
        #[cfg(feature = "webgpu")]
        #[cfg(any(not(test), rust_analyzer))]
        unsafe {
            end(&self.externref);
        }
        return self.command_encoder;
    }
}

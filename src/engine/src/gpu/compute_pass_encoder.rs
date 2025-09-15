use std::sync::Arc;

use externref::{externref, Resource};

use crate::gpu::{
    bindgroup::{bindgroup::BindGroup, bindgroup_resources::BindGroupResources},
    externref_trait::HaveExternref,
};

use super::{binding_commands::BindingCommands, command_encoder::GPUCommandEncoder};

#[cfg(test)]
unsafe fn dispatch_workgroups(
    _computepassencoder: &Resource<JSComputePassEncoder>,
    _workgroup_count_x: u32,
    _workgroup_count_y: u32,
    _workgroup_count_z: u32,
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
impl HaveExternref<JSComputePassEncoder> for ComputePassEncoder {
    fn externref(&self) -> &Resource<JSComputePassEncoder> {
        &self.externref
    }
}
impl BindingCommands<JSComputePassEncoder> for ComputePassEncoder {
    fn after_set_bindgroup<const N: usize>(&mut self, _bindgroup: &BindGroup<N>) {}

    fn bindgroups(&mut self) -> &mut Vec<Arc<BindGroupResources>> {
        &mut self.command_encoder.bindgroups
    }
}
impl ComputePassEncoder {
    pub fn set_pipeline(&self, pipeline: &Resource<JSComputePipeline>) {
        unsafe {
            set_pipeline(&self.externref, pipeline);
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

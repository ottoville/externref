import { BindGroup } from 'webgpu-ts';

export const ComputePassEncoderInterface = {
  dispatch_workgroups(
    commandEncoder: GPUComputePassEncoder,
    workgroup_count_x: number,
    workgroup_count_y: number,
    workgroup_count_z: number,
  ) {
    commandEncoder.dispatchWorkgroups(
      workgroup_count_x,
      workgroup_count_y,
      workgroup_count_z,
    );
  },
  end(commandEncoder: GPUComputePassEncoder) {
    commandEncoder.end();
  },
  set_bindgroup(
    commandEncoder: GPUComputePassEncoder,
    index: number,
    bindgroup: BindGroup,
  ) {
    commandEncoder.setBindGroup(index, bindgroup.bindGroup);
  },
  set_pipeline(
    commandEncoder: GPUComputePassEncoder,
    pipeline: GPUComputePipeline,
  ) {
    commandEncoder.setPipeline(pipeline);
  },
};

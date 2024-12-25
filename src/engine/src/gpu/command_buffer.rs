use std::sync::Arc;

use externref::Resource;

use super::buffer::buffer::JSBuffer;

pub struct JSCommandBuffer(());

pub struct CommandBuffer {
    pub externref: Resource<JSCommandBuffer>,
    // Hold references to prevent buffer being CG't before command encoder has been executed
    pub buffers: Vec<Arc<Resource<JSBuffer>>>,
}

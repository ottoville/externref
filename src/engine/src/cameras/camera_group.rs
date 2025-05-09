use std::sync::{Arc};

use crate::gpu::bindgroup::BindGroup;

pub struct CameraGroup {
    pub cameras: Vec<usize>,
    pub bind_group: Option<Arc<BindGroup>>,
}

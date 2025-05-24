use std::sync::{Arc, Mutex};

use crate::{gpu::bindgroup::BindGroup};


pub struct CameraGroup {
    pub cameras: Vec<usize>,
    pub bind_group: Option<Arc<Mutex<BindGroup>>>
}

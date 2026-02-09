use std::sync::atomic::AtomicU32;

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;
use webgpu::buffer::buffer::GPUBuffer;

use crate::{
    gpu::gpu::GPU,
    mesh::{Mesh, ENGINE},
};
static ID: AtomicU32 = AtomicU32::new(0);
#[no_mangle]
pub unsafe extern "C" fn create_plants_vertices(
    gpu_ptr: *mut GPU,
) -> *mut GPUBuffer<false, false, false, false, false, true> {
    let vertices = vec![
        0.02, 0.0, -0.02, 0.0, 0.014, 0.29, -0.014, 0.29, 0.007, 0.57, -0.007, 0.57, 0.0, 1.0,
    ];
    Box::into_raw(Box::new(GPUBuffer::from((
        &(*gpu_ptr).device.externref,
        &vertices[..],
    ))))
}

#[no_mangle]
pub unsafe extern "C" fn create_plants_mesh() -> *mut ExplicitGenerationalFreeListIndex<fn() -> Mesh>
{
    let mut label = String::from("Plants");
    label.push_str(
        &ID.fetch_add(1, std::sync::atomic::Ordering::Release)
            .to_string(),
    );
    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id = Mesh::new(0.0, 0.0, 1.0, 0, label, None, None, &mut meshes, false);
    Box::into_raw(Box::new(mesh_id))
}

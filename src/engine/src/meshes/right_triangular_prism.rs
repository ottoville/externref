use std::sync::atomic::AtomicU32;

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;
use externref::Resource;
use terramath::Vec3wgslF32;
use webgpu::device::JSDevice;

use crate::{
    gpu::gpu::GPU,
    mesh::{Mesh, ENGINE},
    vertices::{PositionAndNormal, VertexKind},
    Geometry,
};
static ID: AtomicU32 = AtomicU32::new(0);

pub fn create_rtp_vertices() -> Vec<PositionAndNormal> {
    vec![
        // Left face
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([-1.0, 0.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([-1.0, 0.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([-1.0, 0.0, 0.0]),
        },
        // Right face
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([1.0, 0.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([1.0, 0.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([1.0, 0.0, 0.0]),
        },
        // Bottom face
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([0.0, -1.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([0.0, -1.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([0.0, -1.0, 0.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([0.0, -1.0, 0.0]),
        },
        // Top face
        PositionAndNormal {
            position: Vec3wgslF32([1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 0.7071067811865475, 0.7071067811865475]), // 1/Math.hypot(-1,1)
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([0.0, 0.7071067811865475, 0.7071067811865475]), // 1/Math.hypot(-1,1)
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, 1.0]),
            normal: Vec3wgslF32([0.0, 0.7071067811865475, 0.7071067811865475]), // 1/Math.hypot(-1,1)
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 0.7071067811865475, 0.7071067811865475]), // 1/Math.hypot(-1,1)
        },
        // Back face
        PositionAndNormal {
            position: Vec3wgslF32([1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 0.0, -1.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 0.0, -1.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, 1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 0.0, -1.0]),
        },
        PositionAndNormal {
            position: Vec3wgslF32([-1.0, -1.0, -1.0]),
            normal: Vec3wgslF32([0.0, 0.0, -1.0]),
        },
    ]
}
// 0, 1, 2,     3, 4, 5
pub const RTP_INDICES: [usize; 24] = [
    0, 1, 2, // front
    3, 4, 5, // back
    6, 7, 8, 6, 8, 9, // top
    10, 11, 12, 10, 12, 13, // bottom
    14, 15, 16, 14, 16, 17, // right
];
#[no_mangle]
pub unsafe extern "C" fn create_rtp_mesh(
    point_light: f32,
    directional_light: f32,
    scenes: f32,
    rigid_body: u32,
    camera_can_collide_to: bool,
    gpu: *mut GPU,
) -> *mut ExplicitGenerationalFreeListIndex<Mesh> {
    let mut label = String::from("TriangularPrism");
    label.push_str(
        &ID.fetch_add(1, std::sync::atomic::Ordering::Release)
            .to_string(),
    );
    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id: ExplicitGenerationalFreeListIndex<Mesh> = Mesh::new(
        point_light,
        directional_light,
        scenes,
        rigid_body,
        label,
        None,
        None,
        &mut meshes,
        camera_can_collide_to,
    );
    let geometry = create_rtp_geometry(&(*gpu).device);
    let mesh = &mut meshes[&mesh_id];
    mesh.geometry = Some(Box::new(geometry));
    Box::into_raw(Box::new(mesh_id))
}
pub fn create_rtp_geometry(device: &Resource<JSDevice>) -> Geometry {
    let mut geometry = Geometry::new(true, false, false, "rtp_geometry".to_string());
    geometry.set_indices(RTP_INDICES.to_vec(), device);
    geometry.set_vertices(VertexKind::PositionAndNormal(create_rtp_vertices()));
    return geometry;
}

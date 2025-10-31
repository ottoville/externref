use std::sync::atomic::AtomicU32;

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;

use crate::{
    mesh::{Mesh, ENGINE},
    vertices::{Position2DAndUV, VertexKind},
    Geometry,
};

static UI_ID: AtomicU32 = AtomicU32::new(0);
#[no_mangle]
pub unsafe extern "C" fn create_ui_mesh(
    position_count: usize,
) -> *mut ExplicitGenerationalFreeListIndex<fn() -> Mesh> {
    // TODO: prepend actual ui element label
    let mut label = String::from("UIRectangle");
    label.push_str(
        &UI_ID
            .fetch_add(1, std::sync::atomic::Ordering::Release)
            .to_string(),
    );

    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id = Mesh::new(0.0, 0.0, 1.0, 0, label, None, None, &mut meshes, false);
    let geometry = create_ui_geometry(position_count);
    let mesh = &mut meshes[&mesh_id];
    mesh.geometry = Some(Box::new(geometry));
    Box::into_raw(Box::new(mesh_id))
}

pub fn create_ui_geometry(position_count: usize) -> Geometry {
    let mut geometry = Geometry::new(false, false, false, "UI".to_string());

    let mut vertices: Vec<Position2DAndUV> = Vec::with_capacity(position_count);
    unsafe { vertices.set_len(position_count) };
    geometry.set_vertices(VertexKind::Position2DAndUV(vertices));
    return geometry;
}
/*
pub struct UIRectangle {
    pub texture_bindgroup: Rc<BindGroup<1>>,
}
*/

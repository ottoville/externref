use crate::mesh::{get_mesh_by_id_mut};

pub struct DrawableDirect {
    instance_count: u32,
    first_instance: u32,
}

#[no_mangle]
pub extern "C" fn add_drawble(mesh_id: usize) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    let d = DrawCommand {
        draw_type: DrawType::Indexed,
        direct: Option::None,
        vertex_count: 0,
        first_vertex: 0,
        index_count: 0,
        first_index: 0,
        base_vertex: 0,
    };
    mesh.draw_command = Some(d);
}
#[no_mangle]
pub extern "C" fn set_drawble_direct(mesh_id: usize, instance_count: u32, first_instance: u32) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    match mesh.draw_command {
        Some(ref mut draw_command) => {
            draw_command.direct = Some(DrawableDirect { instance_count, first_instance });
        },
        None => {
            panic!("Mesh have no draw_command");
        }
    }
}

#[derive(Copy, Clone)]
pub enum DrawType {
    Simple = 1,
    Indexed = 2,
    Indirect = 3,
    IndexedIndirect = 4,
}
pub struct DrawCommand {
    pub draw_type: DrawType,
    pub direct: Option<DrawableDirect>,
    pub vertex_count: u32,
    pub first_vertex: u32,
    pub index_count: u32,
    pub first_index: u32,
    pub base_vertex: i32,
}
pub trait DrawableTrait {
    fn draw(&self) -> DrawCommand;
}

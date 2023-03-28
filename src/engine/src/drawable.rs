use crate::{mesh::{get_mesh_by_id_mut, get_mesh_by_id}, engine::{js_log, js_warn}};

pub struct DrawableDirect {
    instance_count: u32,
    first_instance: u32,
}
#[no_mangle]
pub extern "C" fn get_instance_count(mesh_id: usize) -> u32 {
    let mesh = get_mesh_by_id(mesh_id);
    mesh.draw_command.as_ref().unwrap().direct.as_ref().unwrap().instance_count
}
#[no_mangle]
pub extern "C" fn get_first_instance(mesh_id: usize) -> u32 {
    let mesh = get_mesh_by_id(mesh_id);
    mesh.draw_command.as_ref().unwrap().direct.as_ref().unwrap().first_instance
}
#[no_mangle]
pub extern "C" fn set_instance_count(mesh_id: usize, instance_count: u32) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    match mesh.draw_command {
        Some(ref mut draw_command) => {
            match&mut (draw_command.direct) {
                Some(direct) => {
                    direct.instance_count = instance_count
                },
                None => {
                    panic!("Mesh is not direct drawable");
                }
            }
        },
        None => {
            panic!("Mesh have no draw_command");
        }
    }
}
#[no_mangle]
pub extern "C" fn set_first_instance(mesh_id: usize, first_instance: u32) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    match mesh.draw_command {
        Some(ref mut draw_command) => {
            match&mut (draw_command.direct) {
                Some(direct) => {
                    direct.first_instance = first_instance
                },
                None => {
                    panic!("Mesh is not direct drawable");
                }
            }
        },
        None => {
            panic!("Mesh have no draw_command");
        }
    }
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
    if instance_count == 0 {
        js_warn(vec!["Added drawable with 0 instances, nothing will be drawn".to_string()])
    }
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

#[derive(Copy, Clone)]
pub enum DrawType {
    Simple=1,
    Indexed=2,
    Indirect=3,
    IndexedIndirect=4
}
pub struct DrawCommand {
    pub draw_type: DrawType,
    pub vertex_count: u32,
    pub instance_count: u32,
    pub first_vertex: u32,
    pub first_instance: u32,
    pub index_count: u32,
    pub first_index: u32,
    pub base_vertex: i32
}
pub trait Drawable {
    fn draw(&self) -> DrawCommand;
}
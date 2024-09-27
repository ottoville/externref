use crate::{
    vertices::{Position, VertexKind},
    Geometry,
};

#[no_mangle]
pub unsafe extern "C" fn create_water_geometry() -> *mut Geometry {
    let vertices: Vec<Position> = vec![
        Position::new([-50000.0, 3.0, -50000.0]),
        Position::new([50000.0, 3.0, -50000.0]),
        Position::new([-50000.0, 3.0, 50000.0]),
        Position::new([50000.0, 3.0, 50000.0]),
    ];
    let mut geometry = Box::new(Geometry::new(
        false,
        false,
        false,
        true,
        "water".to_string(),
    ));
    geometry.set_vertices(VertexKind::Position(vertices));
    Box::into_raw(geometry)
}

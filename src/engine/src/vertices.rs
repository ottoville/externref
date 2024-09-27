use crate::math2::{Vec2wgslF32, Vec3wgslF32};

#[repr(C, align(16))]
pub struct Position(pub Vec3wgslF32);
impl Position {
    pub fn new(vec: [f32; 3]) -> Position {
        Position(Vec3wgslF32(vec))
    }
}
#[derive(Debug, Copy, Clone)]
#[repr(C, align(16))]
pub struct PositionAndNormal {
    pub position: Vec3wgslF32,
    pub normal: Vec3wgslF32,
}
impl PositionAndNormal {
    pub fn new() -> PositionAndNormal {
        PositionAndNormal {
            position: Vec3wgslF32::new_zero(),
            normal: Vec3wgslF32::new_zero(),
        }
    }
}
#[repr(C, align(16))]
pub struct PositionAndNormalAndUV {
    pub position: Vec3wgslF32,
    pub normal: Vec3wgslF32,
    pub uv: Vec2wgslF32,
}
#[repr(C, align(8))]
pub struct Position2DAndUV {
    pub position: Vec2wgslF32,
    pub uv: Vec2wgslF32,
}
#[repr(C, align(16))]
pub struct PositionAndNormalAndColor {
    pub position: Vec3wgslF32,
    pub normal: Vec3wgslF32,
    pub color: Vec3wgslF32,
}
pub enum VertexKind {
    None,
    PositionAndNormalAndUV(Vec<PositionAndNormalAndUV>),
    PositionAndNormalAndColor(Vec<PositionAndNormalAndColor>),
    PositionAndNormal(Vec<PositionAndNormal>),
    Position2DAndUV(Vec<Position2DAndUV>),
    Position(Vec<Position>),
}

impl VertexKind {
    pub fn get_positions(&self) -> Box<dyn Iterator<Item = &Vec3wgslF32> + '_> {
        match &self {
            VertexKind::PositionAndNormalAndUV(vector) => {
                Box::new(vector.iter().map(|v| &v.position))
            }
            VertexKind::PositionAndNormalAndColor(vector) => {
                Box::new(vector.iter().map(|v| &v.position))
            }
            VertexKind::PositionAndNormal(vector) => Box::new(vector.iter().map(|v| &v.position)),
            VertexKind::Position2DAndUV(_) => {
                todo!()
            }
            VertexKind::Position(vector) => Box::new(vector.iter().map(|v| &v.0)),
            VertexKind::None => todo!(),
        }
    }
    pub fn vertices_stride(&self) -> usize {
        match &self {
            VertexKind::PositionAndNormalAndUV(_) => std::mem::size_of::<PositionAndNormalAndUV>(),
            VertexKind::PositionAndNormalAndColor(_) => {
                std::mem::size_of::<PositionAndNormalAndColor>()
            }
            VertexKind::PositionAndNormal(_) => std::mem::size_of::<PositionAndNormal>(),
            VertexKind::Position2DAndUV(_) => std::mem::size_of::<Position2DAndUV>(),
            VertexKind::Position(_) => std::mem::size_of::<Position>(),
            VertexKind::None => todo!(),
        }
    }
    pub fn get_positions_mut(&mut self) -> Box<dyn Iterator<Item = &mut Vec3wgslF32> + '_> {
        match self {
            VertexKind::PositionAndNormalAndUV(vector) => {
                Box::new(vector.iter_mut().map(|v| &mut v.position))
            }
            VertexKind::PositionAndNormalAndColor(vector) => {
                Box::new(vector.iter_mut().map(|v| &mut v.position))
            }
            VertexKind::PositionAndNormal(vector) => {
                Box::new(vector.iter_mut().map(|v| &mut v.position))
            }
            VertexKind::Position2DAndUV(_) => {
                todo!()
            }
            VertexKind::Position(vector) => Box::new(vector.iter_mut().map(|v| &mut v.0)),
            VertexKind::None => todo!(),
        }
    }

    pub fn have_vertices(&self) -> bool {
        match self {
            VertexKind::None => false,
            _ => true,
        }
    }
    pub fn length(&self) -> usize {
        return match &self {
            VertexKind::PositionAndNormalAndUV(vector) => vector.len(),
            VertexKind::PositionAndNormalAndColor(vector) => vector.len(),
            VertexKind::PositionAndNormal(vector) => vector.len(),
            VertexKind::Position2DAndUV(vector) => vector.len(),
            VertexKind::Position(vector) => vector.len(),
            VertexKind::None => 0,
        };
    }
}

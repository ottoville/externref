use terramath::Vec3wgslF32;

use crate::math2::Vec2wgslF32;

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
            position: Vec3wgslF32([0.0; 3]),
            normal: Vec3wgslF32([0.0; 3]),
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
    PositionAndNormalAndUV(Vec<PositionAndNormalAndUV>),
    PositionAndNormalAndColor(Vec<PositionAndNormalAndColor>),
    PositionAndNormal(Vec<PositionAndNormal>),
    Position2DAndUV(Vec<Position2DAndUV>),
    Position(Vec<Position>),
}

impl VertexKind {
    pub fn get_position(&self, index: usize) -> &Vec3wgslF32 {
        match self {
            VertexKind::PositionAndNormalAndUV(vector) => &vector[index].position,
            VertexKind::PositionAndNormalAndColor(vector) => &vector[index].position,
            VertexKind::PositionAndNormal(vector) => &vector[index].position,
            VertexKind::Position2DAndUV(_) => {
                todo!()
            }
            VertexKind::Position(vector) => &vector[index].0,
        }
    }
    pub fn get_position_mut(&mut self, index: usize) -> &mut Vec3wgslF32 {
        match self {
            VertexKind::PositionAndNormalAndUV(vector) => &mut vector[index].position,
            VertexKind::PositionAndNormalAndColor(vector) => &mut vector[index].position,
            VertexKind::PositionAndNormal(vector) => &mut vector[index].position,
            VertexKind::Position2DAndUV(_) => {
                todo!()
            }
            VertexKind::Position(vector) => &mut vector[index].0,
        }
    }
    pub fn get_normal_mut(&mut self, index: usize) -> &mut Vec3wgslF32 {
        match self {
            VertexKind::PositionAndNormalAndUV(vector) => &mut vector[index].normal,
            VertexKind::PositionAndNormalAndColor(vector) => &mut vector[index].normal,
            VertexKind::PositionAndNormal(vector) => &mut vector[index].normal,
            VertexKind::Position2DAndUV(_) => {
                todo!()
            }
            VertexKind::Position(_vector) => todo!(),
        }
    }
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
        }
    }
    pub fn get_normals_mut(&mut self) -> Box<dyn Iterator<Item = &mut Vec3wgslF32> + '_> {
        match self {
            VertexKind::PositionAndNormalAndUV(vector) => {
                Box::new(vector.iter_mut().map(|v| &mut v.normal))
            }
            VertexKind::PositionAndNormalAndColor(vector) => {
                Box::new(vector.iter_mut().map(|v| &mut v.normal))
            }
            VertexKind::PositionAndNormal(vector) => {
                Box::new(vector.iter_mut().map(|v| &mut v.normal))
            }
            VertexKind::Position2DAndUV(_) => {
                todo!()
            }
            VertexKind::Position(vector) => Box::new(vector.iter_mut().map(|v| &mut v.0)),
        }
    }
    pub fn length(&self) -> usize {
        return match &self {
            VertexKind::PositionAndNormalAndUV(vector) => vector.len(),
            VertexKind::PositionAndNormalAndColor(vector) => vector.len(),
            VertexKind::PositionAndNormal(vector) => vector.len(),
            VertexKind::Position2DAndUV(vector) => vector.len(),
            VertexKind::Position(vector) => vector.len(),
        };
    }
}

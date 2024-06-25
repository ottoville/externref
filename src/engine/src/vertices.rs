use crate::math2::{Vec2F32, Vec3wgslF32};

#[repr(C, align(16))]
pub struct Position {
    pub position: Vec3wgslF32,
}
#[repr(C, align(16))]
pub struct PositionAndNormal {
    pub position: Vec3wgslF32,
    pub normal: Vec3wgslF32,
}
#[repr(C, align(16))]
pub struct PositionAndNormalAndUV {
    pub position: Vec3wgslF32,
    pub normal: Vec3wgslF32,
    pub uv: Vec2F32
}
#[repr(C, align(16))]
pub struct PositionAndNormalAndColor {
    pub position: Vec3wgslF32,
    pub normal: Vec3wgslF32,
    pub color: Vec3wgslF32
}
pub enum VertexKind {
    None,
    PositionAndNormalAndUV(Vec<PositionAndNormalAndUV>),
    PositionAndNormalAndColor(Vec<PositionAndNormalAndColor>),
    PositionAndNormal(Vec<PositionAndNormal>),
    Position(Vec<Position>),
    F32(Vec<f32>)
}
pub struct Vertices<T> {
    pub vertices: T,
    /**
     * stride as DWORD in vertices vec.
     */
    pub vertices_stride: usize,
}

impl Vertices<VertexKind> {
    pub fn get_positions(&self) -> Box<dyn Iterator<Item =&Vec3wgslF32> + '_> {
        match &self.vertices {
            VertexKind::PositionAndNormalAndUV(vector) => {
                Box::new(vector.iter().map(|v| { &v.position}))
            },
            VertexKind::PositionAndNormalAndColor(vector) => {
                Box::new(vector.iter().map(|v| { &v.position}))
            },
            VertexKind::PositionAndNormal(vector) => {
                Box::new(vector.iter().map(|v| { &v.position}))
            },
            VertexKind::Position(vector) => {
                Box::new(vector.iter().map(|v| { &v.position}))
            },
            VertexKind::F32(vector) => {
                Box::new(vector.chunks_exact(self.vertices_stride).map(|v| unsafe {
                    &(*(v.as_ptr() as *const Vec3wgslF32))
                }))
            },
            VertexKind::None => todo!(),
        }
    }
    pub fn get_positions_mut(&mut self) -> Box<dyn Iterator<Item = &mut Vec3wgslF32>+ '_> {
        match &mut self.vertices {
            VertexKind::PositionAndNormalAndUV(vector) => {
                Box::new(vector.iter_mut().map(|v| { &mut v.position}))
            },
            VertexKind::PositionAndNormalAndColor(vector) => {
                Box::new(vector.iter_mut().map(|v| { &mut v.position}))
            },
            VertexKind::PositionAndNormal(vector) => {
                Box::new(vector.iter_mut().map(|v| { &mut v.position}))
            },
            VertexKind::Position(vector) => {
                Box::new(vector.iter_mut().map(|v| { &mut v.position}))
            },
            VertexKind::F32(vector) => {
                Box::new(vector.chunks_exact_mut(self.vertices_stride).map(|v| unsafe {
                    &mut (*(v.as_mut_ptr() as *mut Vec3wgslF32))
                }))
            },
            VertexKind::None => todo!(),
        }
    }

    pub fn have_vertices(&self) -> bool {
        match self.vertices {
            VertexKind::None => false,
            _ => true
        }
    }
    pub fn length(&self) -> usize {
        return match &self.vertices {
            VertexKind::PositionAndNormalAndUV(vector) => {
                vector.len()
            },
            VertexKind::PositionAndNormalAndColor(vector) => {
                vector.len()
            },
            VertexKind::PositionAndNormal(vector) => {
                vector.len()
            },
            VertexKind::Position(vector) => {
                vector.len()
            },
            VertexKind::F32(vector) => {
                vector.len()/self.vertices_stride
            },
            VertexKind::None => 0,
        }
    }
}
